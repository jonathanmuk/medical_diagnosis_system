import api from './api';

const diagnosticService = {
  // Get symptom categories
  getSymptomCategories: async () => {
    try {
      const response = await api.get('/diagnostics/symptoms/');
      return response.data;
    } catch (error) {
      console.error('Error fetching symptom categories:', error);
      throw error;
    }
  },
  
  // Predict disease based on symptoms
  predictDisease: async (symptoms) => {
    try {
      const response = await api.post('/diagnostics/predict/disease/', { symptoms });
      return response.data;
    } catch (error) {
      console.error('Error predicting disease:', error);
      throw error;
    }
  },

  // NEW: Enhanced disease prediction with AI
  predictDiseaseEnhanced: async (symptoms) => {
    try {
      const response = await api.post('/diagnostics/predict/disease/enhanced/', { symptoms });
      return response.data;
    } catch (error) {
      console.error('Error with enhanced disease prediction:', error);
      throw error;
    }
  },
  
  // NEW: Submit answers to clarifying questions
  answerClarifyingQuestions: async (resultId, answers, sessionId = null) => {
  try {
    const payload = {
      answers
    };
    
    // Include both result_id and session_id if available
    if (resultId) {
      payload.result_id = resultId;
    }
    
    if (sessionId) {
      payload.session_id = sessionId;
    }
    
    const response = await api.post('/diagnostics/predict/disease/answer-questions/', payload);
    return response.data;
  } catch (error) {
    console.error('Error submitting answers to clarifying questions:', error);
    throw error;
  }
},
  
  // Predict malaria from image
  predictMalaria: async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await api.post('/diagnostics/predict/malaria/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error predicting malaria:', error);
      throw error;
    }
  },
  
  // Get diagnostic history
  getDiagnosticHistory: async () => {
    try {
      const response = await api.get('/diagnostics/history/');
      return response.data;
    } catch (error) {
      console.error('Error fetching diagnostic history:', error);
      throw error;
    }
  }
};

export default diagnosticService;