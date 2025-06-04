from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from accounts.models import User, UserProfile
from diagnostics.models import DiagnosticResult, MalariaImage, SymptomInput
from diagnostics.ml_utils import predict_malaria, predict_disease, SYMPTOM_CATEGORIES, available_symptoms
import json

# User registration and profile views
class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Allow admin users to access any profile
        if request.user.user_type == 'admin':
            return True
        # Allow users to access only their own profile
        return obj.user == request.user

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    try:
        data = request.data
        
        # Create user
        user = User.objects.create_user(
            email=data['email'],
            username=data['username'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            middle_name=data.get('middle_name', ''),
            gender=data.get('gender', ''),
            user_type=data.get('userType', 'user')
        )
        
        # Create user profile
        profile_data = {
            'phone_number': data.get('phone_number', ''),
            'address': data.get('address', ''),
            'date_of_birth': data.get('date_of_birth', None),
            'district': data.get('district', ''),
            'subcounty': data.get('subcounty', ''),
            'village': data.get('village', '')
        }
        
        # Add specific fields based on user type
        if user.user_type == 'health_worker':
            profile_data.update({
                'qualification': data.get('qualification', ''),
                'specialization': data.get('specialization', '')
            })
        elif user.user_type in ['pharmacy', 'hospital']:
            profile_data.update({
                'organization_name': data.get('organization_name', ''),
                'license_number': data.get('license_number', '')
            })
        
        UserProfile.objects.create(user=user, **profile_data)
        
        return Response({
            'message': 'User registered successfully',
            'user_id': user.id,
            'user_type': user.user_type
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated, IsOwnerOrAdmin])
def user_profile(request, user_id):
    user = get_object_or_404(User, id=user_id)
    
    if request.method == 'GET':
        profile = user.profile
        data = {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'user_type': user.user_type,
            'first_name': user.first_name,
            'middle_name': user.middle_name,
            'last_name': user.last_name,
            'gender': user.gender,
            'phone_number': profile.phone_number,
            'address': profile.address,
            'date_of_birth': profile.date_of_birth,
            'district': profile.district,
            'subcounty': profile.subcounty,
            'village': profile.village
        }
        
        # Add specific fields based on user type
        if user.user_type == 'health_worker':
            data.update({
                'qualification': profile.qualification,
                'specialization': profile.specialization
            })
        elif user.user_type in ['pharmacy', 'hospital']:
            data.update({
                'organization_name': profile.organization_name,
                'license_number': profile.license_number
            })
        
        return Response(data)
    
    elif request.method == 'PUT':
        data = request.data
        
        # Update user fields
        user.first_name = data.get('first_name', user.first_name)
        user.middle_name = data.get('middle_name', user.middle_name)
        user.last_name = data.get('last_name', user.last_name)
        user.gender = data.get('gender', user.gender)
        user.save()
        
        # Update profile fields
        profile = user.profile
        profile.phone_number = data.get('phone_number', profile.phone_number)
        profile.address = data.get('address', profile.address)
        profile.date_of_birth = data.get('date_of_birth', profile.date_of_birth)
        profile.district = data.get('district', profile.district)
        profile.subcounty = data.get('subcounty', profile.subcounty)
        profile.village = data.get('village', profile.village)
        
        # Update specific fields based on user type
        if user.user_type == 'health_worker':
            profile.qualification = data.get('qualification', profile.qualification)
            profile.specialization = data.get('specialization', profile.specialization)
        elif user.user_type in ['pharmacy', 'hospital']:
            profile.organization_name = data.get('organization_name', profile.organization_name)
            profile.license_number = data.get('license_number', profile.license_number)
        
        profile.save()
        
        return Response({'message': 'Profile updated successfully'})


# Diagnostic API views
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_symptom_categories(request):
    return Response({
        'symptom_categories': SYMPTOM_CATEGORIES,
        'available_symptoms': available_symptoms
    })

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def predict_malaria_view(request):
    try:
        if 'image' not in request.FILES:
            return Response({'error': 'No image uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image']
        result = predict_malaria(image_file)
        
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
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
