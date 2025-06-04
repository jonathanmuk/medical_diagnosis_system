import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedUserTypes = [] }) => {
  const { isAuthenticated, userProfile, loading } = useAuth();

  // If auth is still loading, you might want to show a loading spinner
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If user types are specified and user's type is not allowed, redirect to dashboard
  if (
    allowedUserTypes.length > 0 && 
    userProfile && 
    !allowedUserTypes.includes(userProfile.user_type)
  ) {
    // Redirect based on user type
    switch (userProfile.user_type) {
      case 'admin':
        return <Navigate to="/admin/dashboard" />;
      case 'health_worker':
        return <Navigate to="/health-worker/dashboard" />;
      case 'pharmacy':
        return <Navigate to="/pharmacy/dashboard" />;
      case 'hospital':
        return <Navigate to="/hospital/dashboard" />;
      case 'user':
      default:
        return <Navigate to="/dashboard" />;
    }
  }

  // If authenticated and authorized, render the protected component
  return children;
};

export default PrivateRoute;
