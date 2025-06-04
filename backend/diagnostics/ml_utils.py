import os
import logging
import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
from PIL import Image
from django.conf import settings

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
logging.getLogger('tensorflow').setLevel(logging.ERROR)

# Paths to models and data
MODELS_DIR = settings.MODELS_DIR
DATA_DIR = settings.DATA_DIR

# Load models
def load_models():
    global malaria_model, disease_model, label_encoder, df_severity, df_description, df_precaution, dataset, available_symptoms, SYMPTOM_CATEGORIES
    
    try:
        print(f"Loading models from directory: {MODELS_DIR}")
        print(f"Loading data from directory: {DATA_DIR}")
        
        # Check if model files exist
        malaria_model_path = os.path.join(MODELS_DIR, 'malaria_model.h5')
        disease_model_path = os.path.join(MODELS_DIR, 'disease_predictor_model2.joblib')
        label_encoder_path = os.path.join(MODELS_DIR, 'label_encoder2.joblib')
        
        if not os.path.exists(malaria_model_path):
            print(f"ERROR: Malaria model file not found at {malaria_model_path}")
        else:
            print(f"Malaria model file found at {malaria_model_path}")
            
        if not os.path.exists(disease_model_path):
            print(f"ERROR: Disease model file not found at {disease_model_path}")
        else:
            print(f"Disease model file found at {disease_model_path}")
            
        if not os.path.exists(label_encoder_path):
            print(f"ERROR: Label encoder file not found at {label_encoder_path}")
        else:
            print(f"Label encoder file found at {label_encoder_path}")
        
        
        # Load ML models
        print("Loading malaria model...")
        malaria_model = tf.keras.models.load_model(malaria_model_path)
        print(f"Malaria model loaded successfully. Input shape: {malaria_model.input_shape}")
        
        print("Loading disease model...")
        disease_model = joblib.load(disease_model_path)
        print("Disease model loaded successfully")
        
        print("Loading label encoder...")
        label_encoder = joblib.load(label_encoder_path)
        print("Label encoder loaded successfully")
        
          
        # Load datasets
        symptoms_dir = os.path.join(DATA_DIR, 'symptoms')
        print(f"Loading symptom datasets from {symptoms_dir}")
        
        df_severity = pd.read_csv(os.path.join(symptoms_dir, 'Symptom-severity.csv'))
        df_description = pd.read_csv(os.path.join(symptoms_dir, 'symptom_Description.csv'))
        df_precaution = pd.read_csv(os.path.join(symptoms_dir, 'symptom_precaution.csv'))
        dataset = pd.read_csv(os.path.join(symptoms_dir, 'dataset.csv'))
        print("All symptom datasets loaded successfully")
        
        # Extract all unique symptoms from the dataset
        all_symptoms = set()
        for col in dataset.columns[1:]:  # Skip the Disease column
            symptoms = dataset[col].dropna().unique()
            symptoms = [str(s).strip() for s in symptoms if str(s).strip()]
            all_symptoms.update(symptoms)
        
        available_symptoms = sorted(list(all_symptoms))
        print(f"Extracted {len(available_symptoms)} unique symptoms")
        
        # Categorized symptoms for frontend
        SYMPTOM_CATEGORIES = {
            'General': [
                'fatigue', 'malaise', 'high_fever', 'mild_fever', 'sweating', 'chills',
                'lethargy', 'headache', 'anxiety', 'depression', 'restlessness', 'dizziness',
                'weakness_in_limbs', 'weight_loss', 'weight_gain'
            ],
            'Respiratory': [
                'breathlessness', 'cough', 'chest_pain', 'runny_nose', 'congestion',
                'sinus_pressure', 'phlegm', 'mucoid_sputum', 'rusty_sputum', 'blood_in_sputum',
                'throat_irritation', 'patches_in_throat'
            ],
            'Digestive': [
                'stomach_pain', 'abdominal_pain', 'vomiting', 'nausea', 'diarrhoea',
                'constipation', 'stomach_bleeding', 'distention_of_abdomen', 'indigestion',
                'excessive_hunger', 'loss_of_appetite'
            ],
            'Skin and Nails': [
                'skin_rash', 'itching', 'yellowish_skin', 'bruising', 'blister',
                'red_spots_over_body', 'skin_peeling', 'nodal_skin_eruptions',
                'dischromic_patches', 'inflammatory_nails', 'brittle_nails'
            ],
            'Eyes and Vision': [
                'yellowing_of_eyes', 'blurred_and_distorted_vision', 'redness_of_eyes',
                'watering_from_eyes', 'visual_disturbances', 'pain_behind_the_eyes',
                'puffy_face_and_eyes', 'sunken_eyes'
            ],
            'Musculoskeletal': [
                'joint_pain', 'muscle_pain', 'back_pain', 'neck_pain', 'knee_pain',
                'hip_joint_pain', 'muscle_weakness', 'muscle_wasting', 'movement_stiffness',
                'swelling_joints'
            ],
            'Urinary': [
                'burning_micturition', 'spotting_urination', 'dark_urine', 'yellow_urine',
                'polyuria', 'bladder_discomfort', 'continuous_feel_of_urine',
                'foul_smell_of_urine'
            ],
            'Neurological': [
                'altered_sensorium', 'loss_of_balance', 'lack_of_concentration',
                'slurred_speech', 'unsteadiness', 'loss_of_smell', 'coma'
            ],
            'Other': [
                'irregular_sugar_level', 'fast_heart_rate', 'palpitations', 
                'enlarged_thyroid', 'swelled_lymph_nodes', 'toxic_look_(typhos)',
                'family_history'
            ]
        }
        print("Models and datasets loaded successfully")
        return True
    except Exception as e:
        print(f"Error loading models: {str(e)}")
        return False

