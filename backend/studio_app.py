"""
LangGraph Studio entry point for Medical Diagnostic System
Place this file in your backend/ directory (same level as langgraph.json)
"""

import os
import sys
from typing import Dict, Any, List

# Add the current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from diagnostics.langgraph_agents.graph import MedicalDiagnosticGraph
    from diagnostics.langgraph_agents.state import DiagnosticState
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running from the backend directory")
    print("Current directory:", os.getcwd())
    print("Python path:", sys.path[:3])  # Show first 3 entries
    raise

class MockVectorDB:
    """Mock vector database for studio visualization"""
    def __init__(self):
        self.data = {
            "symptoms": ["headache", "fever", "fatigue", "chest_pain", "shortness_of_breath"],
            "diseases": ["flu", "migraine", "heart_attack", "anxiety", "covid"],
            "treatments": ["rest", "medication", "surgery", "therapy"]
        }
    
    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """Mock search method with realistic medical data"""
        results = []
        for i in range(min(top_k, 3)):
            results.append({
                "content": f"Medical knowledge: {query} - Information {i+1}",
                "score": 0.9 - (i * 0.1),
                "metadata": {"source": f"medical_db_{i+1}", "type": "symptom_info"}
            })
        return results
    
    def get_similar_symptoms(self, symptoms: List[str]) -> List[Dict]:
        """Mock similar symptoms method"""
        similar = []
        for symptom in symptoms:
            similar.append({
                "symptom": f"Related to {symptom}",
                "score": 0.8,
                "frequency": 0.6
            })
        return similar
    
    def get_disease_info(self, disease: str) -> Dict:
        """Mock disease information"""
        return {
            "name": disease,
            "symptoms": ["symptom1", "symptom2", "symptom3"],
            "prevalence": 0.1,
            "description": f"Medical information about {disease}"
        }

def create_graph():
    """Create and return the medical diagnostic graph for LangGraph Studio"""
    
    # Get environment variables
    gemini_api_key = os.getenv("GEMINI_API_KEY", "test-key-for-studio")
    
    # Create mock vector database
    mock_vector_db = MockVectorDB()
    
    # Initialize the graph
    try:
        diagnostic_graph = MedicalDiagnosticGraph(
            vector_db=mock_vector_db,
            gemini_api_key=gemini_api_key,
            db_path="studio_diagnostic_checkpoints.db"
        )
        print("✅ Medical diagnostic graph created successfully")
        return diagnostic_graph.graph
    except Exception as e:
        print(f"❌ Error creating graph: {e}")
        raise

# Create the graph instance for LangGraph Studio
try:
    graph = create_graph()
    print("🎯 Graph ready for LangGraph Studio")
except Exception as e:
    print(f"Failed to create graph: {e}")
    # Create a minimal fallback graph for debugging
    from langgraph.graph import StateGraph, END
    from diagnostics.langgraph_agents.state import DiagnosticState
    
    def dummy_node(state):
        return {"current_step": "dummy"}
    
    fallback_graph = StateGraph(DiagnosticState)
    fallback_graph.add_node("dummy", dummy_node)
    fallback_graph.set_entry_point("dummy")
    fallback_graph.add_edge("dummy", END)
    graph = fallback_graph.compile()
    print("🔧 Using fallback graph for debugging")

# Sample inputs for testing
sample_inputs = {
    "basic_diagnosis": {
        "selected_symptoms": ["headache", "fever", "fatigue"],
        "patient_info": {"age": 35, "gender": "male"},
        "initial_predictions": {
            "flu": {"probability": 0.7, "confidence": "medium"},
            "migraine": {"probability": 0.3, "confidence": "low"}
        },
        "session_id": "studio_test_001",
        "max_questions": 3,
        "questions_asked": 0,
        "current_step": "initialized",
        "reasoning_steps": [],
        "agent_outputs": {},
        "messages": [],
        "confidence_threshold": 0.8,
        "needs_more_questions": True,
        "clarifying_questions": [],
        "user_responses": {},
        "updated_symptoms": ["headache", "fever", "fatigue"],
        "timestamp": "2024-01-01T00:00:00"
    }
}

if __name__ == "__main__":
    print("Medical Diagnostic Graph for LangGraph Studio")
    print(f"Current directory: {os.getcwd()}")
    print(f"Graph type: {type(graph)}")
    print("Available sample inputs:", list(sample_inputs.keys()))
    
    # Test the graph
    try:
        result = graph.invoke(sample_inputs["basic_diagnosis"])
        print("✅ Graph test successful")
    except Exception as e:
        print(f"⚠️ Graph test failed: {e}")