from django.db import models
from accounts.models import User

class DiagnosticResult(models.Model):
    DIAGNOSTIC_TYPE_CHOICES = (
        ('malaria', 'Malaria Detection'),
        ('disease', 'Disease Prediction'),
        ('enhanced', 'Enhanced Disease Prediction'),
        ('completed', 'Completed Enhanced Prediction'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='diagnostic_results')
    diagnostic_type = models.CharField(max_length=100, choices=DIAGNOSTIC_TYPE_CHOICES)  
    result_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.diagnostic_type} for {self.user.username} on {self.created_at.strftime('%Y-%m-%d')}"

class MalariaImage(models.Model):
    diagnostic_result = models.OneToOneField(DiagnosticResult, on_delete=models.CASCADE, related_name='malaria_image')
    image = models.ImageField(upload_to='malaria_images/')
    
    def __str__(self):
        return f"Image for {self.diagnostic_result}"

class SymptomInput(models.Model):
    diagnostic_result = models.OneToOneField(DiagnosticResult, on_delete=models.CASCADE, related_name='symptom_input')
    symptoms = models.JSONField()
    
    def __str__(self):
        return f"Symptoms for {self.diagnostic_result}"
