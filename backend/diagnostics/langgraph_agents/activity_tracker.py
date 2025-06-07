from typing import Dict, Any, List
from datetime import datetime
import json

class AgentActivityTracker:
    """Tracks and formats real-time agent activities for user transparency"""
    
    def __init__(self):
        self.activities = []
        self.current_step = None
    
    def start_activity(self, agent_name: str, activity: str, context: Dict[str, Any] = None):
        """Start tracking an agent activity"""
        activity_data = {
            "id": len(self.activities) + 1,
            "agent": agent_name,
            "activity": activity,
            "status": "in_progress",
            "start_time": datetime.now().isoformat(),
            "context": context or {},
            "user_friendly_message": self._generate_user_message(agent_name, activity, context)
        }
        self.activities.append(activity_data)
        self.current_step = activity_data
        return activity_data["id"]
    
    def complete_activity(self, activity_id: int, result: Dict[str, Any], reasoning: str = None):
        """Complete an agent activity with results"""
        for activity in self.activities:
            if activity["id"] == activity_id:
                activity.update({
                    "status": "completed",
                    "end_time": datetime.now().isoformat(),
                    "result": result,
                    "reasoning": reasoning,
                    "duration": self._calculate_duration(activity["start_time"])
                })
                break
    
    def _generate_user_message(self, agent: str, activity: str, context: Dict[str, Any]) -> str:
        """Generate user-friendly messages for agent activities"""
        messages = {
            ("orchestrator", "analyzing_symptoms"): f"🔍 Analyzing your symptoms against {len(context.get('disease_db_references', []))} medical references...",
            ("questioning", "generating_questions"): f"❓ Preparing {context.get('num_questions', 'some')} clarifying questions...",
            ("response_integration", "processing_answers"):f"🔄 Updating diagnosis based on your {context.get('num_responses', 0)} answers...",
            ("validation", "checking_medical_knowledge"): f"📚 Cross-referencing with medical knowledge base...",
            ("refinement", "updating_predictions"): f"🔄 Refining disease predictions based on your answers...",
            ("explanation", "generating_explanations"): f"📝 Preparing clear explanations for {len(context.get('diseases', []))} conditions...",
            ("evaluator", "assessing_confidence"):f"⚖️ Evaluating confidence for {len(context.get('diseases', []))} potential conditions..."
        }
        
        return messages.get((agent, activity), f"🤖 {agent.title()} is working on your diagnosis...")
    
    def _calculate_duration(self, start_time: str) -> float:
        """Calculate activity duration in seconds"""
        try:
            start = datetime.fromisoformat(start_time)
            return (datetime.now() - start).total_seconds()
        except:
            return 0.0
    
    def get_current_activities(self) -> List[Dict[str, Any]]:
        """Get all activities for real-time display"""
        return self.activities
    
    def get_summary(self) -> Dict[str, Any]:
        """Get activity summary"""
        completed = [a for a in self.activities if a["status"] == "completed"]
        return {
            "total_activities": len(self.activities),
            "completed_activities": len(completed),
            "total_duration": sum(a.get("duration", 0) for a in completed),
            "agents_involved": list(set(a["agent"] for a in self.activities))
        }
    
