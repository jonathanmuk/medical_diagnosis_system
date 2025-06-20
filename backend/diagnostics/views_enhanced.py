import json
from rest_framework import status, permissions
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import DiagnosticResult, MalariaImage, SymptomInput
from .ml_utils import predict_disease, SYMPTOM_CATEGORIES, available_symptoms
from .langgraph_agents.api_integration import DiagnosticAPIIntegration
from .langgraph_agents.config import DiagnosticConfig
from .vector_db import MedicalKnowledgeDB
import asyncio
from django.http import StreamingHttpResponse
import time
import uuid
from datetime import datetime
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.http import require_GET
from django.views.decorators.gzip import gzip_page
from django.http import HttpResponse

# Initialize the diagnostic system
vector_db = MedicalKnowledgeDB()
vector_db.load_or_create_db()

# Validate configuration
config_status = DiagnosticConfig.validate_config()
if not config_status['valid']:
    print(f"Configuration issues: {config_status['issues']}")

# Initialize the diagnostic API integration
diagnostic_api = DiagnosticAPIIntegration(vector_db, DiagnosticConfig.GEMINI_API_KEY)


def clean_for_json_serialization(obj):
    """
    Recursively clean an object to make it JSON serializable.
    Removes or converts non-serializable objects like Document instances.
    """
    if hasattr(obj, '__dict__') and hasattr(obj, '__class__'):
        # This is likely a custom object (like Document)
        if hasattr(obj, 'page_content') and hasattr(obj, 'metadata'):
            # This looks like a LangChain Document object
            return {
                'content': str(obj.page_content) if hasattr(obj, 'page_content') else str(obj),
                'metadata': clean_for_json_serialization(obj.metadata) if hasattr(obj, 'metadata') else {},
                'type': 'document'
            }
        else:
            # Try to convert to dict if possible
            try:
                return clean_for_json_serialization(obj.__dict__)
            except:
                return str(obj)
    elif isinstance(obj, dict):
        return {key: clean_for_json_serialization(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [clean_for_json_serialization(item) for item in obj]
    elif isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    else:
        # For any other type, convert to string
        return str(obj)


@api_view(['POST'])
@parser_classes([JSONParser])
def predict_disease_enhanced_view(request):
    """Enhanced disease prediction using LangGraph multi-agent system"""
   
    try:
        print("Enhanced disease prediction view called")
        data = request.data
        selected_symptoms = data.get('symptoms', [])
        patient_info = data.get('patient_info', {})
        max_questions = data.get('max_questions', DiagnosticConfig.MAX_QUESTIONS_DEFAULT)
        print(f"Selected symptoms: {selected_symptoms}")

        if not selected_symptoms:
            return Response({'error': 'No symptoms provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create session ID FIRST
        session_id = str(uuid.uuid4())
        
        # Initialize session in diagnostic API IMMEDIATELY
        diagnostic_api.initialize_session(session_id)
        
        # Add initial reasoning steps BEFORE any processing
        timestamp = datetime.now().isoformat()
        initial_steps = [
            {
                "id": f"{session_id}_0",
                "agent": "system",
                "step": "session_created",
                "timestamp": timestamp,
                "content": "Diagnostic session initialized",
                "status": "completed"
            }
        ]
        
        # Store initial steps IMMEDIATELY
        diagnostic_api.update_session_reasoning(session_id, initial_steps)
        
        # Get initial prediction from ML model
        print("Getting initial prediction...")
        initial_result = predict_disease(selected_symptoms)
        print(f"Initial prediction result: {initial_result}")

        if 'error' in initial_result:
            return Response(initial_result, status=status.HTTP_400_BAD_REQUEST)

         # Add ML prediction step IMMEDIATELY after prediction
        ml_step = {
            "id": f"{session_id}_1",
            "agent": "ml_model",
            "step": "initial_prediction",
            "timestamp": datetime.now().isoformat(),
            "content": f"Initial prediction completed: {len(initial_result)} diseases analyzed",
            "status": "completed",
            "details": initial_result
        }
        
        current_steps = diagnostic_api.get_session_reasoning(session_id)
        current_steps.append(ml_step)
        diagnostic_api.update_session_reasoning(session_id, current_steps)
        
        # If there are no predictions, return early
        if not initial_result or len(initial_result) == 0:
            print("No diseases predicted in initial result")
            return Response({
                'initial_predictions': initial_result,
                'enhanced': False,
                'message': 'No diseases predicted based on the provided symptoms.',
                'clarifying_questions': [],
                'reasoning_steps': current_steps,
                'session_id': session_id
            })
       

        # Add workflow start step BEFORE starting LangGraph
        workflow_start_step = {
            "id": f"{session_id}_2",
            "agent": "orchestrator",
            "step": "workflow_started",
            "timestamp": datetime.now().isoformat(),
            "content": "Multi-agent diagnostic workflow initiated",
            "status": "completed"
        }
        
        current_steps.append(workflow_start_step)
        diagnostic_api.update_session_reasoning(session_id, current_steps)

        # Use the LangGraph agent system to enhance the prediction
        try:
            print("Starting LangGraph diagnostic session...")

            # Convert initial ML predictions to the format expected by agents
            formatted_predictions = {}
            for disease, disease_data in initial_result.items():
                if isinstance(disease_data, dict):
                    probability = disease_data.get('probability', 0.0)
                else:
                    probability = float(disease_data)

                formatted_predictions[disease] = {
                    'probability': probability,
                    'confidence': 'High' if probability > 0.8 else 'Medium' if probability > 0.5 else 'Low',
                    'source': 'ml_model'
                }

            # Start the diagnostic session
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                enhanced_result = loop.run_until_complete(
                    diagnostic_api.start_diagnosis(
                        symptoms=selected_symptoms,
                        patient_info=patient_info,
                        initial_predictions=initial_result,
                        max_questions=max_questions,
                        session_id=session_id
                    )
                )
            finally:
                loop.close()

            print(f"Enhanced result: {enhanced_result}")

            # Format the response based on the result type
            if enhanced_result.get('type') == 'question':
                questions = enhanced_result.get('questions', [])
                print(f"DEBUG: Found {len(questions)} questions in enhanced result")

                # Ensure questions are properly formatted
                formatted_questions = []
                for q in questions:
                    if isinstance(q, dict):
                        formatted_questions.append(q)
                    elif isinstance(q, str):
                        formatted_questions.append({
                            'id': f'q{len(formatted_questions) + 1}',
                            'question': q,
                            'question_text': q,
                            'type': 'yes_no',
                            'related_disease': 'General',
                            'symptom_checking': 'additional symptoms',
                            'priority': 1,
                            'required': True
                        })

                result = {
                    'initial_predictions': initial_result,
                    'enhanced': True,
                    'status': 'waiting_for_input',
                    'session_id': enhanced_result['session_id'],
                    'progress': enhanced_result.get('progress', {}),
                    'clarifying_questions': formatted_questions,
                    'reasoning_steps': enhanced_result.get('reasoning_steps', []),
                    'agent_outputs': clean_for_json_serialization(enhanced_result.get('agent_outputs', {})),
                    'transparency': clean_for_json_serialization(enhanced_result.get('transparency', {}))
                }
            elif enhanced_result.get('type') == 'diagnosis':
                # The system has completed the diagnosis
                result = {
                    'initial_predictions': initial_result,
                    'enhanced': True,
                    'status': 'completed',
                    'session_id': enhanced_result['session_id'],
                    'enhanced_predictions': enhanced_result['predictions'],
                    'summary': enhanced_result.get('summary', {}),
                    'symptoms_analyzed': enhanced_result.get('symptoms_analyzed', selected_symptoms),
                    'questions_asked': enhanced_result.get('questions_asked', 0),
                    'reasoning_steps': enhanced_result.get('reasoning_steps', []),
                    'agent_outputs': clean_for_json_serialization(enhanced_result.get('agent_outputs', {})),
                    'transparency': clean_for_json_serialization(enhanced_result.get('transparency', {})),
                    'clarifying_questions': []
                }
            else:
                # Fallback for other response types
                result = {
                    'initial_predictions': initial_result,
                    'enhanced': True,
                    'session_id': enhanced_result.get('session_id'),
                    'langgraph_result': clean_for_json_serialization(enhanced_result),
                    'reasoning_steps': enhanced_result.get('reasoning_steps', []),
                    'agent_outputs': clean_for_json_serialization(enhanced_result.get('agent_outputs', {})),
                    'clarifying_questions': []
                }

        except Exception as e:
            print(f"Exception during LangGraph enhancement: {str(e)}")
            import traceback
            traceback.print_exc()
            # Add error step
            error_step = {
                "id": f"{session_id}_error",
                "agent": "system",
                "step": "enhancement_error",
                "timestamp": datetime.now().isoformat(),
                "content": f"Enhancement failed: {str(e)}",
                "status": "error"
            }
            
            current_steps.append(error_step)
            diagnostic_api.update_session_reasoning(session_id, current_steps)
            
            result = {
                'initial_predictions': initial_result,
                'enhanced': False,
                'enhancement_error': str(e),
                'status': 'error',
                'session_id': session_id,
                'clarifying_questions': [],
                'reasoning_steps': current_steps
            }

        # Save result if user is authenticated
        if request.user.is_authenticated:
            print(f"Saving result for user: {request.user.username}")
            
            # Clean the result before saving
            cleaned_result = clean_for_json_serialization(result)
            
            diagnostic_result = DiagnosticResult.objects.create(
                user=request.user,
                diagnostic_type='enhanced',
                result_data=cleaned_result
            )

            SymptomInput.objects.create(
                diagnostic_result=diagnostic_result,
                symptoms=selected_symptoms
            )

            result['saved'] = True
            result['result_id'] = diagnostic_result.id
            
            print(f"DEBUG: reasoning_steps content: {result.get('reasoning_steps', [])}")
            for i, step in enumerate(result.get('reasoning_steps', [])):
                print(f"  Step {i}: {type(step)} - {repr(step)}")

        print(f"Returning final result with status: {result.get('status', 'unknown')}")
        print(f"Reasoning steps in result: {len(result.get('reasoning_steps', []))}")
        return Response(result)

    except Exception as e:
        print(f"Exception in predict_disease_enhanced_view: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@require_GET
@csrf_exempt
def reasoning_stream_view(request, session_id):
    """Enhanced Server-sent events endpoint for real-time reasoning updates"""
    print(f"SSE Request received - Origin: {request.META.get('HTTP_ORIGIN')}")
    print(f"SSE Session ID: {session_id}")
    
    def event_stream():
        """Generator function for SSE with better error handling"""
        try:
            # Send initial connection confirmation
            yield f"event: connected\ndata: {json.dumps({'type': 'connected', 'session_id': session_id, 'timestamp': datetime.now().isoformat()})}\n\n"
            
            # Get existing reasoning steps from the diagnostic API
            try:
                reasoning_steps = diagnostic_api.get_session_reasoning(session_id)
                print(f"Found {len(reasoning_steps)} existing reasoning steps for session {session_id}")
            except Exception as e:
                print(f"Error getting session reasoning: {e}")
                reasoning_steps = []
            
            # Send existing steps
            for i, step in enumerate(reasoning_steps):
                step_data = {
                    'type': 'step',
                    'step_id': f"{session_id}_{i}",
                    'agent': step.get('agent', 'unknown'),
                    'step': step.get('step', 'processing'),
                    'timestamp': step.get('timestamp', datetime.now().isoformat()),
                    'content': step.get('content', ''),
                    'status': 'completed',
                    'details': step.get('details', {})
                }
                yield f"data: {json.dumps(step_data)}\n\n"
                time.sleep(0.1)
            
            # Monitor for new steps
            last_check = time.time()
            max_wait_time = 300  # 5 minutes timeout
            start_time = time.time()
            
            while (time.time() - start_time) < max_wait_time:
                try:
                    # Check for new reasoning steps
                    try:
                        new_steps = diagnostic_api.get_new_reasoning_steps(session_id, last_check)
                    except Exception as e:
                        print(f"Error getting new reasoning steps: {e}")
                        new_steps = []
                    
                    for step in new_steps:
                        step_data = {
                            'type': 'step',
                            'step_id': step.get('id', f"{session_id}_{int(time.time())}"),
                            'agent': step.get('agent', 'unknown'),
                            'step': step.get('step', 'processing'),
                            'timestamp': step.get('timestamp', datetime.now().isoformat()),
                            'content': step.get('content', ''),
                            'status': step.get('status', 'completed'),
                            'details': step.get('details', {})
                        }
                        yield f"data: {json.dumps(step_data)}\n\n"
                    
                    # Check if session is complete
                    try:
                        if diagnostic_api.is_session_complete(session_id):
                            yield f"data: {json.dumps({'type': 'complete', 'session_id': session_id, 'timestamp': datetime.now().isoformat()})}\n\n"
                            break
                    except Exception as e:
                        print(f"Error checking session completion: {e}")
                    
                    last_check = time.time()
                    time.sleep(1)  # Poll every second
                    
                except Exception as e:
                    error_data = {
                        'type': 'error',
                        'message': str(e),
                        'timestamp': datetime.now().isoformat()
                    }
                    yield f"data: {json.dumps(error_data)}\n\n"
                    break
            
            # Send timeout message if needed
            if (time.time() - start_time) >= max_wait_time:
                timeout_data = {
                    'type': 'timeout',
                    'message': 'Session monitoring timeout',
                    'timestamp': datetime.now().isoformat()
                }
                yield f"data: {json.dumps(timeout_data)}\n\n"
                
        except Exception as e:
            error_data = {
                'type': 'error',
                'message': f'Stream error: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            yield f"event: error\ndata: {json.dumps(error_data)}\n\n"

    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    
    # FIXED: Proper CORS headers without hop-by-hop headers
    origin = request.META.get('HTTP_ORIGIN', 'http://localhost:5173')
    response['Access-Control-Allow-Origin'] = origin
    response['Access-Control-Allow-Credentials'] = 'true'
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Cache-Control, Accept'
    response['Cache-Control'] = 'no-cache'
    # REMOVED: Connection header (this was causing the hop-by-hop error)
    response['X-Accel-Buffering'] = 'no'
    
    return response

@api_view(['POST'])
@parser_classes([JSONParser])
def answer_clarifying_questions_view(request):
    """Continue diagnostic session with user answers using LangGraph"""
    try:
        data = request.data
        session_id = data.get('session_id')
        answers = data.get('answers', {})
        result_id = data.get('result_id')
        
        print(f"Received data: session_id={session_id}, result_id={result_id}, answers={answers}")
        
        # Process answers to ensure proper format
        processed_answers = {}
        for key, value in answers.items():
            # Keep the original key format from frontend
            processed_answers[key] = value
        
        if not session_id and not result_id:
            return Response({'error': 'Session ID or Result ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not answers:
            return Response({'error': 'Answers are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"Processed answers: {processed_answers}")
        
        # If we have a result_id but no session_id, try to get session_id from saved result
        if result_id and not session_id:
            try:
                diagnostic_result = DiagnosticResult.objects.get(id=result_id)
                if request.user.is_authenticated and request.user != diagnostic_result.user:
                    return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
                
                session_id = diagnostic_result.result_data.get('session_id')
                if not session_id:
                    return Response({'error': 'Session ID not found in saved result'},
                                   status=status.HTTP_400_BAD_REQUEST)
            except DiagnosticResult.DoesNotExist:
                return Response({'error': 'Diagnostic result not found'},
                               status=status.HTTP_404_NOT_FOUND)
        
        # Continue the diagnostic session with the answer
        try:
            print(f"Continuing session {session_id} with answers: {processed_answers}")
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                continued_result = loop.run_until_complete(
                    diagnostic_api.answer_question(session_id, processed_answers)
                )
            finally:
                loop.close()
            
            print(f"Continued result: {continued_result}")
            
            # Format the response based on the result
            if continued_result.get('type') == 'question':
                # More questions needed
                questions = continued_result.get('questions', [])
                
                # Ensure questions are properly formatted
                formatted_questions = []
                for q in questions:
                    if isinstance(q, dict):
                        formatted_questions.append(q)
                    elif isinstance(q, str):
                        formatted_questions.append({
                            'id': f'q{len(formatted_questions) + 1}',
                            'question': q,
                            'question_text': q,
                            'type': 'yes_no',
                            'related_disease': 'General',
                            'symptom_checking': 'additional symptoms',
                            'priority': 1,
                            'required': True
                        })
                
                result = {
                    'enhanced': True,
                    'status': 'waiting_for_input',
                    'session_id': session_id,
                    'clarifying_questions': formatted_questions,
                    'progress': continued_result.get('progress', {}),
                    'questions_asked': continued_result.get('questions_asked', 0),
                    'reasoning_steps': continued_result.get('reasoning_steps', []),
                    'agent_outputs': clean_for_json_serialization(continued_result.get('agent_outputs', {})),
                    'transparency': clean_for_json_serialization(continued_result.get('transparency', {}))
                }
            elif continued_result.get('type') == 'diagnosis':
                # Diagnosis complete
                result = {
                    'enhanced': True,
                    'status': 'completed',
                    'session_id': session_id,
                    'enhanced_predictions': continued_result.get('predictions', {}),
                    'prediction_complete': True,
                    'summary': continued_result.get('summary', {}),
                    'symptoms_analyzed': continued_result.get('symptoms_analyzed', []),
                    'questions_asked': continued_result.get('questions_asked', 0),
                    'reasoning_steps': continued_result.get('reasoning_steps', []),
                    'agent_outputs': clean_for_json_serialization(continued_result.get('agent_outputs', {})),
                    'transparency': clean_for_json_serialization(continued_result.get('transparency', {})),
                    'clarifying_questions': []  # Clear questions when completed
                }
            else:
                # Other status
                result = {
                    'enhanced': True,
                    'session_id': session_id,
                    'langgraph_result': clean_for_json_serialization(continued_result),
                    'clarifying_questions': []
                }
        
        except Exception as e:
            print(f"Exception during session continuation: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': f'Error processing answer: {str(e)}'},
                           status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Save the updated result if user is authenticated and diagnosis is complete
        if request.user.is_authenticated and result.get('status') == 'completed':
            print(f"Saving completed result for user: {request.user.username}")
            
            # Get original symptoms from the session or previous result
            original_symptoms = []
            if result_id:
                try:
                    original_diagnostic = DiagnosticResult.objects.get(id=result_id)
                    original_symptom_input = SymptomInput.objects.get(diagnostic_result=original_diagnostic)
                    original_symptoms = original_symptom_input.symptoms
                except (DiagnosticResult.DoesNotExist, SymptomInput.DoesNotExist):
                    pass
            
            # Clean the result before saving to ensure JSON serialization
            cleaned_result = clean_for_json_serialization(result)
            
            new_diagnostic_result = DiagnosticResult.objects.create(
                user=request.user,
                diagnostic_type='completed',
                result_data=cleaned_result
            )
            
            # Save symptoms (use analyzed symptoms if available, otherwise original)
            symptoms_to_save = result.get('symptoms_analyzed', original_symptoms)
            SymptomInput.objects.create(
                diagnostic_result=new_diagnostic_result,
                symptoms=symptoms_to_save
            )
            
            result['saved'] = True
            result['result_id'] = new_diagnostic_result.id
            
            print(f"DEBUG: reasoning_steps content: {result.get('reasoning_steps', [])}")
            for i, step in enumerate(result.get('reasoning_steps', [])):
                print(f"  Step {i}: {type(step)} - {repr(step)}")
        
        return Response(result)
        
    except Exception as e:
        print(f"Exception in answer_clarifying_questions_view: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_session_status_view(request, session_id):
    """Get the current status of a diagnostic session"""
    try:
        if not session_id:
            return Response({'error': 'Session ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            session_status = loop.run_until_complete(
                diagnostic_api.get_session_status(session_id)
            )
        finally:
            loop.close()
        
        # Clean the session status for JSON serialization
        cleaned_status = clean_for_json_serialization(session_status)
        
        return Response(cleaned_status)
        
    except Exception as e:
        print(f"Exception in get_session_status_view: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_active_sessions_view(request):
    """Get list of active diagnostic sessions"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            active_sessions = loop.run_until_complete(
                diagnostic_api.get_active_sessions()
            )
        finally:
            loop.close()
        
        # Clean the active sessions for JSON serialization
        cleaned_sessions = clean_for_json_serialization(active_sessions)
        
        return Response(cleaned_sessions)
        
    except Exception as e:
        print(f"Exception in get_active_sessions_view: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)