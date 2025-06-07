from typing import Dict, Any, List
import sqlite3
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.prebuilt import ToolNode
from .state import DiagnosticState
from .nodes import MedicalAgentNodes
from .tools import create_medical_tools
import uuid
from .config import DiagnosticConfig
from datetime import datetime
import os
from langsmith import Client
from langsmith.run_helpers import traceable

class MedicalDiagnosticGraph:
    def __init__(self, vector_db, gemini_api_key: str, db_path: str = "diagnostic_checkpoints.db"):
        self.vector_db = vector_db
        self.gemini_api_key = gemini_api_key
        self.nodes = MedicalAgentNodes(vector_db, gemini_api_key)
        self.tools = create_medical_tools(vector_db)
        
        # Setup LangSmith
        self.langsmith_enabled = DiagnosticConfig.setup_langsmith()
        if self.langsmith_enabled:
            self.langsmith_client = Client()
            print(f"LangSmith tracing enabled for project: {DiagnosticConfig.LANGCHAIN_PROJECT}")
        else:
            self.langsmith_client = None
            print("LangSmith tracing disabled - API key not found")
            
        # Initialize checkpointer for persistence - FIXED
        self.checkpointer = self._create_checkpointer(db_path)
        
        # Build the graph
        self.graph = self._build_graph()
    
    def _create_checkpointer(self, db_path: str):
        """Create SQLite checkpointer with proper connection handling"""
        try:
            # Ensure the directory exists
            os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
            
            # Create a proper SQLite connection
            conn = sqlite3.connect(db_path, check_same_thread=False)
            
            # Use the connection directly instead of connection string
            return SqliteSaver(conn)
        except Exception as e:
            print(f"Warning: Could not create checkpointer: {e}")
            # Return None if checkpointer creation fails
            return None
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        
        # Create the graph
        workflow = StateGraph(DiagnosticState)
        
        # Add nodes
        workflow.add_node("orchestrator", self.nodes.orchestrator_node)
        workflow.add_node("questioning", self.nodes.questioning_node)
        workflow.add_node("human_input", self.nodes.human_input_node)
        workflow.add_node("response_integration", self.nodes.response_integration_node)
        workflow.add_node("validation", self.nodes.validation_node)
        workflow.add_node("refinement", self.nodes.refinement_node)
        workflow.add_node("explanation", self.nodes.explanation_node)
        workflow.add_node("evaluator", self.nodes.evaluator_node)
        
        # Add tool node for medical tools
        workflow.add_node("tools", ToolNode(self.tools))
        
        # Define the workflow edges
        workflow.set_entry_point("orchestrator")
        
        # From orchestrator, decide whether to ask questions or go to validation
        workflow.add_conditional_edges(
            "orchestrator",
            self._should_ask_questions,
            {
                "ask_questions": "questioning",
                "skip_questions": "validation"
            }
        )
        
        # From questioning to human input (with interrupt)
        workflow.add_edge("questioning", "human_input")
        
        # From human input to response integration
        workflow.add_edge("human_input", "response_integration")
        
        # From response integration to validation
        workflow.add_edge("response_integration", "validation")
        
        # Parallel processing: validation and refinement can run in parallel
        workflow.add_edge("validation", "refinement")
        
        # From refinement to explanation
        workflow.add_edge("refinement", "explanation")
        
        # From explanation to evaluator
        workflow.add_edge("explanation", "evaluator")
        
        # From evaluator, decide whether to ask more questions or end
        workflow.add_conditional_edges(
            "evaluator",
            self._should_continue,
            {
                "continue": "questioning",
                "end": END
            }
        )
        
        # Compile the graph with or without checkpointer
        compile_kwargs = {}
        if self.checkpointer is not None:
            compile_kwargs["checkpointer"] = self.checkpointer
            compile_kwargs["interrupt_before"] = ["human_input"]
        
        return workflow.compile(**compile_kwargs)
    
    def _should_ask_questions(self, state: DiagnosticState) -> str:
        """Determine if we should ask clarifying questions"""
        return "ask_questions" if state.get("needs_more_questions", True) else "skip_questions"
    
    def _should_continue(self, state: DiagnosticState) -> str:
        """Determine if we should continue with more questions or end"""
        needs_more = state.get("needs_more_questions", False)
        questions_asked = state.get("questions_asked", 0)
        max_questions = state.get("max_questions", 5)
        
        # More explicit conditions
        if questions_asked >= max_questions:
            print(f"Ending: Question limit reached ({questions_asked}/{max_questions})")
            return "end"
        
        if not needs_more:
            print(f"Ending: No more questions needed")
            return "end"
        
        print(f"Continuing: {questions_asked}/{max_questions} questions asked, needs_more={needs_more}")
        return "continue"
        
    @traceable(name="diagnostic_workflow")
    def run_diagnosis(self,
                  symptoms: List[str],
                  patient_info: Dict[str, Any] = None,
                  initial_predictions: Dict[str, Any] = None,
                  session_id: str = None,
                  max_questions: int = 5) -> Dict[str, Any]:
        """Run the complete diagnostic workflow"""
        
        if session_id is None:
            session_id = str(uuid.uuid4())
            
        # Add metadata for tracing
        trace_metadata = {
            "session_id": session_id,
            "num_symptoms": len(symptoms),
            "num_predictions": len(initial_predictions) if initial_predictions else 0,
            "max_questions": max_questions,
            "patient_age": patient_info.get("age") if patient_info else None
        }
        
        # Initialize state
        initial_state = {
            "selected_symptoms": symptoms,
            "patient_info": patient_info or {},
            "initial_predictions": initial_predictions or {},
            "session_id": session_id,
            "max_questions": max_questions,
            "questions_asked": 0,
            "current_step": "initialized",
            "reasoning_steps": [],
            "agent_outputs": {},
            "timestamp": datetime.now().isoformat(),
            "messages": [],
            "confidence_threshold": 0.8,
            "needs_more_questions": True,
            "clarifying_questions": [],
            "user_responses": {},
            "updated_symptoms": symptoms
        }
        
        config = {
            "configurable": {
                "thread_id": session_id
            },
            "metadata": trace_metadata
        } if self.checkpointer else {"metadata": trace_metadata}
        
        try:
            # Run the graph and collect all states
            final_state = None
            
            for state in self.graph.stream(initial_state, config):
                final_state = state
                print(f"Current state keys: {list(state.keys()) if isinstance(state, dict) else 'Not a dict'}")
                
                # Check if we're at a human input interrupt
                if self._is_waiting_for_input(state):
                    print("Detected waiting for input state")
                    return self._format_question_response(state, session_id)
            
            # If we get here, check if we have an interrupt state
            if self.checkpointer:
                current_state = self.graph.get_state(config)
                if current_state and current_state.next:
                    # We're at an interrupt point
                    print(f"At interrupt point. Next: {current_state.next}")
                    if 'human_input' in current_state.next:
                        return self._format_question_response(current_state.values, session_id)
            
            # Workflow completed normally
            print(f"Workflow completed. Final state keys: {list(final_state.keys()) if final_state else 'None'}")
            return self._format_results(final_state)
            
        except Exception as e:
            print(f"Error in diagnostic workflow: {e}")
            import traceback
            traceback.print_exc()
            return {
                "error": str(e),
                "session_id": session_id,
                "partial_results": initial_state
            }
    
    def _format_question_response(self, state: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        """Format response when waiting for human input"""
        # Handle different possible state structures
        state_data = {}
        questions = []
        
        if isinstance(state, dict):
            # Case 1: Direct state data
            if "clarifying_questions" in state:
                state_data = state
                questions = state.get("clarifying_questions", [])
            else:
                # Case 2: Nested state data (from graph stream)
                # Look for state data in nested structure
                for key, value in state.items():
                    if isinstance(value, dict) and "clarifying_questions" in value:
                        state_data = value
                        questions = value.get("clarifying_questions", [])
                        break
                
                # If still not found, check for the most recent node output
                if not questions:
                    possible_keys = ['questioning', 'orchestrator', 'human_input']
                    for key in possible_keys:
                        if key in state and isinstance(state[key], dict):
                            node_state = state[key]
                            if "clarifying_questions" in node_state:
                                state_data = node_state
                                questions = node_state.get("clarifying_questions", [])
                                break
        
        print(f"Formatting question response. Found {len(questions)} questions")
        print(f"State data keys: {list(state_data.keys()) if state_data else 'No state data'}")
        
        # CHECK: If no questions found and we've reached max questions, return completion signal
        questions_asked = state_data.get("questions_asked", 0)
        max_questions = state_data.get("max_questions", 5)
    
        if not questions and questions_asked >= max_questions:
            print(f"No questions found and max questions reached ({questions_asked}/{max_questions}). Signaling completion.")
            return {
                "type": "diagnosis_ready",
                "session_id": session_id,
                "message": "All questions completed, proceeding to final diagnosis",
                "questions_asked": questions_asked,
                "max_questions": max_questions,
                "status": "proceeding_to_diagnosis"
            }
    
        # Ensure all questions have proper structure
        formatted_questions = []
        for i, q in enumerate(questions):
            if isinstance(q, dict):
                formatted_q = {
                    "id": q.get("id", f"q{i+1}"),
                    "question": q.get("question_text", q.get("question", "Please provide more information.")),
                    "question_text": q.get("question_text", q.get("question", "Please provide more information.")),
                    "type": q.get("type", "yes_no"),
                    "related_disease": q.get("related_disease", ""),
                    "symptom_checking": q.get("symptom_checking", ""),
                    "priority": q.get("priority", 1),
                    "required": q.get("required", True)
                }
                formatted_questions.append(formatted_q)
                print(f"Formatted question {i+1}: {formatted_q['question_text']}")
            else:
                # Handle case where question is just a string
                formatted_q = {
                    "id": f"q{i+1}",
                    "question": str(q),
                    "question_text": str(q),
                    "type": "yes_no",
                    "related_disease": "",
                    "symptom_checking": "",
                    "priority": 1,
                    "required": True
                }
                formatted_questions.append(formatted_q)
                print(f"Formatted string question {i+1}: {str(q)}")
        
        # If no questions were formatted, let the workflow complete
        if not formatted_questions:
            print("No questions found, allowing workflow to complete")
            return {
                "type": "no_more_questions",
                "session_id": session_id,
                "message": "No additional questions needed",
                "questions_asked": questions_asked,
                "max_questions": max_questions,
                "status": "completing_diagnosis"
            }
        
        progress = {
            "questions_asked": state_data.get("questions_asked", 0),
            "max_questions": state_data.get("max_questions", 5),
            "current_step": state_data.get("current_step", "unknown")
        }
        
        print(f"Returning {len(formatted_questions)} formatted questions")
        
        return {
            "type": "question",
            "session_id": session_id,
            "questions": formatted_questions,
            "progress": progress,
            "status": "waiting_for_input",
        }

    
    @traceable(name="continue_diagnosis")
    def continue_with_answer(self, session_id: str, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Continue the diagnostic workflow with a human answer"""
        
        if not self.checkpointer:
            return {"error": "Session persistence not available"}
        
        config = {
            "configurable": {
                "thread_id": session_id
            },
            "metadata": {
                "session_id": session_id,
                "num_answers": len(answers) if isinstance(answers, dict) else 1,
                "continuation": True
            }
        }
        
        try:
            # Get current state
            current_state = self.graph.get_state(config)
            if current_state is None:
                return {"error": "Session not found"}
            
            print(f"Current state before answer: {current_state.values.keys() if current_state.values else 'No values'}")
            
            # Calculate number of answers provided
            num_answers = len(answers) if isinstance(answers, dict) else 1
            
            # Ensure we have a proper state structure
            state_values = current_state.values or {}
            
            # Initialize missing keys if needed
            state_values.setdefault("clarifying_questions", [])
            state_values.setdefault("user_responses", {})
            state_values.setdefault("questions_asked", 0)
            state_values.setdefault("current_step", "response_received")
            
            # Update state with the human answers
            new_questions_asked = state_values.get("questions_asked", 0) + len(answers)
            
            updated_values = {
            **current_state.values,
            "user_responses": answers, 
            "questions_asked": new_questions_asked,
            "current_step": "response_received"
            }
            
            # CHECK: If we've reached max questions, force completion
            max_questions = updated_values.get("max_questions", 5)
            if new_questions_asked >= max_questions:
                print(f"Max questions reached after this answer: {new_questions_asked}/{max_questions}")
                updated_values["needs_more_questions"] = False
                updated_values["current_step"] = "force_completion"
            
            # Continue execution from the interrupt
            final_state = None
            for state in self.graph.stream(updated_values, config):
                final_state = state
                print(f"Continuation state keys: {list(state.keys()) if isinstance(state, dict) else 'Not a dict'}")
                
                # Check if we're waiting for more input
                if self._is_waiting_for_input(state):
                    response = self._format_question_response(state, session_id)
                    # If the response indicates completion, break out and format results
                    if response.get("type") in ["diagnosis_ready", "no_more_questions"]:
                        print("Detected completion signal, proceeding to final results")
                        break
                    return response
            
            # Check if we're still at an interrupt
            if self.checkpointer:
                final_graph_state = self.graph.get_state(config)
                if final_graph_state and final_graph_state.next:
                    if 'human_input' in final_graph_state.next:
                        response = self._format_question_response(final_graph_state.values, session_id)
                        if response.get("type") in ["diagnosis_ready", "no_more_questions"]:
                            print("Final state indicates completion")
                            return self._format_results(final_graph_state.values)
                        return response
            
            return self._format_results(final_state)
            
        except Exception as e:
            print(f"Error continuing diagnostic workflow: {e}")
            import traceback
            traceback.print_exc()
            return {
                "error": str(e),
                "session_id": session_id
            }
    
    def _is_waiting_for_input(self, state: Dict[str, Any]) -> bool:
        """Check if the workflow is waiting for human input"""
        
        # Check for interrupt state
        if "__interrupt__" in state:
            return True
        
        # Check for explicit waiting state
        if isinstance(state, dict):
            # Direct state check
            if state.get("current_step") == "awaiting_human_input":
                return True
            if state.get("clarifying_questions") and not state.get("user_responses"):
                return True
                
            # Check nested state data
            for node_state in state.values():
                if isinstance(node_state, dict):
                    current_step = node_state.get("current_step")
                    if current_step == "awaiting_human_input":
                        return True
                    if current_step == "questions_generated":
                        return True
                    # Also check if we have questions but no responses
                    if (node_state.get("clarifying_questions") and
                        not node_state.get("user_responses")):
                        return True
        
        return False
    
    def _get_progress(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Get current progress information"""
        if isinstance(state, dict):
            for node_state in state.values():
                if isinstance(node_state, dict):
                    return {
                        "questions_asked": node_state.get("questions_asked", 0),
                        "max_questions": node_state.get("max_questions", 5),
                        "current_step": node_state.get("current_step", "unknown"),
                        "reasoning_steps": len(node_state.get("reasoning_steps", []))
                    }
        return {}
    
    def _format_results(self, final_state: Dict[str, Any]) -> Dict[str, Any]:
        if not final_state:
            return {"error": "No final state available"}

        # Debug logging
        print(f"Formatting final results. State keys: {list(final_state.keys())}")

        # Extract data from all relevant nodes
        state_data = {}
        node_keys = ['evaluator', 'explanation', 'refinement', 'validation', 'response_integration']

        for key in node_keys:
            if key in final_state and isinstance(final_state[key], dict):
                print(f"Found data in {key} node")
                state_data.update(final_state[key])

        # If still no data, try direct extraction
        if not state_data:
            state_data = final_state
            print("Using direct state data")

        # Extract all components
        predictions = state_data.get("refined_predictions",
                                state_data.get("initial_predictions", {}))
        validation_results = state_data.get("validation_results", {})
        explanations = state_data.get("explanations", {})
        confidence_scores = state_data.get("confidence_scores", {})
        reasoning_steps = state_data.get("reasoning_steps", [])
        agent_outputs = state_data.get("agent_outputs", {})

        print(f"Extracted: {len(predictions)} predictions, {len(explanations)} explanations, {len(reasoning_steps)} reasoning steps")

        # Create comprehensive results
        final_predictions = {}
        for disease, prediction_data in predictions.items():
            if isinstance(prediction_data, dict):
                probability = prediction_data.get("probability", 0)
                confidence = prediction_data.get("confidence", "Unknown")
            else:
                probability = float(prediction_data) if prediction_data else 0
                confidence = "High" if probability > 0.8 else "Medium" if probability > 0.5 else "Low"

            final_predictions[disease] = {
                "probability": probability,
                "confidence": confidence,
                "explanation": explanations.get(disease, f"Based on symptom analysis, there is a {probability:.1%} likelihood of {disease}."),
                "validation": validation_results.get(disease, {}),
                "overall_confidence": confidence_scores.get(disease, {})
            }

        result = {
            "type": "diagnosis",
            "session_id": state_data.get("session_id"),
            "predictions": final_predictions,
            "symptoms_analyzed": state_data.get("updated_symptoms",
                                            state_data.get("selected_symptoms", [])),
            "questions_asked": state_data.get("questions_asked", 0),
            "reasoning_steps": reasoning_steps,  # Make sure this is included
            "agent_outputs": agent_outputs,      # Include detailed agent outputs
            "timestamp": state_data.get("timestamp"),
            "status": "completed",
            "prediction_complete": True,
            "transparency": {  # Add transparency section
                "workflow_steps": len(reasoning_steps),
                "agents_involved": list(agent_outputs.keys()),
                "decision_process": reasoning_steps,
                "detailed_outputs": agent_outputs
            },
            "summary": {
                "total_diseases_analyzed": len(final_predictions),
                "questions_asked": state_data.get("questions_asked", 0),
                "confidence_level": "High" if any(p.get("confidence") == "High" for p in final_predictions.values()) else "Medium",
                "reasoning_transparency": f"{len(reasoning_steps)} decision steps recorded"
            }
        }

        print(f"Final result type: {result['type']}, predictions: {len(result['predictions'])}, reasoning steps: {len(result['reasoning_steps'])}")
        return result

    
    def get_session_history(self, session_id: str) -> Dict[str, Any]:
        """Get the history of a diagnostic session"""
        if not self.checkpointer:
            return {"error": "Session persistence not available"}
        
        config = {
            "configurable": {
                "thread_id": session_id
            }
        }
        
        try:
            state = self.graph.get_state(config)
            if state is None:
                return {"error": "Session not found"}
            
            return {
                "session_id": session_id,
                "current_state": state.values,
                "history": state.config,
                "next_steps": state.next
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def list_active_sessions(self) -> List[str]:
        """List all active diagnostic sessions"""
        try:
            # This would need to be implemented based on the checkpointer's capabilities
            # For now, return empty list
            return []
        except Exception as e:
            print(f"Error listing sessions: {e}")
            return []
