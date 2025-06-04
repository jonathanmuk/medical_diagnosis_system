from typing import List, Dict, Any
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from ..vector_db import MedicalKnowledgeDB

class MedicalSearchInput(BaseModel):
    query: str = Field(description="Medical query to search for")
    k: int = Field(default=5, description="Number of results to return")

class SymptomAnalysisInput(BaseModel):
    symptoms: List[str] = Field(description="List of symptoms to analyze")
    disease: str = Field(description="Disease to check symptoms against")

class MedicalTools:
    def __init__(self, vector_db: MedicalKnowledgeDB):
        self.vector_db = vector_db
    
    @tool("medical_knowledge_search", args_schema=MedicalSearchInput)
    def search_medical_knowledge(query: str, k: int = 5) -> str:
        """Search medical knowledge database for information about diseases, symptoms, and treatments."""
        docs = vector_db.search(query, k=k)
        return "\n".join([f"Source: {doc.metadata.get('source', 'unknown')}\nContent: {doc.page_content}\n---" for doc in docs])
    
    @tool("symptom_disease_matcher", args_schema=SymptomAnalysisInput)
    def match_symptoms_to_disease(symptoms: List[str], disease: str) -> Dict[str, Any]:
        """Analyze how well symptoms match a specific disease."""
        # Search for disease-specific information
        disease_info = vector_db.search(f"Disease: {disease} symptoms", k=3)
        
        # Extract known symptoms for the disease
        known_symptoms = []
        for doc in disease_info:
            if "Symptoms:" in doc.page_content:
                symptom_text = doc.page_content.split("Symptoms:")[1].split("\n")[0]
                known_symptoms.extend([s.strip().lower() for s in symptom_text.split(",")])
        
        # Calculate match score
        user_symptoms_lower = [s.lower() for s in symptoms]
        matches = sum(1 for symptom in user_symptoms_lower if any(known in symptom or symptom in known for known in known_symptoms))
        match_score = (matches / len(known_symptoms)) * 100 if known_symptoms else 0
        
        return {
            "disease": disease,
            "match_score": match_score,
            "matched_symptoms": matches,
            "total_known_symptoms": len(known_symptoms),
            "known_symptoms": known_symptoms[:10]  # Limit for brevity
        }
    
    @tool("disease_precautions_lookup")
    def get_disease_precautions(disease: str) -> List[str]:
        """Get precautions for a specific disease."""
        precaution_docs = vector_db.search(f"Disease: {disease} precautions", k=2)
        precautions = []
        
        for doc in precaution_docs:
            if "Precautions:" in doc.page_content:
                precaution_text = doc.page_content.split("Precautions:")[1].split("\n")[0]
                precautions.extend([p.strip() for p in precaution_text.split(",") if p.strip()])
        
        return precautions[:5]  # Return top 5 precautions

# Initialize tools with vector database
def create_medical_tools(vector_db: MedicalKnowledgeDB) -> List:
    tools = MedicalTools(vector_db)
    return [
        tools.search_medical_knowledge,
        tools.match_symptoms_to_disease,
        tools.get_disease_precautions
    ]
