from fastapi import HTTPException
from typing import Dict, Any, List, Optional
from .graph import MedicalDiagnosticGraph
from .state import DiagnosticState
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
import time
from datetime import datetime

class DiagnosticAPIIntegration:
    def __init__(self, vector_db, gemini_api_key: str):
        self.diagnostic_graph = MedicalDiagnosticGraph(vector_db, gemini_api_key)
        self.diagnostic_graph.diagnostic_api_ref = self
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.session_reasoning = {}
        self.session_status = {}
        self.session_initialized = {}
        self.session_timestamps = {}
        
    def initialize_session(self, session_id: str):
        """Initialize a session for reasoning tracking"""
        self.session_reasoning[session_id] = []
        self.session_status[session_id] = "initialized"
        self.session_initialized[session_id] = True
        self.session_timestamps[session_id] = time.time()
        print(f"Initialized session {session_id} for reasoning tracking")

    def update_session_reasoning(self, session_id: str, reasoning_steps: List[Dict[str, Any]]):
        """Update reasoning steps for a session"""
        # Ensure session is initialized
        if session_id not in self.session_initialized:
            self.initialize_session(session_id)
            
         # Add timestamps to steps that don't have them
        for step in reasoning_steps:
            if 'timestamp' not in step:
                step['timestamp'] = datetime.now().isoformat()
            if 'id' not in step:
                step['id'] = f"{session_id}_{len(reasoning_steps)}"
            
        self.session_reasoning[session_id] = reasoning_steps
        self.session_timestamps[session_id] = time.time()
        print(f"Updated reasoning steps for session {session_id}: {len(reasoning_steps)} steps")
        
        # Also update in graph if available
        if hasattr(self.diagnostic_graph, 'session_reasoning_steps'):
            self.diagnostic_graph.session_reasoning_steps[session_id] = reasoning_steps

    def add_reasoning_step(self, session_id: str, agent: str, step: str, content: str, details: Dict = None):
        """Add a single reasoning step"""
        if session_id not in self.session_initialized:
            self.initialize_session(session_id)
        
        current_steps = self.session_reasoning.get(session_id, [])
        
        new_step = {
            'id': f"{session_id}_{len(current_steps)}",
            'agent': agent,
            'step': step,
            'content': content if isinstance(content, str) else str(content),
            'timestamp': datetime.now().isoformat(),
            'details': details or {},
            'status': 'completed'
        }
        
        current_steps.append(new_step)
        self.update_session_reasoning(session_id, current_steps)
        return new_step
    
    
    def get_session_reasoning(self, session_id: str) -> List[Dict[str, Any]]:
        """Get reasoning steps for a session"""
        try:
            # Ensure session exists
            if session_id not in self.session_reasoning:
                self.initialize_session(session_id)
                
            # Try to get from graph first
            if hasattr(self.diagnostic_graph, 'get_session_reasoning_steps'):
                graph_steps = self.diagnostic_graph.get_session_reasoning_steps(session_id)
                if graph_steps:
                    self.session_reasoning[session_id] = graph_steps
                    return graph_steps
                    
            # Fallback to local storage
            return self.session_reasoning.get(session_id, [])
        except Exception as e:
            print(f"Error getting session reasoning: {e}")
            return self.session_reasoning.get(session_id, [])
    
    async def start_diagnosis(self,
                         symptoms: List[str],
                         patient_info: Optional[Dict[str, Any]] = None,
                         initial_predictions: Optional[Dict[str, Any]] = None,
                         max_questions: int = 5,
                         session_id: str = None) -> Dict[str, Any]:
        """
        Start a new diagnostic session
        
        Args:
            symptoms: List of initial symptoms
            patient_info: Optional patient information
            initial_predictions: Initial ML model predictions
            max_questions: Maximum number of clarifying questions
            
        Returns:
            Initial diagnostic results or first question
        """
        
        if not symptoms:
            raise HTTPException(status_code=400, detail="At least one symptom is required")
        
        try:
            # Run diagnosis in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self.diagnostic_graph.run_diagnosis,
                symptoms,
                patient_info,
                initial_predictions,  # Pass initial predictions
                session_id,
                max_questions
            )
            
            if "error" in result:
                raise HTTPException(status_code=500, detail=result["error"])
            
            return result
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Diagnostic error: {str(e)}")
    
    async def answer_question(self, 
                            session_id: str, 
                            answer: str) -> Dict[str, Any]:
        """
        Continue diagnostic session with an answer
        
        Args:
            session_id: The diagnostic session ID
            answer: The user's answer to the question
            
        Returns:
            Updated results or next question
        """
        
        if not session_id or not answer:
            raise HTTPException(status_code=400, detail="Session ID and answer are required")
        
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self.diagnostic_graph.continue_with_answer,
                session_id,
                answer
            )
            
            if "error" in result:
                raise HTTPException(status_code=404, detail=result["error"])
            
            return result
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing answer: {str(e)}")
    
    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """
        Get the current status of a diagnostic session
        
        Args:
            session_id: The diagnostic session ID
            
        Returns:
            Session status and history
        """
        
        if not session_id:
            raise HTTPException(status_code=400, detail="Session ID is required")
        
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self.diagnostic_graph.get_session_history,
                session_id
            )
            
            if "error" in result:
                raise HTTPException(status_code=404, detail=result["error"])
            
            return result
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving session: {str(e)}")
    
    async def get_active_sessions(self) -> Dict[str, Any]:
        """Get list of active diagnostic sessions"""
        
        try:
            loop = asyncio.get_event_loop()
            sessions = await loop.run_in_executor(
                self.executor,
                self.diagnostic_graph.list_active_sessions
            )
            
            return {
                "active_sessions": sessions,
                "count": len(sessions)
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error listing sessions: {str(e)}")
    
    def format_diagnostic_response(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Format diagnostic results for API response"""
        
        if result.get("status") == "waiting_for_input":
            return {
                "type": "question",
                "session_id": result["session_id"],
                "question": result["question"],
                "progress": result.get("progress", {}),
                "status": "awaiting_answer"
            }
        
        elif result.get("status") == "completed":
            # Sort paredictions by probability
            predictions = result.get("predictions", {})
            sorted_predictions = sorted(
                predictions.items(),
                key=lambda x: x[1].get("probability", 0),
                reverse=True
            )
            
            return {
                "type": "diagnosis",
                "session_id": result["session_id"],
                "predictions": dict(sorted_predictions),
                "summary": self._create_summary(sorted_predictions),
                "symptoms_analyzed": result.get("symptoms_analyzed", []),
                "questions_asked": result.get("questions_asked", 0),
                "status": "completed",
                "timestamp": result.get("timestamp")
            }
        
        else:
            return result
    
    def _create_summary(self, sorted_predictions: List[tuple]) -> Dict[str, Any]:
        """Create a summary of the diagnostic results"""
        
        if not sorted_predictions:
            return {"message": "No predictions available"}
        
        top_prediction = sorted_predictions[0]
        disease_name = top_prediction[0]
        disease_data = top_prediction[1]
        
        confidence_level = disease_data.get("overall_confidence", {}).get("confidence_level", "Unknown")
        probability = disease_data.get("probability", 0)
        
        summary = {
            "top_prediction": {
                "disease": disease_name,
                "probability": probability,
                "confidence": confidence_level
            },
            "total_conditions_analyzed": len(sorted_predictions),
            "high_confidence_predictions": len([
                p for _, p in sorted_predictions 
                if p.get("overall_confidence", {}).get("confidence_level") == "High"
            ])
        }
        
        # Add recommendation based on confidence
        if confidence_level == "High" and probability > 0.7:
            summary["recommendation"] = "Strong indication - consider medical consultation"
        elif confidence_level == "Medium" or probability > 0.5:
            summary["recommendation"] = "Moderate indication - monitor symptoms and consider medical advice"
        else:
            summary["recommendation"] = "Low confidence - continue monitoring or seek medical advice if symptoms persist"
        
        return summary
    

    def get_new_reasoning_steps(self, session_id: str, since_timestamp: float) -> List[Dict[str, Any]]:
        """Get new reasoning steps since timestamp"""
        try:
            all_steps = self.get_session_reasoning(session_id)
            new_steps = []
            
            for step in all_steps:
                step_time = step.get('timestamp')
                if step_time:
                    try:
                        # Convert ISO timestamp to unix timestamp
                        from datetime import datetime
                        if isinstance(step_time, str):
                            step_timestamp = datetime.fromisoformat(step_time.replace('Z', '+00:00')).timestamp()
                        else:
                            step_timestamp = float(step_time)
                        
                        if step_timestamp > since_timestamp:
                            new_steps.append(step)
                    except (ValueError, TypeError):
                        # If timestamp parsing fails, include the step
                        new_steps.append(step)
            
            return new_steps
        except Exception as e:
            print(f"Error getting new reasoning steps: {e}")
            return []

    def is_session_complete(self, session_id: str) -> bool:
        """Check if a session is complete"""
        try:
            session_history = self.diagnostic_graph.get_session_history(session_id)
            if session_history:
                return session_history.get('status') == 'completed'
            return False
        except Exception as e:
            print(f"Error checking session completion: {e}")
            return False
        
    

