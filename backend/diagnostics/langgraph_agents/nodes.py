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
        print(f"   User responses: {len(state.get('user_responses', {}))}")
    
        # Check if we have responses to process
        user_responses = state.get("user_responses", {})
        if user_responses and len(user_responses) > 0:
            print("✅ ORCHESTRATOR: User responses detected, skipping analysis")
            return {
                **state,
                "current_step": "responses_ready_for_processing",
                "reasoning_steps": state.get("reasoning_steps", []) + [{
                    "agent": "orchestrator",
                    "step": "responses_detected",
                    "timestamp": datetime.now().isoformat(),
                    "result": f"Detected {len(user_responses)} user responses, proceeding to integration"
                }]
            }
        
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
        ("system", """You are a Medical Diagnostic Orchestrator analyzing the patient case. 
        
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
        4. QUESTIONING_STRATEGY: What type of questions would be most valuable for clarification
        5. MEDICAL_COMPLEXITY: Assessment of case complexity and diagnostic challenges
        
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
        questioning_strategy = self._extract_section(content, "QUESTIONING_STRATEGY")
        medical_complexity = self._extract_section(content, "MEDICAL_COMPLEXITY")
        
        # Calculate confidence metrics
        max_confidence = 0
        prediction_count = len(initial_predictions)
        if initial_predictions:
            max_confidence = max(pred.get("probability", 0) for pred in initial_predictions.values())
        
        # Detailed reasoning step
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
                "questioning_strategy": questioning_strategy,
                "medical_complexity": medical_complexity
            },
            "vector_db_usage": {
                "queries_made": len(top_diseases) if initial_predictions else 0,
                "context_retrieved": len(medical_context),
                "top_diseases_researched": [d[0] for d in top_diseases] if initial_predictions else []
            },
            "analysis_scope": "Comprehensive medical analysis without confidence-based decisions"
        }
        
        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id,
            {
                "diseases_analyzed": prediction_count,
                "max_confidence": max_confidence,
                "analysis_complete": True,
                "context_retrieved": len(medical_context)
            },
            f"Analyzed {prediction_count} diseases with comprehensive medical reasoning. Max confidence: {max_confidence:.2f}"
        )
        
        print(f"✅ ORCHESTRATOR NODE COMPLETED - Analysis complete")
        print(f"   Max confidence: {max_confidence:.2f} (informational only)")
        print(f"   Medical context retrieved: {len(medical_context)} references")

        # Properly merge state while preserving all existing data
        existing_reasoning = state.get("reasoning_steps", [])
        existing_agent_outputs = state.get("agent_outputs", {})
        existing_vector_usage = state.get("vector_db_usage", [])
        
        return {
        **state,  # Preserve all existing state
        "current_step": "orchestration_complete",
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
        current_step = state.get("current_step", "")

        print(f"🔄 QUESTIONING NODE STARTED - Total questions to generate: {max_questions}")
        print(f"   Current step: {current_step}")
        
         # Check if we're in response processing mode
        if current_step in ["responses_ready_for_processing", "all_responses_received"]:
            print("❌ QUESTIONING NODE SKIPPED - Responses are being processed")
            return {
                **state,
                "current_step": "questioning_skipped_for_processing",
                "reasoning_steps": state.get("reasoning_steps", []) + [{
                    "agent": "questioning",
                    "step": "skipped_for_response_processing",
                    "timestamp": datetime.now().isoformat(),
                    "result": "Skipped questioning as responses are ready for processing"
                }]
            }
        # Start activity tracking
        activity_id = self.activity_tracker.start_activity(
            "questioning", 
            "generating_questions",
            {
                "questions_asked": questions_asked,
                "max_questions": max_questions,
                "questions_to_generate": max_questions
            }
        )

        # Check if we've already generated questions
        if questions_asked > 0 or state.get("clarifying_questions"):
            print(f"Questions already generated or asked: {questions_asked}")
            
            self.activity_tracker.complete_activity(
                activity_id,
                {"questions_generated": 0, "reason": "already_generated"},
                "Questions already generated in previous step"
            )
            
            return {
                **state,
                "current_step": "questions_already_generated",
                "needs_more_questions": False,
                "reasoning_steps": state.get("reasoning_steps", []) + [{
                    "agent": "questioning",
                    "step": "questions_already_exist",
                    "timestamp": datetime.now().isoformat(),
                    "result": "Questions already generated",
                    "questions_asked": questions_asked
                }],
                "real_time_activities": self.activity_tracker.get_current_activities()
            }
        
        # Get orchestrator's analysis for context 
        orchestrator_analysis = None
        reasoning_steps = state.get("reasoning_steps", [])
        for step in reasoning_steps:
            if step.get("agent") == "orchestrator":
                orchestrator_analysis = step.get("medical_analysis", {})
                break
        
        # Enhanced prompt with orchestrator context
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Questioning Specialist. Generate ALL {max_questions}  clarifying questions at once
            to improve diagnostic accuracy.

            CURRENT CASE:
            Initial predictions: {initial_predictions}
            Selected symptoms: {selected_symptoms}
            
            ORCHESTRATOR ANALYSIS CONTEXT:
            {orchestrator_context}
            
            INSTRUCTIONS:
            Generate exactly {max_questions} high-priority yes/no questions that:
            1. Cover different aspects of the predicted diseases
            2. Would help confirm or rule out the predicted diseases
            3. Focus on the missing clinical information identified by the orchestrator
            4. Target the most diagnostically significant symptoms
            5. Provide comprehensive coverage for differential diagnosis
            
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
            
            Focus on symptoms that would help differentiate between the top predicted diseases and
            Generate questions that comprehensively cover all major differential diagnoses.
            """),
            ("human", "Generate ALL {max_questions} clarifying questions based on the orchestrator's analysis for comprehensive diagnosis")
        ])
        
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
            max_questions=max_questions,
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
            print("Generating fallback questions")
            for i in range(max_questions):
                questions.append({
                    "id": f"q{i+1}",
                    "question": f"Clarifying question {i+1} about your symptoms?",
                    "question_text": f"Clarifying question {i+1} about your symptoms?",
                    "related_disease": "General",
                    "symptom_checking": "general symptoms",
                    "priority": i+1,
                    "type": "yes_no",
                    "required": True
                })

        print(f"Final questions generated: {len(questions)} questions")
        for q in questions:
            print(f"  - {q['question_text']}")
        
        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id,
            {
                "questions_generated": len(questions),
                "all_questions_generated": True
            },
            f"Generated all {len(questions)} questions at once for comprehensive diagnosis"
        )
        
        # Create detailed reasoning step
        reasoning_step = {
            "agent": "questioning",
            "step": "all_questions_generation",
            "timestamp": datetime.now().isoformat(),
            "input_context": {
                "max_questions": max_questions,
                "orchestrator_analysis_available": orchestrator_analysis is not None,
                "generation_strategy": "all_at_once"
            },
            "generation_process": {
                "questions_generated": len(questions),
                "question_topics": [q.get("symptom_checking", "") for q in questions],
                "diseases_covered": list(set(q.get("related_disease", "") for q in questions))
            },
            "result": f"Generated ALL {len(questions)} clarifying questions for comprehensive diagnosis"
        }
        
        # Properly preserve all existing state
        existing_reasoning = state.get("reasoning_steps", [])
        existing_agent_outputs = state.get("agent_outputs", {})
        
        return {
            **state,  # Preserve all existing state
            "clarifying_questions": questions,
            "asked_questions": questions,  # Mark all as asked since we're generating them all
            "questions_asked": len(questions),  # Update total count
            "current_step": "all_questions_generated",
            "needs_more_questions": False,  # No more questions needed
            "reasoning_steps": existing_reasoning + [reasoning_step],
            "agent_outputs": {**existing_agent_outputs, "questioning": response.content},
            "real_time_activities": self.activity_tracker.get_current_activities()
        }

    
    def human_input_node(self, state: DiagnosticState) -> DiagnosticState:
        """Human-in-the-loop node for collecting responses"""
        
        user_responses = state.get("user_responses", {})
        questions = state.get("clarifying_questions", [])
        
        print(f"🔄 HUMAN INPUT NODE: {len(questions)} questions, {len(user_responses)} responses")
        print(f"   Current step: {state.get('current_step', 'unknown')}")
        
        # Add reasoning step for transparency
        reasoning_step = {
            "agent": "human_input",
            "step": "processing_user_input",
            "timestamp": datetime.now().isoformat(),
            "questions_presented": len(questions),
            "responses_received": len(user_responses),
            "status": "responses_received" if user_responses else "awaiting_input"
        }
        
        # Properly determine the current step based on responses
        if user_responses and len(user_responses) > 0:
            print("✅ User responses found, marking for processing")
            current_step = "responses_ready_for_processing"
        elif questions and len(questions) > 0:
            print("❓ Questions available, awaiting user input")
            current_step = "awaiting_human_input"
        else:
            print("⚠️ No questions or responses available")
            current_step = "no_questions_needed"
        
        return {
            **state,
            "current_step": current_step,
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
            context_strings = []
            for doc in context:
                if hasattr(doc, 'page_content'):
                    context_strings.append(doc.page_content)
                elif hasattr(doc, 'content'):
                    context_strings.append(doc.content)
                else:
                    context_strings.append(str(doc))
            symptom_disease_context[symptom] = context_strings

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
            context_strings = []
            for doc in medical_context:
                if hasattr(doc, 'page_content'):
                    context_strings.append(doc.page_content)
                elif hasattr(doc, 'content'):
                    context_strings.append(doc.content)
                else:
                    context_strings.append(str(doc))
            medical_validations[disease] = context_strings
            
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
            context_strings = []
            for doc in context:
                if hasattr(doc, 'page_content'):
                    context_strings.append(doc.page_content)
                elif hasattr(doc, 'content'):
                    context_strings.append(doc.content)
                else:
                    context_strings.append(str(doc))
            explanation_context[disease] = context_strings
            
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
        """Evaluate overall confidence - simplified for single question round"""
        print(f"🔄 EVALUATOR NODE STARTED")
        
        questions_asked = state.get("questions_asked", 0)
        max_questions = state.get("max_questions", 5)
        
        print(f"   Questions: {questions_asked}/{max_questions}")
        print(f"   Current step: {state.get('current_step', 'unknown')}")

        # Track activity
        activity_id = self.activity_tracker.start_activity(
            "evaluator", 
            "final_confidence_evaluation",
            {
                "questions_asked": questions_asked,
                "max_questions": max_questions,
                "predictions_count": len(state.get("refined_predictions", state.get("initial_predictions", {})))
            }
        )

        # Since we're doing all questions at once, always proceed to explanation after processing
        current_predictions = state.get("refined_predictions", state.get("initial_predictions", {}))
        
        # Calculate confidence metrics
        max_confidence = 0
        avg_confidence = 0
        if current_predictions:
            confidences = [pred.get("probability", 0) for pred in current_predictions.values()]
            max_confidence = max(confidences)
            avg_confidence = sum(confidences) / len(confidences)

        # Since we're doing single round, always proceed to explanation
        decision = "proceed_to_explanation"
        needs_more_questions = False
        confidence_sufficient = True
        overall_confidence = "High" if max_confidence >= 0.8 else "Medium" if max_confidence >= 0.6 else "Low"
        
        print(f"   SINGLE ROUND COMPLETE: All questions processed, proceeding to explanation")
        
        # Create detailed reasoning step
        reasoning_step = {
            "agent": "evaluator",
            "step": "single_round_evaluation", 
            "timestamp": datetime.now().isoformat(),
            "input_assessment": {
                "questions_asked": questions_asked,
                "max_questions": max_questions,
                "max_confidence": max_confidence,
                "avg_confidence": avg_confidence,
                "predictions_evaluated": len(current_predictions),
                "workflow_type": "single_round_all_questions"
            },
            "evaluation_result": {
                "decision": decision,
                "needs_more_questions": needs_more_questions,
                "confidence_sufficient": confidence_sufficient,
                "overall_confidence": overall_confidence,
                "reasoning": "Single round workflow complete - all questions asked and processed",
                "next_action_justification": "Proceeding to explanation after comprehensive single-round questioning"
            },
            "decision_factors": {
                "workflow_complete": True,
                "all_questions_processed": questions_asked == max_questions,
                "single_round_strategy": True
            }
        }
        
        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id,
            {
                "decision_made": decision,
                "confidence_sufficient": confidence_sufficient,
                "max_confidence_evaluated": max_confidence,
                "workflow_complete": True
            },
            f"Single round complete. Decision: {decision}. Max confidence: {max_confidence:.2f}"
        )
        
        print(f"✅ EVALUATOR NODE COMPLETED - Decision: {decision}")
        print(f"   Single round workflow complete")
        print(f"   Max confidence: {max_confidence:.2f}")
        
        return {
            **state,
            "needs_more_questions": needs_more_questions,
            "confidence_sufficient": confidence_sufficient,
            "evaluator_decision": decision,
            "current_step": "evaluation_complete",
            "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
            "agent_outputs": {**state.get("agent_outputs", {}), "evaluator": f"Single round evaluation complete. Proceeding to explanation with confidence: {overall_confidence}"},
            "real_time_activities": self.activity_tracker.get_current_activities()
        }