# Malaria prediction function
def predict_malaria(image_file):
    try:
        print(f"Starting malaria prediction for image: {image_file.name}")
        
        # Check if model is loaded
        if 'malaria_model' not in globals() or malaria_model is None:
            print("Error: Malaria model not loaded")
            raise Exception("Malaria detection model not loaded properly")
        
        # Open and preprocess the image
        print("Opening image file")
        img = Image.open(image_file).convert('RGB')
        print(f"Image opened successfully, size: {img.size}")
                
        # Get the expected input shape from the model
        input_shape = malaria_model.input_shape
        print(f"Model input shape: {input_shape}")
                
        # Determine the correct resize dimensions
        if input_shape and len(input_shape) == 4:
            # input_shape is typically (None, height, width, channels)
            height, width = input_shape[1], input_shape[2]
            if height is not None and width is not None:
                resize_dim = (width, height)
            else:
                # Default to 64x64
                resize_dim = (64, 64)
        else:
            # Default to 64x64
            resize_dim = (64, 64)
        
        print(f"Resizing image to: {resize_dim}")
                
        # Resize the image to match the model's expected input
        img = img.resize(resize_dim)
        print("Image resized successfully")
                
        # Convert to numpy array and normalize
        print("Converting to numpy array")
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        print(f"Array shape: {img_array.shape}, dtype: {img_array.dtype}, range: [{img_array.min()}, {img_array.max()}]")
                
        # Make prediction
        print("Making prediction")
        prediction = malaria_model.predict(img_array)
        print(f"Raw prediction: {prediction}, shape: {prediction.shape}")
                
        # Handle different output shapes
        if prediction.ndim == 2:
            # For models with output shape (batch_size, num_classes)
            if prediction.shape[1] == 1:
                # Binary classification with single output
                is_infected = bool(prediction[0][0] < 0.5)
                confidence = float(1 - prediction[0][0] if is_infected else prediction[0][0])
            else:
                # Multi-class classification
                predicted_class = np.argmax(prediction[0])
                is_infected = bool(predicted_class == 0)
                confidence = float(prediction[0][predicted_class])
        else:
            # For models with simple output shape (batch_size,)
            is_infected = bool(prediction[0] < 0.5)
            confidence = float(1 - prediction[0] if is_infected else prediction[0])
        
        print(f"Processed result: is_infected={is_infected}, confidence={confidence}")
                
        return {
            'is_infected': is_infected,
            'confidence': confidence,
            'message': 'Malaria parasite detected' if is_infected else 'No malaria parasite detected'
        }
    except Exception as e:
        import traceback
        print(f"Error in predict_malaria: {str(e)}")
        print(traceback.format_exc())
        raise e


# Disease prediction function
def predict_disease(selected_symptoms):
    try:
        # Clean up selected symptoms (remove leading/trailing spaces)
        selected_symptoms = [s.strip() for s in selected_symptoms]
        
        # Check if any selected symptoms are in the available symptoms
        matching_symptoms = [s for s in selected_symptoms if s in available_symptoms]
        
        if not matching_symptoms:
            return {'error': 'None of the selected symptoms match our database'}
        
        # Create a feature vector based on the dataset columns
        feature_vector = np.zeros(len(dataset.columns[1:]))  # Skip Disease column
        
        # For each symptom column in the dataset
        for i, col in enumerate(dataset.columns[1:]):
            # Check if any of the matching symptoms are in this column
            for symptom in matching_symptoms:
                # Check if this symptom appears in this column
                if dataset[col].str.contains(symptom, na=False, case=False).any():
                    # Get weight from severity dataframe
                    weight = df_severity.loc[df_severity['Symptom'].str.contains(symptom, case=False), 'weight'].values
                    feature_vector[i] = weight[0] if len(weight) > 0 else 1
                    break  # Move to next column after finding a match
        
        if not any(feature_vector):
            return {'error': 'Could not assign weights to any symptoms'}
        
        # Reshape and predict
        feature_vector = feature_vector.reshape(1, -1)
        
        # Make prediction
        probabilities = disease_model.predict_proba(feature_vector)[0]
        
        # Process predictions
        predictions = sorted(
            zip(label_encoder.classes_, probabilities),
            key=lambda x: x[1], reverse=True
        )
        
        result = {}
        for disease, prob in predictions[:5]:
            if prob < 0.05:
                continue
            
            description = df_description[df_description['Disease'].str.lower() == disease.lower()]['Description'].iloc[0] \
                if not df_description[df_description['Disease'].str.lower() == disease.lower()].empty else "No description available"
            
            precautions = df_precaution[df_precaution['Disease'].str.lower() == disease.lower()].iloc[0, 1:].tolist() \
                if not df_precaution[df_precaution['Disease'].str.lower() == disease.lower()].empty else ["No precautions available"]
            
            result[disease] = {
                'probability': float(prob),
                'confidence': 'High' if prob > 0.7 else 'Medium' if prob > 0.4 else 'Low',
                'description': description,
                'precautions': precautions
            }
        
        return result
    except Exception as e:
        import traceback
        print(f"Error in predict_disease: {str(e)}")
        print(traceback.format_exc())
        raise e

# Initialize models
load_models()