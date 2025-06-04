import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      const storedUserProfile = localStorage.getItem('userProfile');
      
      if (token && storedUserProfile) {
        try {
          // Set the token in the API headers
          api.defaults.headers.common['Authorization'] = `Token ${token}`;
          
          // Try to fetch the user profile to verify the token
          try {
            const response = await api.get('/auth/profile/');
            setUserProfile(response.data);
            setIsAuthenticated(true);
          } catch (profileError) {
            // If profile fetch fails, token is likely invalid
            console.error('Error fetching profile:', profileError);
            localStorage.removeItem('token');
            localStorage.removeItem('userProfile');
            setIsAuthenticated(false);
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error verifying authentication:', error);
          // Clear invalid auth data
          localStorage.removeItem('token');
          localStorage.removeItem('userProfile');
          setIsAuthenticated(false);
          setUserProfile(null);
        }
      } else {
        // Ensure state is reset if no token/profile
        setIsAuthenticated(false);
        setUserProfile(null);
      }
      
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      
      // Make a real API call to authenticate
      const response = await api.post('/auth/login/', { email, password });
      
      // Get the token and user data from the response
      const { token, ...userData } = response.data;
      
      // Store token and user profile
      localStorage.setItem('token', token);
      localStorage.setItem('userProfile', JSON.stringify(userData));
      
      // Set the token in the API headers
      api.defaults.headers.common['Authorization'] = `Token ${token}`;
      
      // Update state
      setIsAuthenticated(true);
      setUserProfile(userData);
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Failed to login. Please check your credentials.');
      throw error;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      
      // Use the api instance instead of axios directly
      const response = await api.post('/auth/register/', userData);
      
      // After successful registration, automatically log in the user
      return await login(userData.email, userData.password);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || 'Failed to register. Please try again.');
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call the logout endpoint
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('userProfile');
      
      // Remove the token from API headers
      delete api.defaults.headers.common['Authorization'];
      
      // Update state
      setIsAuthenticated(false);
      setUserProfile(null);
    }
  };

  // Update user profile
  const updateProfile = async (updatedData) => {
    try {
      setError(null);
      
      // Make a real API call to update the profile
      const response = await api.put('/auth/profile/', updatedData);
      
      // Get the updated profile from the response
      const updatedProfile = response.data;
      
      // Update local storage
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      // Update state
      setUserProfile(updatedProfile);
      
      return updatedProfile;
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.response?.data?.message || 'Failed to update profile. Please try again.');
      throw error;
    }
  };

  // Context value
  const value = {
    isAuthenticated,
    userProfile,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
