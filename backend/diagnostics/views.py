from rest_framework import status, permissions
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import DiagnosticResult, MalariaImage, SymptomInput
from .ml_utils import predict_malaria, predict_disease, SYMPTOM_CATEGORIES, available_symptoms

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_symptom_categories(request):
    return Response({
        'symptom_categories': SYMPTOM_CATEGORIES,
        'available_symptoms': available_symptoms
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def predict_malaria_view(request):
    try:
        if 'image' not in request.FILES:
            return Response({'error': 'No image uploaded'}, status=status.HTTP_400_BAD_REQUEST)
                
        image_file = request.FILES['image']
                
        # Add debug info
        print(f"Processing malaria image: {image_file.name}, size: {image_file.size} bytes")
        print(f"Image content type: {image_file.content_type}")
                
        result = predict_malaria(image_file)
                
        # Add debug info
        print(f"Prediction result: {result}")
                
        # Save result if user is authenticated
        if request.user.is_authenticated:
            diagnostic_result = DiagnosticResult.objects.create(
                user=request.user,
                diagnostic_type='malaria',
                result_data=result
            )
                        
            MalariaImage.objects.create(
                diagnostic_result=diagnostic_result,
                image=image_file
            )
                        
            result['saved'] = True
            result['result_id'] = diagnostic_result.id
                
        return Response(result)
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error in predict_malaria_view: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return Response({'error': str(e), 'traceback': error_traceback if settings.DEBUG else None}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
  

@api_view(['POST'])
@parser_classes([JSONParser])
def predict_disease_view(request):
    try:
        data = request.data
        selected_symptoms = data.get('symptoms', [])
        
        if not selected_symptoms:
            return Response({'error': 'No symptoms provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        result = predict_disease(selected_symptoms)
        
        if 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        # Save result if user is authenticated
        if request.user.is_authenticated:
            diagnostic_result = DiagnosticResult.objects.create(
                user=request.user,
                diagnostic_type='disease',
                result_data=result
            )
            
            SymptomInput.objects.create(
                diagnostic_result=diagnostic_result,
                symptoms=selected_symptoms
            )
            
            result['saved'] = True
            result['result_id'] = diagnostic_result.id
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_diagnostic_history(request):
    user = request.user
    results = DiagnosticResult.objects.filter(user=user).order_by('-created_at')
    
    history = []
    for result in results:
        item = {
            'id': result.id,
            'type': result.diagnostic_type,
            'date': result.created_at,
            'result': result.result_data
        }
        
        # Add image URL for malaria results
        if result.diagnostic_type == 'malaria' and hasattr(result, 'malaria_image'):
            item['image_url'] = request.build_absolute_uri(result.malaria_image.image.url)
        
        # Add symptoms for disease results
        if result.diagnostic_type == 'disease' and hasattr(result, 'symptom_input'):
            item['symptoms'] = result.symptom_input.symptoms
        
        history.append(item)
    
    return Response(history)
