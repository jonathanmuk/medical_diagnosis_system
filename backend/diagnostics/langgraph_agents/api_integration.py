from fastapi import HTTPException
from typing import Dict, Any, List, Optional
from .graph import MedicalDiagnosticGraph
from .state import DiagnosticState
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json

class DiagnosticAPIIntegration:
    def __init__(self, vector_db, gemini_api_key: str):
        self.diagnostic_graph = MedicalDiagnosticGraph(vector_db, gemini_api_key)
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def start_diagnosis(self,
                         symptoms: List[str],
                         patient_info: Optional[Dict[str, Any]] = None,
                         initial_predictions: Optional[Dict[str, Any]] = None,
                         max_questions: int = 5) -> Dict[str, Any]:
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
                None,  # session_id will be auto-generated
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
