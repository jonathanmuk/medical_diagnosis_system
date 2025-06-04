import axios from 'axios';
import diagnosticService from './diagnosticService';

// Create an axios instance with default config
const api = axios.create({
  // Use a direct URL instead of relying on process.env
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  });

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('userProfile');
      
      // Redirect to login page
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  });

// Export the API instance and services
export { diagnosticService };
export default api;
