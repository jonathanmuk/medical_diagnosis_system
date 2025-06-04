from typing import List, Dict, Any, Optional, Annotated
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
import operator

class DiagnosticState(TypedDict):
    """Main state schema for the diagnostic workflow"""
    # Input data
    patient_info: Dict[str, Any]
    selected_symptoms: List[str]
    
    # ML Model predictions
    initial_predictions: Dict[str, Any]
    
    # Agent outputs
    clarifying_questions: List[Dict[str, Any]]
    user_responses: Dict[str, Any]
    updated_symptoms: List[str]
    refined_predictions: Dict[str, Any]
    validation_results: Dict[str, Any]
    explanations: Dict[str, Any]
    confidence_scores: Dict[str, Any]
    
    # Workflow control
    current_step: str
    confidence_threshold: float
    max_questions: int
    questions_asked: int
    needs_more_questions: bool
    
    # Reasoning and transparency
    reasoning_steps: List[str]
    agent_outputs: Dict[str, Any]
    
    # Messages for LLM interactions
    messages: Annotated[List[BaseMessage], add_messages]
    
    # Metadata
    session_id: str
    user_id: Optional[str]
    timestamp: str

class QuestionSchema(BaseModel):
    """Schema for clarifying questions"""
    id: str
    question_text: str
    question_type: str = "yes_no"
    related_disease: str
    symptom_checking: str
    priority: int = 1
    required: bool = True

class PredictionSchema(BaseModel):
    """Schema for disease predictions"""
    disease_name: str
    probability: float = Field(ge=0.0, le=1.0)
    confidence: str = Field(pattern="^(High|Medium|Low)$")
    description: str
    precautions: List[str]
    symptom_match_score: float = Field(ge=0.0, le=100.0)
    reasoning: str

class ValidationSchema(BaseModel):
    """Schema for validation results"""
    disease_name: str
    confidence_adjustment: float = Field(ge=-0.5, le=0.5)
    reasoning: str
    symptom_match_score: float = Field(ge=0.0, le=100.0)
    validation_status: str
