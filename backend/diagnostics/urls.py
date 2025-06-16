from django.urls import path
from . import views
from . import views_enhanced

urlpatterns = [
     # Diagnostic endpoints
    path('symptoms/', views.get_symptom_categories, name='symptom_categories'),
    path('predict/malaria/', views.predict_malaria_view, name='predict_malaria'),
    path('predict/disease/', views.predict_disease_view, name='predict_disease'),
    path('history/', views.user_diagnostic_history, name='diagnostic_history'),
    
    # New enhanced endpoints
    path('predict/disease/enhanced/', views_enhanced.predict_disease_enhanced_view, name='predict_disease_enhanced'),
    path('predict/disease/answer-questions/', views_enhanced.answer_clarifying_questions_view, name='answer_clarifying_questions'),
    path('sessions/<str:session_id>/status/', views_enhanced.get_session_status_view, name='session_status'),
    path('sessions/active/', views_enhanced.get_active_sessions_view, name='active_sessions'),
    path('reasoning-stream/<str:session_id>/', views_enhanced.reasoning_stream_view, name='reasoning_stream'),
    path('reasoning-stream/<str:session_id>', views_enhanced.reasoning_stream_view, name='reasoning_stream'),
]