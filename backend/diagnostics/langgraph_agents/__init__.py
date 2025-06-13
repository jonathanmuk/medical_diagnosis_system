"""
Medical Diagnostic System - LangGraph Agents Package
"""

# Make the package importable
__version__ = "1.0.0"
__author__ = "Medical Diagnostic System"

# Import main components for easier access
try:
    from .graph import MedicalDiagnosticGraph
    from .state import DiagnosticState
    from .studio_app import graph
    
    __all__ = [
        'MedicalDiagnosticGraph',
        'DiagnosticState', 
        'graph'
    ]
except ImportError as e:
    print(f"Warning: Could not import all components: {e}")
    __all__ = []