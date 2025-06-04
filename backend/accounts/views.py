from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .models import User, UserProfile
from rest_framework.decorators import authentication_classes

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new user
    """
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
        

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def get_locations(request):
    """
    Get all locations (districts, subcounties, villages)
    """
    LOCATION_DATA = {
        'districts': [
            {
                'id': 1,
                'name': 'Kampala',
                'subcounties': [
                    {
                        'id': 1,
                        'name': 'Central Division',
                        'villages': ['Kamwokya', 'Kololo', 'Nakasero', 'Old Kampala', 'Kisenyi']
                    },
                    {
                        'id': 2,
                        'name': 'Kawempe Division',
                        'villages': ['Bwaise', 'Kyebando', 'Mpererwe', 'Kisaasi', 'Kanyanya']
                    },
                    {
                        'id': 3,
                        'name': 'Makindye Division',
                        'villages': ['Nsambya', 'Katwe', 'Kibuye', 'Lukuli', 'Ggaba']
                    },
                    {
                        'id': 4,
                        'name': 'Nakawa Division',
                        'villages': ['Bugolobi', 'Luzira', 'Mutungo', 'Nakawa', 'Kyanja']
                    },
                    {
                        'id': 5,
                        'name': 'Rubaga Division',
                        'villages': ['Kasubi', 'Ndeeba', 'Rubaga', 'Namirembe', 'Lungujja']
                    }
                ]
            },
            {
                'id': 2,
                'name': 'Wakiso',
                'subcounties': [
                    {
                        'id': 6,
                        'name': 'Nansana',
                        'villages': ['Nabweru', 'Gombe', 'Nansana East', 'Nansana West', 'Busukuma']
                    },
                    {
                        'id': 7,
                        'name': 'Kira',
                        'villages': ['Kira', 'Bweyogerere', 'Kireka', 'Kyaliwajjala', 'Namugongo']
                    },
                    {
                        'id': 8,
                        'name': 'Makindye-Ssabagabo',
                        'villages': ['Ndejje', 'Bunamwaya', 'Mutundwe', 'Seguku', 'Lubowa']
                    },
                    {
                        'id': 9,
                        'name': 'Entebbe',
                        'villages': ['Entebbe Central', 'Katabi', 'Kitooro', 'Lugonjo', 'Nakiwogo']
                    },
                    {
                        'id': 10,
                        'name': 'Kasangati',
                        'villages': ['Kasangati', 'Gayaza', 'Masooli', 'Wampewo', 'Bulamu']
                    }
                ]
            }
        ]
    }
    return Response(LOCATION_DATA)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    """
    Authenticate a user and return a token
    """
    email = request.data.get('email')
    password = request.data.get('password')
    
    user = authenticate(email=email, password=password)
    
    if user:
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user_id': user.id,
            'email': user.email,
            'username': user.username,
            'user_type': user.user_type
        })
    else:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Log out a user by deleting their token
    """
    try:
        request.user.auth_token.delete()
        return Response({
            'message': 'Successfully logged out'
        })
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request):
    """
    Get or update the user's profile
    """
    user = request.user
    
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