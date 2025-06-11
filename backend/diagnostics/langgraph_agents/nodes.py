from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama
from .state import DiagnosticState, QuestionSchema, PredictionSchema
from .tools import create_medical_tools
import json
from .activity_tracker import AgentActivityTracker
import os
from datetime import datetime
from langsmith.run_helpers import traceable

class MedicalAgentNodes:
    def __init__(self, vector_db, gemini_api_key: str):
        self.vector_db = vector_db
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.7,
            google_api_key=gemini_api_key
        )
        self.tools = create_medical_tools(vector_db)
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        self.activity_tracker = AgentActivityTracker()
        
    
    @traceable(name="orchestrator_agent")
    def orchestrator_node(self, state: DiagnosticState) -> DiagnosticState:
        """Orchestrator agent that coordinates the diagnostic process"""
        
        print(f"🔄 ORCHESTRATOR NODE STARTED - Current step: {state.get('current_step', 'unknown')}")
        print(f"   Questions asked: {state.get('questions_asked', 0)}/{state.get('max_questions', 5)}")
    
        # Start activity tracking
        activity_id = self.activity_tracker.start_activity(
            "orchestrator", 
            "analyzing_symptoms",
            {
                "num_symptoms": len(state.get("selected_symptoms", [])),
                "num_predictions": len(state.get("initial_predictions", {})),
                "disease_db_references": list(state.get("initial_predictions", {}).keys())
            }
        )
        
        # Medical context retrieval
        initial_predictions = state.get("initial_predictions", {})
        if initial_predictions:
            # Get top 3 diseases for context
            top_diseases = sorted(
                initial_predictions.items(), 
                key=lambda x: x[1].get('probability', 0), 
                reverse=True
            )[:3]
            
            # Search for medical context for each top disease
            medical_context = []
            for disease_name, pred_data in top_diseases:
                context_results = self.vector_db.search(f"Clinical presentation symptoms {disease_name}", k=2)
                medical_context.extend(context_results)
            
            # Combine context into a structured format
            medical_context_text = "\n".join([
                f"Medical Reference {i+1}: {ctx}" 
                for i, ctx in enumerate(medical_context)
            ])
        else:
            medical_context_text = "No specific medical context available"
            medical_context = []

        prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a Medical Diagnostic Orchestrator analyzing a patient case. 
        
        PATIENT CASE:
        Selected symptoms: {selected_symptoms}
        Initial ML predictions: {initial_predictions}
        
        MEDICAL CONTEXT:
        {medical_context}
        
        ANALYSIS REQUIRED:
        Provide a comprehensive medical analysis including:
        1. SYMPTOM_ANALYSIS: Which symptoms are most diagnostically significant and why
        2. DIFFERENTIAL_DIAGNOSIS: Key differentiating factors between predicted diseases  
        3. MISSING_CLINICAL_INFO: What additional information would help narrow diagnosis
        4. CONFIDENCE_ASSESSMENT: Why current prediction confidence is high/medium/low
        5. QUESTIONING_STRATEGY: What type of questions would be most valuable
        
        Format your response with clear sections as shown above.
        """),
        ("human", "Please analyze this diagnostic case with detailed medical reasoning.")
        ])
        
        # Properly format the prompt with all required variables
        messages = prompt.format_messages(
            selected_symptoms=state.get("selected_symptoms", []),
            initial_predictions=json.dumps(initial_predictions, indent=2),
            medical_context=medical_context_text
        )
        
        response = self.llm.invoke(messages)
        
        # Parse structured reasoning
        content = response.content
        symptom_analysis = self._extract_section(content, "SYMPTOM_ANALYSIS")
        differential_diagnosis = self._extract_section(content, "DIFFERENTIAL_DIAGNOSIS")
        missing_clinical_info = self._extract_section(content, "MISSING_CLINICAL_INFO")
        confidence_assessment = self._extract_section(content, "CONFIDENCE_ASSESSMENT")
        questioning_strategy = self._extract_section(content, "QUESTIONING_STRATEGY")
        
        # Calculate confidence metrics
        max_confidence = 0
        prediction_count = len(initial_predictions)
        if initial_predictions:
            max_confidence = max(pred.get("probability", 0) for pred in initial_predictions.values())
        
        # Determine next action based on confidence and analysis
        needs_more_questions = max_confidence < state.get("confidence_threshold", 0.8)
        decision = "proceed_with_questioning" if needs_more_questions else "high_confidence_achieved"
        
        # Detailed reasoning step
        # Create comprehensive reasoning step
        detailed_reasoning = {
            "agent": "orchestrator",
            "step": "initial_diagnostic_analysis",
            "timestamp": datetime.now().isoformat(),
            "input_data": {
                "symptoms": state.get("selected_symptoms", []),
                "initial_predictions": list(initial_predictions.keys()),
                "prediction_count": prediction_count,
                "max_confidence": max_confidence
            },
            "medical_analysis": {
                "symptom_analysis": symptom_analysis,
                "differential_diagnosis": differential_diagnosis,
                "missing_clinical_info": missing_clinical_info,
                "confidence_assessment": confidence_assessment,
                "questioning_strategy": questioning_strategy
            },
            "vector_db_usage": {
                "queries_made": len(top_diseases) if initial_predictions else 0,
                "context_retrieved": len(medical_context),
                "top_diseases_researched": [d[0] for d in top_diseases] if initial_predictions else []
            },
            "decision_logic": {
                "max_confidence": max_confidence,
                "confidence_threshold": state.get("confidence_threshold", 0.8),
                "needs_more_questions": needs_more_questions,
                "decision": decision,
                "reasoning": f"Max confidence {max_confidence:.2f} {'<' if needs_more_questions else '>='} threshold {state.get('confidence_threshold', 0.8)}"
            }
        }
        
        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id,
            {
                "diseases_analyzed": prediction_count,
                "max_confidence": max_confidence,
                "decision": decision,
                "context_retrieved": len(medical_context)
            },
            f"Analyzed {prediction_count} diseases with max confidence {max_confidence:.2f}. Decision: {decision}"
        )
        
        print(f"✅ ORCHESTRATOR NODE COMPLETED - Decision: {decision}")
        print(f"   Max confidence: {max_confidence:.2f}, Threshold: {state.get('confidence_threshold', 0.8)}")
        print(f"   Medical context retrieved: {len(medical_context)} references")

        # Properly merge state while preserving all existing data
        existing_reasoning = state.get("reasoning_steps", [])
        existing_agent_outputs = state.get("agent_outputs", {})
        existing_vector_usage = state.get("vector_db_usage", [])
        
        return {
            **state,  # Preserve all existing state
            "current_step": "orchestration_complete",
            "needs_more_questions": needs_more_questions,
            "reasoning_steps": existing_reasoning + [detailed_reasoning],
            "agent_outputs": {**existing_agent_outputs, "orchestrator": response.content},
            "vector_db_usage": existing_vector_usage + [{
                "agent": "orchestrator",
                "queries": [f"Clinical presentation symptoms {d[0]}" for d in top_diseases] if initial_predictions else [],
                "results_count": len(medical_context),
                "timestamp": datetime.now().isoformat()
            }],
            "real_time_activities": self.activity_tracker.get_current_activities()
        }
        
    def _extract_section(self, content: str, section_name: str) -> str:
        """Extract a specific section from structured LLM response"""
        try:
            # Try different patterns for section extraction
            patterns = [
                f"{section_name}:",
                f"{section_name.replace('_', ' ')}:",
                f"**{section_name}**:",
                f"## {section_name}",
                f"### {section_name}"
            ]
            
            for pattern in patterns:
                start = content.find(pattern)
                if start != -1:
                    start += len(pattern)
                    # Find the end of this section (next section or end of content)
                    next_section_patterns = [
                        "\n\n**", "\n\n##", "\n\n###", 
                        "\nSYMPTOM_ANALYSIS:", "\nDIFFERENTIAL_DIAGNOSIS:", 
                        "\nMISSING_CLINICAL_INFO:", "\nCONFIDENCE_ASSESSMENT:", 
                        "\nQUESTIONING_STRATEGY:"
                    ]
                    
                    end = len(content)
                    for next_pattern in next_section_patterns:
                        next_pos = content.find(next_pattern, start)
                        if next_pos != -1 and next_pos < end:
                            end = next_pos
                    
                    extracted = content[start:end].strip()
                    if extracted:
                        return extracted
            
            return f"Analysis for {section_name.replace('_', ' ').lower()} not found in response"
        except Exception as e:
            print(f"Error extracting section {section_name}: {e}")
            return f"Error extracting {section_name.replace('_', ' ').lower()}"
    
    
    @traceable(name="questioning_agent")
    def questioning_node(self, state: DiagnosticState) -> DiagnosticState:
        """Generate clarifying questions based on predictions"""
        
        questions_asked = state.get("questions_asked", 0)
        max_questions = state.get("max_questions", 5)

        # Start activity tracking
        activity_id = self.activity_tracker.start_activity(
            "questioning", 
            "generating_questions",
            {
                "questions_asked": questions_asked,
                "max_questions": max_questions,
                "remaining": max_questions - questions_asked
            }
        )

        # strict less than comparison
        if questions_asked >= max_questions:
            print(f"Question limit reached: {questions_asked}/{max_questions}")
            
            self.activity_tracker.complete_activity(
                activity_id,
                {"questions_generated": 0, "reason": "limit_reached"},
                f"Question limit reached ({questions_asked}/{max_questions})"
            )
            
            return {
                **state,
                "clarifying_questions": [],
                "current_step": "questions_limit_reached",
                "needs_more_questions": False,
                "reasoning_steps": state.get("reasoning_steps", []) + [{
                    "agent": "questioning",
                    "step": "question_limit_check",
                    "timestamp": datetime.now().isoformat(),
                    "result": "Question limit reached",
                    "questions_asked": questions_asked,
                    "max_questions": max_questions
                }],
                "real_time_activities": self.activity_tracker.get_current_activities()
            }
        
        # Calculate remaining questions
        remaining_questions = min(
            max_questions - questions_asked,
            3  # Max 3 questions per round
        )
        
        if remaining_questions <= 0:
            print("No remaining questions allowed")
            
            self.activity_tracker.complete_activity(
                activity_id,
                {"questions_generated": 0, "reason": "no_remaining"},
                "No remaining questions allowed"
            )
            
            return {
                **state,
                "clarifying_questions": [],
                "current_step": "no_more_questions_allowed",
                "needs_more_questions": False,
                "reasoning_steps": state.get("reasoning_steps", []) + [{
                    "agent": "questioning",
                    "step": "remaining_questions_check",
                    "timestamp": datetime.now().isoformat(),
                    "result": "No remaining questions allowed",
                    "remaining_questions": remaining_questions
                }],
                "real_time_activities": self.activity_tracker.get_current_activities()
            }
            
        # Get previously asked questions to avoid duplicates
        asked_questions = state.get("asked_questions", [])
        asked_question_texts = {q.get("question_text", "") for q in asked_questions}
        
        # Get orchestrator's analysis for context 
        orchestrator_analysis = None
        reasoning_steps = state.get("reasoning_steps", [])
        for step in reasoning_steps:
            if step.get("agent") == "orchestrator":
                orchestrator_analysis = step.get("medical_analysis", {})
                break
        
        # Enhanced prompt with orchestrator context
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Questioning Specialist. Generate {remaining_questions} clarifying questions 
            to improve diagnostic accuracy.

            CURRENT CASE:
            Initial predictions: {initial_predictions}
            Selected symptoms: {selected_symptoms}
            Questions already asked: {questions_asked}/{max_questions}
            
            ORCHESTRATOR ANALYSIS CONTEXT:
            {orchestrator_context}
            
            PREVIOUSLY ASKED QUESTIONS (DO NOT REPEAT THESE):
            {previously_asked}
            
            INSTRUCTIONS:
            Generate exactly {remaining_questions} high-priority yes/no questions that:
            1. Have NOT been asked before
            2. Would help confirm or rule out the predicted diseases
            3. Focus on the missing clinical information identified by the orchestrator
            4. Target the most diagnostically significant symptoms
            
            CRITICAL: Return ONLY a valid JSON array with this exact format:
            [
                {{
                    "id": "q1",
                    "question_text": "Do you have a fever above 101°F (38.3°C)?",
                    "type": "yes_no",
                    "related_disease": "Influenza",
                    "symptom_checking": "high fever",
                    "priority": 1,
                    "required": true
                }}
            ]
            
            Focus on symptoms that would help differentiate between the top predicted diseases.
            """),
            ("human", "Generate {remaining_questions} NEW clarifying questions based on the orchestrator's analysis")
        ])
        
        # Format previously asked questions for the prompt
        previously_asked_text = "\n".join([
            f"- {q.get('question_text', 'Unknown question')}" 
            for q in asked_questions
        ]) if asked_questions else "None"
        
        # Format orchestrator context
        orchestrator_context_text = "No orchestrator analysis available"
        if orchestrator_analysis:
            orchestrator_context_text = f"""
            Missing Clinical Info: {orchestrator_analysis.get('missing_clinical_info', 'Not specified')}
            Questioning Strategy: {orchestrator_analysis.get('questioning_strategy', 'Not specified')}
            Differential Diagnosis Needs: {orchestrator_analysis.get('differential_diagnosis', 'Not specified')}
            """
        
        messages = prompt.format_messages(
            initial_predictions=json.dumps(state.get("initial_predictions", {}), indent=2),
            selected_symptoms=state.get("selected_symptoms", []),
            questions_asked=questions_asked,
            max_questions=max_questions,
            remaining_questions=remaining_questions,
            previously_asked=previously_asked_text,
            orchestrator_context=orchestrator_context_text
        )
        
        response = self.llm.invoke(messages) 
        
        print(f"Raw LLM response for questions: {response.content}")
        
        # Parse questions from response with better error handling 
        questions = []
        try:
            content = response.content.strip()
            
            # Multiple extraction attempts
            json_content = None
            
            # Method 1: Look for ```json blocks
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                if json_end > json_start:
                    json_content = content[json_start:json_end].strip()
            
            # Method 2: Look for array brackets
            elif "[" in content and "]" in content:
                start = content.find("[")
                end = content.rfind("]") + 1
                json_content = content[start:end]
            
            # Method 3: Look for object brackets (in case it's wrapped)
            elif "{" in content and "}" in content:
                start = content.find("{")
                end = content.rfind("}") + 1
                json_content = content[start:end]
                # If it's a single object, wrap it in an array
                if not json_content.strip().startswith("["):
                    json_content = f"[{json_content}]"
            
            if json_content:
                print(f"Extracted JSON content: {json_content}")
                questions_data = json.loads(json_content)
                
                # Ensure it's a list
                if isinstance(questions_data, dict):
                    questions_data = [questions_data]
                
                # Validate and format questions
                for i, q in enumerate(questions_data):
                    if isinstance(q, dict) and q.get("question_text"):
                        question = {
                            "id": q.get("id", f"q{i+1}"),
                            "question": q.get("question_text", ""),
                            "question_text": q.get("question_text", ""),
                            "related_disease": q.get("related_disease", "General"),
                            "symptom_checking": q.get("symptom_checking", "additional symptoms"),
                            "priority": q.get("priority", 1),
                            "type": q.get("type", "yes_no"),
                            "required": q.get("required", True)
                        }
                        questions.append(question)
            
        except (json.JSONDecodeError, KeyError, AttributeError) as e:
            print(f"Error parsing questions: {e}")
            print(f"Content that failed to parse: {content}")
        
        # Fallback
        if not questions:
            print("No valid questions generated - ending questioning phase")
            
            self.activity_tracker.complete_activity(
                activity_id,
                {"questions_generated": 0, "reason": "generation_failed"},
                "No valid questions could be generated"
            )
            
            return {
                **state,
                "clarifying_questions": [],
                "current_step": "no_more_questions",
                "needs_more_questions": False,
                "reasoning_steps": state.get("reasoning_steps", []) + [{
                    "agent": "questioning",
                    "step": "question_generation_failed",
                    "timestamp": datetime.now().isoformat(),
                    "result": "No valid questions could be generated",
                    "llm_response": response.content[:200] + "..." if len(response.content) > 200 else response.content
                }],
                "real_time_activities": self.activity_tracker.get_current_activities()
            }
        
        print(f"Final questions generated: {len(questions)} questions")
        for q in questions:
            print(f"  - {q['question_text']}")
            
        # Filter out any duplicate questions before returning
        filtered_questions = []
        for q in questions:
            question_text = q.get("question_text", "")
            if question_text not in asked_question_texts:
                filtered_questions.append(q)
        
        # Update asked_questions list
        updated_asked_questions = asked_questions + filtered_questions
        
        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id,
            {
                "questions_generated": len(filtered_questions),
                "questions_filtered": len(questions) - len(filtered_questions),
                "total_asked": len(updated_asked_questions)
            },
            f"Generated {len(filtered_questions)} new questions (filtered {len(questions) - len(filtered_questions)} duplicates)"
        )
        
        # Create detailed reasoning step
        reasoning_step = {
            "agent": "questioning",
            "step": "question_generation",
            "timestamp": datetime.now().isoformat(),
            "input_context": {
                "questions_asked": questions_asked,
                "remaining_questions": remaining_questions,
                "previously_asked_count": len(asked_questions),
                "orchestrator_analysis_available": orchestrator_analysis is not None
            },
            "generation_process": {
                "raw_questions_generated": len(questions),
                "questions_after_filtering": len(filtered_questions),
                "duplicates_removed": len(questions) - len(filtered_questions),
                "question_topics": [q.get("symptom_checking", "") for q in filtered_questions]
            },
            "result": f"Generated {len(filtered_questions)} NEW clarifying questions"
        }
        
        # FIXED: Properly preserve all existing state
        existing_reasoning = state.get("reasoning_steps", [])
        existing_agent_outputs = state.get("agent_outputs", {})
        
        return {
            **state,  # Preserve all existing state
            "clarifying_questions": filtered_questions,
            "asked_questions": updated_asked_questions, 
            "current_step": "questions_generated",
            "reasoning_steps": existing_reasoning + [reasoning_step],
            "agent_outputs": {**existing_agent_outputs, "questioning": response.content},
            "real_time_activities": self.activity_tracker.get_current_activities()
        }

    
    def human_input_node(self, state: DiagnosticState) -> DiagnosticState:
        """Human-in-the-loop node for collecting responses"""
        
        # This node should process any user responses that were provided
        user_responses = state.get("user_responses", {})
        questions = state.get("clarifying_questions", [])
        
        print(f"Human input node: {len(questions)} questions, {len(user_responses)} responses")
        
        # Add reasoning step for transparency
        reasoning_step = {
            "agent": "human_input",
            "step": "awaiting_user_responses",
            "timestamp": datetime.now().isoformat(),
            "questions_presented": len(questions),
            "responses_received": len(user_responses),
            "status": "responses_received" if user_responses and questions else "awaiting_input"
        }
        
        # If we have responses, continue; otherwise wait
        if user_responses and questions:
            # Process the responses
            return {
                **state,
                "current_step": "responses_received",
                "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step]
            }
        else:
            # Wait for human input - ensure we have questions to ask
            if questions:
                return {
                    **state,
                    "current_step": "awaiting_human_input",
                    "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step]
                }
            else:
                # No questions available, skip to next step
                return {
                    **state,
                    "current_step": "no_questions_needed",
                    "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step]
                }
                
    
    @traceable(name="response_integration_agent")
    def response_integration_node(self, state: DiagnosticState) -> DiagnosticState:
        """Process user responses with detailed medical reasoning - SAME AS BEFORE BUT WITH BETTER STATE PRESERVATION"""
        print(f"🔄 RESPONSE INTEGRATION NODE STARTED")
        print(f"   Processing {len(state.get('user_responses', {}))} user responses")
        
        # Track activity
        activity_id = self.activity_tracker.start_activity(
            "response_integration", 
            "processing_answers",
            {"num_responses": len(state.get("user_responses", {}))}
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Response Integration Specialist. Process each user response with detailed medical reasoning.
            
            For each response, explain:
            1. MEDICAL_SIGNIFICANCE: Why this answer is medically important
            2. DISEASE_IMPACT: How this affects each disease probability
            3. SYMPTOM_CHANGES: What symptoms to add/remove and why
            4. DIFFERENTIAL_IMPACT: How this helps differentiate between diseases
            
            Questions and Responses: {qa_pairs}
            Current Diseases: {diseases}
            Current Symptoms: {current_symptoms}
            
            Return a JSON object with:
            {{
                "updated_symptoms": ["symptom1", "symptom2", ...],
                "medical_reasoning": "Detailed explanation of how responses change the clinical picture",
                "symptom_additions": ["new_symptom1", ...],
                "symptom_removals": ["removed_symptom1", ...],
                "confidence_impact": "How these responses affect diagnostic confidence"
            }}
            """),
            ("human", "Process responses with detailed medical reasoning.")
        ])
        
        # Create Q&A pairs for better context
        qa_pairs = []
        questions = state.get("clarifying_questions", [])
        responses = state.get("user_responses", {})
        
        for q in questions:
            q_id = q.get("id", "")
            if q_id in responses:
                qa_pairs.append({
                    "question": q.get("question_text", ""),
                    "answer": responses[q_id],
                    "related_disease": q.get("related_disease", ""),
                    "symptom_focus": q.get("symptom_checking", "")
                })
        
        messages = prompt.format_messages(
            qa_pairs=json.dumps(qa_pairs, indent=2),
            diseases=list(state.get("initial_predictions", {}).keys()),
            current_symptoms=state.get("selected_symptoms", [])
        )
        
        response = self.llm.invoke(messages)  # Remove tools for cleaner JSON response
        
        # Parse the response
        updated_symptoms = state.get("selected_symptoms", [])
        medical_reasoning = response.content
        
        try:
            content = response.content.strip()
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            elif "{" in content and "}" in content:
                start = content.find("{")
                end = content.rfind("}") + 1
                content = content[start:end]
            
            integration_result = json.loads(content)
            updated_symptoms = integration_result.get("updated_symptoms", state["selected_symptoms"])
            medical_reasoning = integration_result.get("medical_reasoning", response.content)
            
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing integration result: {e}")
            # Fallback: keep original symptoms
            updated_symptoms = state.get("selected_symptoms", [])
        
        # Create detailed reasoning
        detailed_reasoning = {
            "agent": "response_integration",
            "step": "processing_user_responses",
            "timestamp": datetime.now().isoformat(),
            "input_data": {
                "responses_processed": len(qa_pairs),
                "questions_answered": [qa["question"] for qa in qa_pairs],
                "answers_given": [qa["answer"] for qa in qa_pairs]
            },
            "processing_result": {
                "medical_reasoning": medical_reasoning,
                "qa_analysis": qa_pairs,
                "symptom_changes": {
                    "original_symptoms": state.get("selected_symptoms", []),
                    "updated_symptoms": updated_symptoms,
                    "changes_made": len(updated_symptoms) != len(state.get("selected_symptoms", [])),
                    "rationale": "Based on user responses to clarifying questions"
                }
            }
        }
        
        print(f"✅ RESPONSE INTEGRATION NODE COMPLETED")
        print(f"   Updated symptoms: {len(updated_symptoms)} total")
        
        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id, 
            {"responses_processed": len(qa_pairs)},
            medical_reasoning
        )
        
        # FIXED: Properly preserve all existing state
        existing_reasoning = state.get("reasoning_steps", [])
        existing_agent_outputs = state.get("agent_outputs", {})
        
        return {
            **state,  # Preserve all existing state
            "updated_symptoms": updated_symptoms,
            "current_step": "responses_integrated",
            "reasoning_steps": existing_reasoning + [detailed_reasoning],
            "agent_outputs": {**existing_agent_outputs, "response_integration": response.content},
            "real_time_activities": self.activity_tracker.get_current_activities()
        }

    
    @traceable(name="refinement_agent")
    def refinement_node(self, state: DiagnosticState) -> DiagnosticState:
        """Refine and re-rank disease predictions based on updated information with detailed reasoning"""
        print(f"🔄 REFINEMENT NODE STARTED")
        print(f"   Refining {len(state.get('initial_predictions', {}))} predictions")
        
        # Track activity
        activity_id = self.activity_tracker.start_activity(
            "refinement", 
            "updating_predictions",
            {"num_predictions": len(state.get('initial_predictions', {}))}
        )
        
        # Get medical context for refinement
        initial_predictions = state["initial_predictions"]
        updated_symptoms = state.get("updated_symptoms", state["selected_symptoms"])
        validation_results = state.get("validation_results", {})
        
        # Search for symptom-disease relationships
        symptom_disease_context = {}
        for symptom in updated_symptoms[:3]:  # Limit to top 3 symptoms for efficiency
            context = self.vector_db.search(f"Symptom {symptom} associated diseases differential diagnosis", k=2)
            symptom_disease_context[symptom] = context

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Prediction Refinement Specialist. Re-rank and refine 
            disease predictions based on updated symptom information and validation results.

            SYMPTOM-DISEASE CONTEXT:
            {symptom_disease_context}

            Initial predictions: {initial_predictions}
            Updated symptoms: {updated_symptoms}
            Validation results: {validation_results}

            For each disease, provide detailed analysis:
            1. PROBABILITY_REASONING: Why the probability changed and by how much
            2. SYMPTOM_CORRELATION: How updated symptoms correlate with this disease
            3. VALIDATION_INTEGRATION: How validation results influenced the refinement
            4. RANKING_JUSTIFICATION: Medical reasoning for ranking changes
            5. CONFIDENCE_ASSESSMENT: Detailed confidence level reasoning

            Use the medical knowledge tools to verify symptom-disease relationships.

            Return ONLY a valid JSON object:
            {{
                "Disease1": {{
                    "probability": 0.85,
                    "confidence": "High",
                    "rank_change": "+1",
                    "explanation": "Detailed explanation of probability changes",
                    "symptom_match_score": 85,
                    "validation_impact": "How validation affected this prediction",
                    "medical_reasoning": "Clinical reasoning for this refinement"
                }}
            }}"""),
            ("human", "Refine the disease predictions with detailed medical reasoning based on all available information.")
        ])

        messages = prompt.format_messages(
            symptom_disease_context=json.dumps(symptom_disease_context, indent=2),
            initial_predictions=json.dumps(initial_predictions, indent=2),
            updated_symptoms=updated_symptoms,
            validation_results=json.dumps(validation_results, indent=2)
        )

        response = self.llm_with_tools.invoke(messages)

        # Parse refinement results
        try:
            content = response.content
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            elif "{" in content and "}" in content:
                start = content.find("{")
                end = content.rfind("}") + 1
                content = content[start:end]

            refined_predictions = json.loads(content)

        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing refinement result: {e}")
            refined_predictions = initial_predictions

        # Create detailed reasoning
        detailed_reasoning = {
            "agent": "refinement",
            "step": "prediction_refinement",
            "timestamp": datetime.now().isoformat(),
            "predictions_refined": len(refined_predictions),
            "symptom_analysis": {
                "updated_symptoms": updated_symptoms,
                "symptom_disease_correlations": list(symptom_disease_context.keys()),
                "medical_context_used": len(symptom_disease_context)
            },
            "refinement_summary": {
                disease: {
                    "original_probability": initial_predictions.get(disease, {}).get("probability", 0),
                    "refined_probability": result.get("probability", 0),
                    "probability_change": result.get("probability", 0) - initial_predictions.get(disease, {}).get("probability", 0),
                    "confidence_level": result.get("confidence", "Unknown"),
                    "rank_change": result.get("rank_change", "No change"),
                    "medical_reasoning": result.get("medical_reasoning", "Not specified")
                }
                for disease, result in refined_predictions.items()
            },
            "validation_integration": "Incorporated validation results into probability calculations",
            "vector_db_queries": [f"Symptom {symptom} associated diseases differential diagnosis" for symptom in updated_symptoms[:3]]
        }

        print(f"✅ REFINEMENT NODE COMPLETED")
        print(f"   Refined {len(refined_predictions)} disease predictions with medical reasoning")

        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id,
            {"predictions_refined": len(refined_predictions)},
            f"Refined {len(refined_predictions)} predictions based on updated symptoms and validation"
        )

        return {
            **state,
            "refined_predictions": refined_predictions,
            "current_step": "predictions_refined",
            "reasoning_steps": state.get("reasoning_steps", []) + [detailed_reasoning],
            "agent_outputs": {**state.get("agent_outputs", {}), "refinement": response.content},
            "vector_db_usage": state.get("vector_db_usage", []) + [
                {"query": f"Symptom {symptom} associated diseases differential diagnosis", "results": symptom_disease_context[symptom]}
                for symptom in symptom_disease_context.keys()
            ],
            "real_time_activities": self.activity_tracker.get_current_activities()
        }
    
    @traceable(name="validation_agent")
    def validation_node(self, state: DiagnosticState) -> DiagnosticState:
        """Validate predictions against medical knowledge"""
        print(f"🔄 VALIDATION NODE STARTED")
        print(f"   Validating {len(state.get('initial_predictions', {}))} predictions")
        
        # Track activity
        activity_id = self.activity_tracker.start_activity(
            "validation", 
            "checking_medical_knowledge",
            {"num_predictions": len(state.get('initial_predictions', {}))}
        )
        
        # Get medical context for validation
        predictions = state.get("refined_predictions", state["initial_predictions"])
        symptoms = state.get("updated_symptoms", state["selected_symptoms"])
        
        # Search medical knowledge for each disease
        medical_validations = {}
        for disease in predictions.keys():
            medical_context = self.vector_db.search(f"Medical validation {disease} symptoms diagnosis", k=3)
            medical_validations[disease] = medical_context
            
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Knowledge Validator. Cross-reference symptom patterns 
            with established medical knowledge to validate disease predictions.
            
            MEDICAL VALIDATION CONTEXT:
            {medical_validations}
            
            Current predictions: {predictions}
            Updated symptoms: {symptoms}
            
            For each disease, provide detailed analysis:
            1. SYMPTOM_ALIGNMENT: How well symptoms match typical presentations
            2. MEDICAL_EVIDENCE: What medical literature supports/contradicts this
            3. DIFFERENTIAL_ANALYSIS: How this compares to similar conditions
            4. CONFIDENCE_REASONING: Medical justification for confidence adjustments
            
            Use the available medical tools to search for disease information.
            
            Return ONLY a valid JSON object:
            {{
                "Disease1": {{
                    "confidence_adjustment": 0.2,
                    "reasoning": "Detailed medical reasoning for adjustment",
                    "symptom_match_score": 85,
                    "validation_status": "confirmed",
                    "medical_evidence": "Supporting evidence from medical knowledge",
                    "differential_notes": "How this differs from similar conditions"
                }}
            }}"""),
            ("human", "Validate the disease predictions against medical knowledge with detailed reasoning.")
        ])
        
        messages = prompt.format_messages(
            medical_validations=json.dumps(medical_validations, indent=2),
            predictions=json.dumps(predictions, indent=2),
            symptoms=symptoms
        )
        
        response = self.llm_with_tools.invoke(messages)
        
        # Parse validation results
        try:
            content = response.content
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            elif "{" in content and "}" in content:
                start = content.find("{")
                end = content.rfind("}") + 1
                content = content[start:end]
            
            validation_results = json.loads(content)
            
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing validation result: {e}")
            validation_results = {}
        
        # Create detailed reasoning
        detailed_reasoning = {
            "agent": "validation",
            "step": "medical_knowledge_validation",
            "timestamp": datetime.now().isoformat(),
            "predictions_validated": len(validation_results),
            "medical_context_queries": list(medical_validations.keys()),
            "vector_db_searches": [f"Medical validation {disease} symptoms diagnosis" for disease in predictions.keys()],
            "validation_summary": {
                disease: {
                    "confidence_adjustment": result.get("confidence_adjustment", 0),
                    "validation_status": result.get("validation_status", "unknown"),
                    "medical_evidence": result.get("medical_evidence", "Not specified"),
                    "symptom_match_score": result.get("symptom_match_score", 0)
                }
                for disease, result in validation_results.items()
            },
            "medical_knowledge_integration": "Cross-referenced predictions with medical literature and symptom databases"
        }
        print(f"✅ VALIDATION NODE COMPLETED")
        print(f"   Validated {len(validation_results)} predictions with medical evidence")
        
        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id,
            {"validations_completed": len(validation_results)},
            f"Validated {len(validation_results)} predictions against medical knowledge"
        )
    
        return {
            **state,
            "validation_results": validation_results,
            "current_step": "predictions_validated",
            "reasoning_steps": state.get("reasoning_steps", []) + [detailed_reasoning],
            "agent_outputs": {**state.get("agent_outputs", {}), "validation": response.content},
            "vector_db_usage": state.get("vector_db_usage", []) + [
                {"query": f"Medical validation {disease} symptoms diagnosis", "results": medical_validations[disease]}
                for disease in predictions.keys()
            ],
            "real_time_activities": self.activity_tracker.get_current_activities()
        }
    
    @traceable(name="explanation_agent")
    def explanation_node(self, state: DiagnosticState) -> DiagnosticState:
        """Generate clear explanations for predictions with detailed reasoning"""
        print(f"🔄 EXPLANATION NODE STARTED")
        print(f"   Generating explanations for {len(state.get('refined_predictions', {}))} predictions")
        
        # Track activity
        activity_id = self.activity_tracker.start_activity(
            "explanation", 
            "generating_explanations",
            {"num_predictions": len(state.get('refined_predictions', {}))}
        )
        
        # Get medical context for explanations
        predictions = state.get("refined_predictions", state["initial_predictions"])
        symptoms = state.get("updated_symptoms", state["selected_symptoms"])
        validation = state.get("validation_results", {})
        
        # Search for explanation context for each disease
        explanation_context = {}
        for disease in predictions.keys():
            context = self.vector_db.search(f"Patient explanation {disease} symptoms causes treatment", k=2)
            explanation_context[disease] = context
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Explanation Specialist. Create clear, understandable 
            explanations for disease predictions that patients can understand.

            MEDICAL EXPLANATION CONTEXT:
            {explanation_context}

            Final predictions: {predictions}
            Patient symptoms: {symptoms}
            Validation results: {validation}
            
            For each disease, provide detailed analysis:
            1. SYMPTOM_CORRELATION: How patient symptoms relate to this condition
            2. PROBABILITY_EXPLANATION: Why this probability was assigned
            3. VALIDATION_INTEGRATION: How medical validation influenced the explanation
            4. PATIENT_FRIENDLY_SUMMARY: Clear, non-alarming explanation for patients
            5. MISSING_SYMPTOMS: What typical symptoms are absent and why that's significant
            
            For each disease, create explanations that:
            1. Explain why the disease was predicted based on specific symptoms
            2. Highlight supporting symptoms with medical reasoning
            3. Note any missing typical symptoms and their significance
            4. Use simple, non-alarming language while being informative
            5. Include confidence reasoning in patient-friendly terms
            6. Reference validation results where relevant

            Return ONLY a valid JSON object:
            {
                "Disease1": {
                    "explanation": "Clear patient-friendly explanation...",
                    "symptom_analysis": "How symptoms support this diagnosis...",
                    "confidence_reasoning": "Why we have this level of confidence...",
                    "medical_context": "Relevant medical background in simple terms...",
                    "validation_notes": "How medical validation supports this..."
                }
            }"""),
            ("human", "Generate comprehensive patient-friendly explanations with detailed medical reasoning.")
        ])

        messages = prompt.format_messages(
            explanation_context=json.dumps(explanation_context, indent=2),
            predictions=json.dumps(predictions, indent=2),
            symptoms=symptoms,
            validation=json.dumps(validation, indent=2)
        )

        response = self.llm_with_tools.invoke(messages)

        # Parse explanations with detailed structure
        try:
            content = response.content
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            elif "{" in content and "}" in content:
                start = content.find("{")
                end = content.rfind("}") + 1
                content = content[start:end]

            detailed_explanations = json.loads(content)
            
            # Convert to simple explanations for backward compatibility while keeping detailed data
            simple_explanations = {}
            for disease, explanation_data in detailed_explanations.items():
                if isinstance(explanation_data, dict):
                    simple_explanations[disease] = explanation_data.get("explanation", 
                        f"Based on your symptoms, there is a likelihood of {disease}.")
                else:
                    simple_explanations[disease] = str(explanation_data)
                    
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing explanations: {e}")
            # Fallback to simple explanations
            simple_explanations = {}
            detailed_explanations = {}
            for disease in predictions.keys():
                simple_explanations[disease] = f"Based on symptom analysis and medical validation, {disease} was identified as a potential condition."

        # Create detailed reasoning
        detailed_reasoning = {
            "agent": "explanation",
            "step": "generating_patient_explanations",
            "timestamp": datetime.now().isoformat(),
            "explanations_generated": len(simple_explanations),
            "medical_context_queries": list(explanation_context.keys()),
            "vector_db_searches": [f"Patient explanation {disease} symptoms causes treatment" for disease in predictions.keys()],
            "explanation_analysis": {
                disease: {
                    "symptom_correlation": detailed_explanations.get(disease, {}).get("symptom_analysis", "Not specified"),
                    "confidence_reasoning": detailed_explanations.get(disease, {}).get("confidence_reasoning", "Not specified"),
                    "medical_context_used": len(explanation_context.get(disease, [])),
                    "validation_integration": detailed_explanations.get(disease, {}).get("validation_notes", "Not specified"),
                    "patient_friendly_score": "High" if len(simple_explanations.get(disease, "")) > 50 else "Medium"
                }
                for disease in predictions.keys()
            },
            "explanation_methodology": {
                "medical_context_integration": "Used vector database to retrieve patient-friendly medical information",
                "validation_integration": "Incorporated validation results into explanations",
                "language_simplification": "Converted medical terminology to patient-friendly language",
                "confidence_communication": "Explained probability levels in understandable terms"
            },
            "quality_metrics": {
                "average_explanation_length": sum(len(exp) for exp in simple_explanations.values()) / len(simple_explanations) if simple_explanations else 0,
                "diseases_explained": len(simple_explanations),
                "medical_references_used": sum(len(context) for context in explanation_context.values())
            }
        }

        print(f"✅ EXPLANATION NODE COMPLETED")
        print(f"   Generated {len(simple_explanations)} patient-friendly explanations with medical reasoning")

        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id,
            {"explanations_generated": len(simple_explanations)},
            f"Generated comprehensive explanations for {len(simple_explanations)} conditions with medical reasoning"
        )

        return {
            **state,
            "explanations": simple_explanations,  # Keep backward compatibility
            "detailed_explanations": detailed_explanations,  # Add detailed explanations
            "current_step": "explanations_generated",
            "reasoning_steps": state.get("reasoning_steps", []) + [detailed_reasoning],
            "agent_outputs": {**state.get("agent_outputs", {}), "explanation": response.content},
            "vector_db_usage": state.get("vector_db_usage", []) + [
                {"query": f"Patient explanation {disease} symptoms causes treatment", "results": explanation_context[disease]}
                for disease in predictions.keys()
            ],
            "real_time_activities": self.activity_tracker.get_current_activities()
        }

    
    @traceable(name="evaluation_agent")
    def evaluator_node(self, state: DiagnosticState) -> DiagnosticState:
        """Evaluate overall confidence and determine next steps"""
        print(f"🔄 EVALUATOR NODE STARTED")
        
        questions_asked = state.get("questions_asked", 0)
        max_questions = state.get("max_questions", 5)
        
        print(f"   Questions: {questions_asked}/{max_questions}")
        print(f"   Current step: {state.get('current_step', 'unknown')}")
    
        # If we're in the middle of questioning, evaluate confidence for more questions
        if questions_asked < max_questions and state.get("user_responses"):
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a Medical Confidence Evaluator. Assess whether we need more questions
                or if we have sufficient information for diagnosis.
                
                Current predictions: {predictions}
                Updated symptoms: {symptoms}
                Questions asked so far: {questions_asked}/{max_questions}
                Recent responses: {recent_responses}
                
                Evaluate:
                1. Current diagnostic confidence level
                2. Whether more questions would significantly improve accuracy
                3. Risk of over-questioning vs under-questioning
                
                Return JSON:
                {{
                    "overall_confidence": "High|Medium|Low",
                    "needs_more_questions": true/false,
                    "reasoning": "Explanation of decision",
                    "confidence_scores": {{
                        "Disease1": {{"confidence_level": "High", "justification": "..."}}
                    }}
                }}"""),
                ("human", "Evaluate if we need more questions or can proceed to final diagnosis.")
            ])
            
            messages = prompt.format_messages(
                predictions=json.dumps(state.get("initial_predictions", {}), indent=2),
                symptoms=state.get("updated_symptoms", state.get("selected_symptoms", [])),
                questions_asked=questions_asked,
                max_questions=max_questions,
                recent_responses=json.dumps(state.get("user_responses", {}), indent=2)
            )
            
            response = self.llm.invoke(messages)
            
            # Parse evaluation results
            try:
                content = response.content.strip()
                if "```json" in content:
                    json_start = content.find("```json") + 7
                    json_end = content.find("```", json_start)
                    content = content[json_start:json_end].strip()
                elif "{" in content and "}" in content:
                    start = content.find("{")
                    end = content.rfind("}") + 1
                    content = content[start:end]
                
                eval_result = json.loads(content)
                needs_more_questions = eval_result.get("needs_more_questions", False)
                confidence_scores = eval_result.get("confidence_scores", {})
                overall_confidence = eval_result.get("overall_confidence", "Medium")
                
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error parsing evaluation result: {e}")
                # Conservative fallback
                needs_more_questions = questions_asked < max_questions
                confidence_scores = {}
                overall_confidence = "Medium"
            
            # Force stop if we've reached max questions
            if questions_asked >= max_questions:
                needs_more_questions = False
            
            reasoning_step = {
                "agent": "evaluator",
                "step": "mid_questioning_evaluation",
                "timestamp": datetime.now().isoformat(),
                "decision": "more_questions" if needs_more_questions else "proceed_to_final_diagnosis",
                "confidence_assessment": overall_confidence,
                "questions_asked": questions_asked,
                "max_questions": max_questions,
                "reasoning": eval_result.get("reasoning", "Confidence evaluation completed")
            }
            
            return {
                **state,
                "confidence_scores": confidence_scores,
                "needs_more_questions": needs_more_questions,
                "current_step": "mid_evaluation_complete",
                "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
                "agent_outputs": {**state.get("agent_outputs", {}), "evaluator": response.content}
            }
        
        else:
            # Final evaluation - we're done with questioning
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a Final Medical Evaluator. Provide final confidence assessment
                for all disease predictions.
                
                Final predictions: {predictions}
                All symptoms: {symptoms}
                Total questions asked: {questions_asked}
                
                For each disease, provide final confidence evaluation."""),
                ("human", "Provide final confidence evaluation for all predictions.")
            ])
            
            predictions = state.get("refined_predictions", state.get("initial_predictions", {}))
            symptoms = state.get("updated_symptoms", state.get("selected_symptoms", []))
            
            messages = prompt.format_messages(
                predictions=json.dumps(predictions, indent=2),
                symptoms=symptoms,
                questions_asked=questions_asked
            )
            
            response = self.llm.invoke(messages)
            
            reasoning_step = {
                "agent": "evaluator",
                "step": "final_evaluation",
                "timestamp": datetime.now().isoformat(),
                "total_questions_asked": questions_asked,
                "final_assessment": response.content,
                "workflow_status": "evaluation_complete"
            }
            
            return {
                **state,
                "needs_more_questions": False,
                "current_step": "final_evaluation_complete",
                "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
                "agent_outputs": {**state.get("agent_outputs", {}), "evaluator": response.content}
            }

