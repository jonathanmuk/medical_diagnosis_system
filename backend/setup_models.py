import os
import shutil
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical_system.settings')
django.setup()

from django.conf import settings

def copy_models_and_data():
    """Copy ML models and datasets to the appropriate directories"""
    # Source directories (assuming they're in the project root)
    source_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Models
    models_source = os.path.join(source_root, 'models')
    models_dest = settings.MODELS_DIR
    
    # Data
    data_source = os.path.join(source_root, 'data')
    data_dest = settings.DATA_DIR
    
    # Create destination directories if they don't exist
    os.makedirs(models_dest, exist_ok=True)
    os.makedirs(data_dest, exist_ok=True)
    
    # Copy model files
    model_files = [
        'malaria_model.h5',
        'disease_predictor_model2.joblib',
        'label_encoder2.joblib'
    ]
    
    for model_file in model_files:
        source_path = os.path.join(source_root, model_file)
        dest_path = os.path.join(models_dest, model_file)
        
        if os.path.exists(source_path):
            print(f"Copying {model_file} to {dest_path}")
            shutil.copy2(source_path, dest_path)
        else:
            print(f"Warning: {model_file} not found at {source_path}")
    
    # Copy symptom data files
    symptoms_source = os.path.join(source_root, 'symptoms')
    symptoms_dest = os.path.join(data_dest, 'symptoms')
    
    os.makedirs(symptoms_dest, exist_ok=True)
    
    symptom_files = [
        'Symptom-severity.csv',
        'symptom_Description.csv',
        'symptom_precaution.csv',
        'dataset.csv'
    ]
    
    for symptom_file in symptom_files:
        source_path = os.path.join(symptoms_source, symptom_file)
        dest_path = os.path.join(symptoms_dest, symptom_file)
        
        if os.path.exists(source_path):
            print(f"Copying {symptom_file} to {dest_path}")
            shutil.copy2(source_path, dest_path)
        else:
            print(f"Warning: {symptom_file} not found at {source_path}")
    
    print("Setup complete!")

if __name__ == "__main__":
    copy_models_and_data()
