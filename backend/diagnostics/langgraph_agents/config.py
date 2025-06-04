"""Configuration for the LangGraph diagnostic system"""
import os
from typing import Dict, Any

class DiagnosticConfig:
    """Configuration class for diagnostic system"""
    
    # LLM Configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    
    # LangSmith Configuration
    LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "true")
    LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
    LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT", "medical-diagnostic-system")
    LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
    
    # Graph Configuration
    MAX_QUESTIONS_DEFAULT = 5
    CHECKPOINT_DB_PATH = os.getenv("CHECKPOINT_DB_PATH", "diagnostic_checkpoints.db")
    
    # Agent Configuration
    AGENT_TEMPERATURE = float(os.getenv("AGENT_TEMPERATURE", "0.1"))
    MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))
    
    # Vector DB Configuration
    VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH", "medical_knowledge.db")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    
    # Diagnostic Thresholds
    HIGH_CONFIDENCE_THRESHOLD = float(os.getenv("HIGH_CONFIDENCE_THRESHOLD", "0.8"))
    MEDIUM_CONFIDENCE_THRESHOLD = float(os.getenv("MEDIUM_CONFIDENCE_THRESHOLD", "0.5"))
    
    @classmethod
    def setup_langsmith(cls):
        """Setup LangSmith environment variables"""
        if cls.LANGCHAIN_API_KEY:
            os.environ["LANGCHAIN_TRACING_V2"] = cls.LANGCHAIN_TRACING_V2
            os.environ["LANGCHAIN_API_KEY"] = cls.LANGCHAIN_API_KEY
            os.environ["LANGCHAIN_PROJECT"] = cls.LANGCHAIN_PROJECT
            os.environ["LANGCHAIN_ENDPOINT"] = cls.LANGCHAIN_ENDPOINT
            return True
        return False
    
    @classmethod
    def validate_config(cls) -> Dict[str, Any]:
        """Validate configuration and return status"""
        
        issues = []
        
        if not cls.GEMINI_API_KEY:
            issues.append("GEMINI_API_KEY not set")
        
        if not cls.LANGCHAIN_API_KEY:
            issues.append("LANGCHAIN_API_KEY not set - LangSmith tracing will be disabled")
        
        if not os.path.exists(os.path.dirname(cls.CHECKPOINT_DB_PATH)):
            issues.append(f"Checkpoint directory does not exist: {os.path.dirname(cls.CHECKPOINT_DB_PATH)}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "langsmith_enabled": cls.LANGCHAIN_API_KEY is not None,
            "config": {
                "gemini_model": cls.GEMINI_MODEL,
                "max_questions": cls.MAX_QUESTIONS_DEFAULT,
                "checkpoint_db": cls.CHECKPOINT_DB_PATH,
                "temperature": cls.AGENT_TEMPERATURE,
                "langsmith_project": cls.LANGCHAIN_PROJECT
            }
        }
