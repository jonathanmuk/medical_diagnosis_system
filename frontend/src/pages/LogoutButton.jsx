import React from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LogoutButton = ({ variant = "outline-danger", className = "" }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/'); // Redirect to homepage after logout
  };

  return (
    <Button 
      variant={variant} 
      className={className} 
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
};

export default LogoutButton;
