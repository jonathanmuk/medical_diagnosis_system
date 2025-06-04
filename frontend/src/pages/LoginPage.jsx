import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';

// Import icons
import { ExclamationTriangleIcon, EnvelopeClosedIcon, LockClosedIcon } from "@radix-ui/react-icons";

import Header from '../components/Header';
import Footer from '../components/Footer';

// Import custom CSS
import '../styles/login.css';

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
});

const LoginPage = () => {
  const { login, isAuthenticated, error } = useAuth();
  const [loginError, setLoginError] = useState(null);
  const navigate = useNavigate();

  // If user is already logged in, redirect to homepage
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setLoginError(null);
      await login(values.email, values.password);
      
      // Redirect to homepage after successful login
      navigate('/');
    } catch (error) {
      setLoginError(error.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2 className="login-title">Welcome back</h2>
            <p className="login-description">Enter your credentials to access your account</p>
          </div>
          
          <div className="login-content">
            {(loginError || error) && (
              <div className="error-alert">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <div>
                  <div className="font-medium">Authentication Error</div>
                  <div className="text-sm">{loginError || error}</div>
                </div>
              </div>
            )}
            
            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={LoginSchema}
              onSubmit={handleSubmit}
            >
              {({
                values,
                errors,
                touched,
                handleChange,
                handleBlur,
                handleSubmit,
                isSubmitting,
              }) => (
                <form onSubmit={handleSubmit}>
                  <div className="form-field">
                    <div className="form-label">
                      <label htmlFor="email" className="label-text">Email</label>
                      {touched.email && errors.email && (
                        <span className="error-message">{errors.email}</span>
                      )}
                    </div>
                    <div className="input-with-icon">
                      <EnvelopeClosedIcon className="icon h-4 w-4" />
                      <input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="name@example.com"
                        value={values.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={touched.email && errors.email ? 'error' : ''}
                      />
                    </div>
                  </div>
                  
                  <div className="form-field">
                    <div className="form-label">
                      <label htmlFor="password" className="label-text">Password</label>
                      {touched.password && errors.password && (
                        <span className="error-message">{errors.password}</span>
                      )}
                    </div>
                    <div className="input-with-icon">
                      <LockClosedIcon className="icon h-4 w-4" />
                      <input
                        id="password"
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        value={values.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={touched.password && errors.password ? 'error' : ''}
                      />
                    </div>
                    <div className="text-right mt-2">
                      <Link to="/forgot-password" className="forgot-password">
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="login-button"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Signing in...' : 'Sign in'}
                    </button>
                  </div>
                </form>
              )}
            </Formik>
          </div>
          
          <div className="login-footer">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="register-link">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default LoginPage;
