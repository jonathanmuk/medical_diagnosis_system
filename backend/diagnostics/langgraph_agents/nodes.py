from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from .state import DiagnosticState, QuestionSchema, PredictionSchema
from .tools import create_medical_tools
import json
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
        
    @traceable(name="orchestrator_agent")
    def orchestrator_node(self, state: DiagnosticState) -> DiagnosticState:
        """Orchestrator agent that coordinates the diagnostic process"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Diagnostic Orchestrator with years of experience 
            in analyzing symptoms and coordinating diagnostic processes. Your job is to:
            
            1. Analyze initial disease predictions and symptoms
            2. Determine if more information is needed
            3. Set confidence thresholds and workflow parameters
            4. Add reasoning steps for transparency
            
            Current predictions: {initial_predictions}
            Selected symptoms: {selected_symptoms}
            
            Analyze the situation and determine next steps."""),
            ("human", "Please analyze the current diagnostic state and provide coordination guidance.")
        ])
        
        messages = prompt.format_messages(
            initial_predictions=state["initial_predictions"],
            selected_symptoms=state["selected_symptoms"]
        )
        
        response = self.llm.invoke(messages)
        
        # Update state with orchestrator analysis
        reasoning_step = f"Orchestrator Analysis: {response.content}"
        
        # Determine if we need more questions based on prediction confidence
        max_confidence = 0
        if state["initial_predictions"]:
            max_confidence = max(pred.get("probability", 0) for pred in state["initial_predictions"].values())
        
        needs_more_questions = max_confidence < state.get("confidence_threshold", 0.8)
        
        return {
            **state,
            "current_step": "orchestration_complete",
            "needs_more_questions": needs_more_questions,
            "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
            "agent_outputs": {**state.get("agent_outputs", {}), "orchestrator": response.content}
        }
    
    @traceable(name="questioning_agent")
    def questioning_node(self, state: DiagnosticState) -> DiagnosticState:
        """Generate clarifying questions based on predictions"""
        
        # Calculate remaining questions
        remaining_questions = min(
            state.get("max_questions", 5) - state.get("questions_asked", 0),
            3  # Max 3 questions per round
        )
        
        if remaining_questions <= 0:
            return {
                **state,
                "clarifying_questions": [],
                "current_step": "questions_generated",
                "reasoning_steps": state.get("reasoning_steps", []) + ["No more questions needed - limit reached"]
            }
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Medical Questioning Specialist. Generate {remaining_questions} clarifying questions 
            to improve diagnostic accuracy for these diseases and symptoms.

            Initial predictions: {initial_predictions}
            Selected symptoms: {selected_symptoms}
            Questions already asked: {questions_asked}
            
            Generate exactly {remaining_questions} high-priority yes/no questions that would help 
            confirm or rule out the predicted diseases.
            
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
            ("human", "Generate {remaining_questions} clarifying questions for the current diagnostic state.")
        ])
        
        messages = prompt.format_messages(
            initial_predictions=json.dumps(state["initial_predictions"], indent=2),
            selected_symptoms=state["selected_symptoms"],
            questions_asked=state.get("questions_asked", 0),
            remaining_questions=remaining_questions
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
        
        # Fallback: Generate questions programmatically if parsing fails
        if not questions:
            print("Generating fallback questions...")
            top_diseases = list(state["initial_predictions"].keys())[:2]  # Top 2 diseases
            
            fallback_questions = [
                {
                    "id": "q1",
                    "question": "Have you experienced any nausea or vomiting?",
                    "question_text": "Have you experienced any nausea or vomiting?",
                    "type": "yes_no",
                    "related_disease": top_diseases[0] if top_diseases else "General",
                    "symptom_checking": "nausea",
                    "priority": 1,
                    "required": True
                },
                {
                    "id": "q2", 
                    "question": "Do you have any abdominal pain or discomfort?",
                    "question_text": "Do you have any abdominal pain or discomfort?",
                    "type": "yes_no",
                    "related_disease": top_diseases[1] if len(top_diseases) > 1 else "General",
                    "symptom_checking": "abdominal pain",
                    "priority": 1,
                    "required": True
                }
            ]
            
            questions = fallback_questions[:remaining_questions]
        
        print(f"Final questions generated: {len(questions)} questions")
        for q in questions:
            print(f"  - {q['question_text']}")
        
        reasoning_step = f"Questioning Agent: Generated {len(questions)} clarifying questions"
        
        return {
            **state,
            "clarifying_questions": questions,
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
        """Process user responses and update symptom profile"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Response Integration Specialist. Process user responses 
            to clarifying questions and update the symptom profile.
            
            Original symptoms: {selected_symptoms}
            Questions asked: {questions}
            User responses: {user_responses}
            
            Analyze each response and determine:
            1. Which new symptoms to add based on "yes" responses
            2. Which symptoms to remove based on "no" responses  
            3. Updated complete symptom list
            
            Return ONLY a valid JSON object:
            {{
                "updated_symptoms": ["symptom1", "symptom2"],
                "added_symptoms": ["new_symptom"],
                "removed_symptoms": ["removed_symptom"],
                "analysis": "Brief analysis of changes"
            }}"""),
            ("human", "Process the user responses and update the symptom profile.")
        ])
        
        messages = prompt.format_messages(
            selected_symptoms=state["selected_symptoms"],
            questions=json.dumps(state.get("clarifying_questions", []), indent=2),
            user_responses=json.dumps(state.get("user_responses", {}), indent=2)
        )
        
        response = self.llm_with_tools.invoke(messages)
        
        # Parse response integration results
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
            
            integration_result = json.loads(content)
            updated_symptoms = integration_result.get("updated_symptoms", state["selected_symptoms"])
            
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing integration result: {e}")
            updated_symptoms = state["selected_symptoms"]
            integration_result = {"analysis": "Error processing responses"}
        
        reasoning_step = f"Response Integration: {integration_result.get('analysis', 'Processed user responses')}"
        
        return {
            **state,
            "updated_symptoms": updated_symptoms,
                        "current_step": "responses_integrated",
            "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
            "agent_outputs": {**state.get("agent_outputs", {}), "response_integration": response.content}
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
    
    @traceable(name="validation_agent")
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
            state.get("questions_asked", 0) < state.get("max_questions", 5)
        )
        
        reasoning_step = f"Evaluator Agent: Assessed confidence for {len(confidence_scores)} predictions"
        
        return {
            **state,
            "confidence_scores": confidence_scores,
            "needs_more_questions": needs_more_questions,
            "current_step": "evaluation_complete",
            "reasoning_steps": state.get("reasoning_steps", []) + [reasoning_step],
            "agent_outputs": {**state.get("agent_outputs", {}), "evaluator": response.content}
        }

