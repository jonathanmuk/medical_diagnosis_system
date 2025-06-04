"""
Example usage of the LangGraph-based diagnostic system
"""

import asyncio
from .api_integration import DiagnosticAPIIntegration
from ..vector_db import VectorDB
import os

async def example_diagnostic_session():
    """Example of a complete diagnostic session"""
    
    # Initialize the system
    vector_db = VectorDB()  # Assume this is properly initialized
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    
    diagnostic_api = DiagnosticAPIIntegration(vector_db, gemini_api_key)
    
    # Start diagnosis with initial symptoms
    print("Starting diagnostic session...")
    initial_symptoms = ["headache", "fever", "fatigue"]
    
    result = await diagnostic_api.start_diagnosis(
        symptoms=initial_symptoms,
        patient_info={"age": 30, "gender": "female"},
        max_questions=3
    )
    
    print(f"Initial result: {result}")
    
    # If we get a question, answer it
    if result.get("status") == "waiting_for_input":
        session_id = result["session_id"]
        question = result["question"]
        
        print(f"Question: {question}")
        
        # Simulate answering the question
        answer = "Yes, I have been experiencing nausea"
        
        result = await diagnostic_api.answer_question(session_id, answer)
        print(f"After first answer: {result}")
        
        # Continue if there are more questions
        while result.get("status") == "waiting_for_input":
            question = result["question"]
            print(f"Next question: {question}")
            
            # Simulate more answers
            answer = "No, I don't have a rash"
            result = await diagnostic_api.answer_question(session_id, answer)
            print(f"After answer: {result}")
    
    # Final results
    if result.get("status") == "completed":
        print("\n=== Final Diagnostic Results ===")
        predictions = result.get("predictions", {})
        
        for disease, data in predictions.items():
            print(f"\nDisease: {disease}")
            print(f"Probability: {data.get('probability', 0):.2%}")
            print(f"Confidence: {data.get('confidence', 'Unknown')}")
            print(f"Explanation: {data.get('explanation', 'No explanation')}")
    
    return result

def test_diagnostic_workflow():
    """Test the diagnostic workflow"""
    
    # Run the example
    result = asyncio.run(example_diagnostic_session())
    
    # Validate results
    assert "session_id" in result
    assert "predictions" in result or "question" in result
    
    print("Diagnostic workflow test completed successfully!")

if __name__ == "__main__":
    test_diagnostic_workflow()
