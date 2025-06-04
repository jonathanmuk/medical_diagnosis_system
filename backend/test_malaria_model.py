import os
import sys
import tensorflow as tf
import numpy as np
from PIL import Image

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical_system.settings')
import django
django.setup()

from django.conf import settings

def test_malaria_model():
    print("Testing malaria model...")
    
    # Path to the model
    model_path = os.path.join(settings.MODELS_DIR, 'malaria_model.h5')
    
    if not os.path.exists(model_path):
        print(f"ERROR: Model file not found at {model_path}")
        return False
    
    print(f"Loading model from {model_path}")
    
    try:
        # Load the model
        model = tf.keras.models.load_model(model_path)
        print(f"Model loaded successfully. Input shape: {model.input_shape}")
        
        # Create a test image (random data)
        input_shape = model.input_shape
        if input_shape and len(input_shape) == 4:
            height, width = input_shape[1] or 64, input_shape[2] or 64
        else:
            height, width = 64, 64
            
        print(f"Creating test image with dimensions: {width}x{height}")
        
        # Create a blank RGB image
        test_img = Image.new('RGB', (width, height), color='white')
        
        # Convert to numpy array and normalize
        img_array = np.array(test_img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        print(f"Test array shape: {img_array.shape}")
        
        # Make a prediction
        print("Making test prediction...")
        prediction = model.predict(img_array)
        
        print(f"Test prediction successful. Result shape: {prediction.shape}")
        print(f"Raw prediction: {prediction}")
        
        return True
    except Exception as e:
        import traceback
        print(f"Error testing model: {str(e)}")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = test_malaria_model()
    print(f"Test {'succeeded' if success else 'failed'}")
    sys.exit(0 if success else 1)
