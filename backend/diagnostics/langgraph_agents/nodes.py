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
        
        # Medical context retrieval
        top_disease = max(state["initial_predictions"], key=lambda x: state["initial_predictions"][x]['probability'])
        medical_context = self.vector_db.search(f"Clinical presentation of {top_disease}", k=3)

        prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a Medical Diagnostic Orchestrator. Analyze the situation using this medical context.
        
        MEDICAL CONTEXT:
        {medical_context}
        
        Current predictions: {initial_predictions}
        Selected symptoms: {selected_symptoms}
        
        Provide detailed analysis including:
        1. Which symptoms are most diagnostically significant
        2. What key differentiating symptoms are missing
        3. Which diseases need further investigation and why
        4. Confidence assessment with medical justification
        
        Format your response as:
        ANALYSIS: [detailed medical analysis]
        KEY_SYMPTOMS: [most important symptoms for diagnosis]
        MISSING_INFO: [what information would help differentiate]
        CONFIDENCE_REASONING: [why current confidence is high/medium/low]
        """),
        ("human", "Analyze the diagnostic situation with detailed medical reasoning.")
        ])
        
        # FIX: Include medical_context in format_messages call
        messages = prompt.format_messages(
            medical_context=medical_context,  # This was missing!
            initial_predictions=state["initial_predictions"],
            selected_symptoms=state["selected_symptoms"]
        )
        
        response = self.llm.invoke(messages)
        
        # Parse structured reasoning
        content = response.content
        analysis = self._extract_section(content, "ANALYSIS")
        key_symptoms = self._extract_section(content, "KEY_SYMPTOMS")
        missing_info = self._extract_section(content, "MISSING_INFO")
        confidence_reasoning = self._extract_section(content, "CONFIDENCE_REASONING")
        
        # Determine if we need more questions based on prediction confidence
        max_confidence = 0
        if state["initial_predictions"]:
            max_confidence = max(pred.get("probability", 0) for pred in state["initial_predictions"].values())
        
        # Detailed reasoning step
        detailed_reasoning = {
            "agent": "orchestrator",
            "step": "initial_analysis",
            "timestamp": datetime.now().isoformat(),
            "medical_analysis": analysis,
            "key_symptoms_identified": key_symptoms,
            "missing_information": missing_info,
            "medical_context": medical_context,
            "vector_db_query": f"Clinical presentation of {top_disease}",
            "confidence_reasoning": confidence_reasoning,
            "predictions_analyzed": list(state["initial_predictions"].keys()),
            "decision": "proceed_with_questioning" if max_confidence < 0.8 else "high_confidence_achieved"
        }
        
        needs_more_questions = max_confidence < state.get("confidence_threshold", 0.8)
        
        return {
        **state,
        "current_step": "orchestration_complete",
        "needs_more_questions": max_confidence < state.get("confidence_threshold", 0.8),
        "reasoning_steps": state.get("reasoning_steps", []) + [detailed_reasoning],
        "agent_outputs": {**state.get("agent_outputs", {}), "orchestrator": response.content},
        "vector_db_usage": [{"query": f"Clinical presentation of {top_disease}", "results": medical_context}]  # Track DB usage
    }
        
    def _extract_section(self, content: str, section_name: str) -> str:
        """Extract a specific section from structured LLM response"""
        try:
            start = content.find(f"{section_name}:")
            if start == -1:
                return "Not specified"
            start += len(section_name) + 1
            end = content.find("\n", start)
            if end == -1:
                end = len(content)
            return content[start:end].strip()
        except:
            return "Not specified"
    
    
    @traceable(name="questioning_agent")
    def questioning_node(self, state: DiagnosticState) -> DiagnosticState:
        """Generate clarifying questions based on predictions"""
        
        questions_asked = state.get("questions_asked", 0)
        max_questions = state.get("max_questions", 5)

        # strict less than comparison
        if questions_asked >= max_questions:
            print(f"Question limit reached: {questions_asked}/{max_questions}")
            return {
                **state,
                "clarifying_questions": [],
                "current_step": "questions_limit_reached",
                "needs_more_questions": False,
                "reasoning_steps": state.get("reasoning_steps", []) + [f"Question limit reached ({questions_asked}/{max_questions})"]
            }
        # Calculate remaining questions
        remaining_questions = min(
            max_questions - questions_asked,
            3  # Max 3 questions per round
        )
        
        if remaining_questions <= 0:
            print("No remaining questions allowed")
            return {
                **state,
                "clarifying_questions": [],
                "current_step": "no_more_questions_allowed",
                "needs_more_questions": False,
                "reasoning_steps": state.get("reasoning_steps", []) + ["No more questions needed - limit reached"]
            }
            
        # Get previously asked questions to avoid duplicates
        asked_questions = state.get("asked_questions", [])
        asked_question_texts = {q.get("question_text", "") for q in asked_questions}
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Questioning Specialist. Generate {remaining_questions} clarifying questions 
            to improve diagnostic accuracy for these diseases and symptoms.

            Initial predictions: {initial_predictions}
            Selected symptoms: {selected_symptoms}
            Questions already asked: {questions_asked}
            
            PREVIOUSLY ASKED QUESTIONS (DO NOT REPEAT THESE):
            {previously_asked}
            
            Generate exactly {remaining_questions} high-priority yes/no questions that:
             1. Have NOT been asked before
            2. Would help confirm or rule out the predicted diseases
            3. Focus on different symptoms/aspects than previous questions
            
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
            ("human", "Generate {remaining_questions} NEW clarifying questions that haven't been asked before")
        ])
        
        # Format previously asked questions for the prompt
        previously_asked_text = "\n".join([
            f"- {q.get('question_text', 'Unknown question')}" 
            for q in asked_questions
        ]) if asked_questions else "None"
        
        messages = prompt.format_messages(
            initial_predictions=json.dumps(state["initial_predictions"], indent=2),
            selected_symptoms=state["selected_symptoms"],
            questions_asked=state.get("questions_asked", 0),
            remaining_questions=remaining_questions,
            previously_asked=previously_asked_text,
            start_id=len(asked_questions) + 1
        )
        
        response = self.llm.invoke(messages)  # Remove tools for simpler response
        
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
            return {
                **state,
                "clarifying_questions": [],
                "current_step": "no_more_questions",
                "needs_more_questions": False,
                "reasoning_steps": state.get("reasoning_steps", []) + ["No additional questions could be generated"]
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
        
        reasoning_step = f"Questioning Agent: Generated {len(filtered_questions)} NEW clarifying questions"
        
        return {
            **state,
            "clarifying_questions": filtered_questions,
            "asked_questions": updated_asked_questions, 
            "current_step": "questions_generated",
            "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
            "agent_outputs": {**state.get("agent_outputs", {}), "questioning": response.content}
        }

    
    def human_input_node(self, state: DiagnosticState) -> DiagnosticState:
        """Human-in-the-loop node for collecting responses"""
        
        # This node should process any user responses that were provided
        user_responses = state.get("user_responses", {})
        questions = state.get("clarifying_questions", [])
        
        print(f"Human input node: {len(questions)} questions, {len(user_responses)} responses")
        
        # If we have responses, continue; otherwise wait
        if user_responses and questions:
            # Process the responses
            return {
                **state,
                "current_step": "responses_received"
            }
        else:
            # Wait for human input - ensure we have questions to ask
            if questions:
                return {
                    **state,
                    "current_step": "awaiting_human_input"
                }
            else:
                # No questions available, skip to next step
                return {
                    **state,
                    "current_step": "no_questions_needed"
                }
                
    
    @traceable(name="response_integration_agent")
    def response_integration_node(self, state: DiagnosticState) -> DiagnosticState:
        """Process user responses with detailed medical reasoning"""
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
            
            Provide detailed medical reasoning for each response."""),
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
            diseases=list(state.get("initial_predictions", {}).keys())
        )
        
        response = self.llm_with_tools.invoke(messages)
        
        # Create detailed reasoning
        detailed_reasoning = {
            "agent": "response_integration",
            "step": "processing_user_responses",
            "timestamp": datetime.now().isoformat(),
            "responses_processed": len(qa_pairs),
            "medical_reasoning": response.content,
            "qa_analysis": qa_pairs,
            "symptom_changes": {
                "rationale": "Based on user responses to clarifying questions",
                "medical_logic": response.content
            }
        }
        
        content = response.content
        integration_result = json.loads(content)
        updated_symptoms = integration_result.get("updated_symptoms", state["selected_symptoms"])
        
        # Complete activity tracking
        self.activity_tracker.complete_activity(
            activity_id, 
            {"responses_processed": len(qa_pairs)},
            response.content
        )
        
        return {
            **state,
            "updated_symptoms": updated_symptoms,
            "current_step": "responses_integrated",
            "reasoning_steps": state.get("reasoning_steps", []) + [detailed_reasoning],
            "agent_outputs": {**state.get("agent_outputs", {}), "response_integration": response.content},
            "real_time_activities": self.activity_tracker.get_current_activities()
        }
    
    @traceable(name="refinement_agent")
    def refinement_node(self, state: DiagnosticState) -> DiagnosticState:
        """Refine and re-rank disease predictions based on updated information"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Prediction Refinement Specialist. Re-rank and refine 
            disease predictions based on updated symptom information.
            
            Initial predictions: {initial_predictions}
            Updated symptoms: {updated_symptoms}
            Validation results: {validation_results}
            
            For each disease, calculate:
            1. Updated probability based on symptom match
            2. New confidence level (High/Medium/Low)
            3. Ranking changes
            4. Brief explanation for changes
            
            Use the medical knowledge tools to verify symptom-disease relationships.
            
            Return ONLY a valid JSON object:
            {{
                "Disease1": {{
                    "probability": 0.85,
                    "confidence": "High",
                    "rank_change": "+1",
                    "explanation": "Added symptoms support this diagnosis",
                    "symptom_match_score": 85
                }}
            }}"""),
            ("human", "Refine the disease predictions based on all available information.")
        ])
        
        messages = prompt.format_messages(
            initial_predictions=json.dumps(state["initial_predictions"], indent=2),
            updated_symptoms=state.get("updated_symptoms", state["selected_symptoms"]),
            validation_results=json.dumps(state.get("validation_results", {}), indent=2)
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
            refined_predictions = state["initial_predictions"]
        
        reasoning_step = f"Refinement Agent: Updated {len(refined_predictions)} disease predictions"
        
        return {
            **state,
            "refined_predictions": refined_predictions,
            "current_step": "predictions_refined",
            "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
            "agent_outputs": {**state.get("agent_outputs", {}), "refinement": response.content}
        }
    
    @traceable(name="validation_agent")
    def validation_node(self, state: DiagnosticState) -> DiagnosticState:
        """Validate predictions against medical knowledge"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Knowledge Validator. Cross-reference symptom patterns 
            with established medical knowledge to validate disease predictions.
            
            Current predictions: {predictions}
            Updated symptoms: {symptoms}
            
            For each disease:
            1. Use medical knowledge search to verify typical presentations
            2. Calculate symptom match scores
            3. Determine confidence adjustments (-0.5 to +0.5)
            4. Provide reasoning for adjustments
            
            Use the available medical tools to search for disease information.
            
            Return ONLY a valid JSON object:
            {{
                "Disease1": {{
                    "confidence_adjustment": 0.2,
                    "reasoning": "Symptoms strongly align with typical presentation",
                    "symptom_match_score": 85,
                    "validation_status": "confirmed"
                }}
            }}"""),
            ("human", "Validate the disease predictions against medical knowledge.")
        ])
        
        predictions = state.get("refined_predictions", state["initial_predictions"])
        symptoms = state.get("updated_symptoms", state["selected_symptoms"])
        
        messages = prompt.format_messages(
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
        
        reasoning_step = f"Validation Agent: Validated {len(validation_results)} predictions against medical knowledge"
        
        return {
            **state,
            "validation_results": validation_results,
            "current_step": "predictions_validated",
            "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
            "agent_outputs": {**state.get("agent_outputs", {}), "validation": response.content}
        }
    
    @traceable(name="explanation_agent")
    def explanation_node(self, state: DiagnosticState) -> DiagnosticState:
        """Generate clear explanations for predictions"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Explanation Specialist. Create clear, understandable 
            explanations for disease predictions that patients can understand.
            
            Final predictions: {predictions}
            Patient symptoms: {symptoms}
            Validation results: {validation}
            
            For each disease, create explanations that:
            1. Explain why the disease was predicted
            2. Highlight supporting symptoms
            3. Note any missing typical symptoms
            4. Use simple, non-alarming language
            5. Are informative but reassuring
            
            Return ONLY a valid JSON object:
            {{
                "Disease1": "Clear explanation of why this disease was predicted based on symptoms...",
                "Disease2": "Another clear explanation..."
            }}"""),
            ("human", "Generate patient-friendly explanations for the disease predictions.")
        ])
        
        predictions = state.get("refined_predictions", state["initial_predictions"])
        symptoms = state.get("updated_symptoms", state["selected_symptoms"])
        validation = state.get("validation_results", {})
        
        messages = prompt.format_messages(
            predictions=json.dumps(predictions, indent=2),
            symptoms=symptoms,
            validation=json.dumps(validation, indent=2)
        )
        
        response = self.llm.invoke(messages)
        
        # Parse explanations
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
            
            explanations = json.loads(content)
            
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing explanations: {e}")
            explanations = {}
        
        reasoning_step = f"Explanation Agent: Generated explanations for {len(explanations)} diseases"
        
        return {
            **state,
            "explanations": explanations,
            "current_step": "explanations_generated",
            "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
            "agent_outputs": {**state.get("agent_outputs", {}), "explanation": response.content}
        }
    
    @traceable(name="evaluation_agent")
    def evaluator_node(self, state: DiagnosticState) -> DiagnosticState:
        questions_asked = state.get("questions_asked", 0)
        max_questions = state.get("max_questions", 5)
        
        """Evaluate overall confidence in predictions"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Prediction Evaluator. Assess the overall confidence 
            level for each prediction based on all available information.
            
            Final predictions: {predictions}
            Validation results: {validation}
            Explanations: {explanations}
            Reasoning steps: {reasoning}
            
            For each disease, evaluate:
            1. Overall confidence level (High/Medium/Low)
            2. Justification for confidence level
            3. Any concerns or limitations
            4. Recommendation for next steps
            
            Return ONLY a valid JSON object:
            {{
                "Disease1": {{
                    "confidence_level": "Medium",
                    "justification": "Several symptoms match but some key indicators missing",
                    "concerns": "Limited symptom information",
                    "recommendation": "Consider additional medical evaluation"
                }}
            }}"""),
            ("human", "Evaluate the confidence levels for all disease predictions.")
        ])
        
        predictions = state.get("refined_predictions", state["initial_predictions"])
        validation = state.get("validation_results", {})
        explanations = state.get("explanations", {})
        reasoning = state.get("reasoning_steps", [])
        
        messages = prompt.format_messages(
            predictions=json.dumps(predictions, indent=2),
            validation=json.dumps(validation, indent=2),
            explanations=json.dumps(explanations, indent=2),
            reasoning=reasoning
        )
        
        response = self.llm.invoke(messages)
        
        # Parse confidence scores
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
            
            confidence_scores = json.loads(content)
            
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing confidence scores: {e}")
            confidence_scores = {}
        
        # Determine if we need more questions
        avg_confidence = 0
        high_confidence_count = 0
        
        for disease, scores in confidence_scores.items():
            if scores.get("confidence_level") == "High":
                high_confidence_count += 1
            elif scores.get("confidence_level") == "Medium":
                avg_confidence += 0.5
        
        # Need more questions if no high confidence predictions and haven't reached max questions
        needs_more_questions = (
            high_confidence_count == 0 and 
            questions_asked < max_questions
        )
        
        if questions_asked >= max_questions:
            needs_more_questions = False
        
        reasoning_step = f"Evaluator Agent: Assessed confidence for {len(confidence_scores)} predictions"
        
        return {
            **state,
            "confidence_scores": confidence_scores,
            "needs_more_questions": needs_more_questions,
            "current_step": "evaluation_complete",
            "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
            "agent_outputs": {**state.get("agent_outputs", {}), "evaluator": response.content}
        }

