// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import 'bootstrap/dist/css/bootstrap.min.css';

// Common pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
// import About from './pages/About';
// import Contact from './pages/Contact';

// User pages
import UserDashboard from './pages/user/Dashboard';
import MalariaDetection from './pages/user/MalariaDetection';
import DiseasePrediction from './pages/user/DiseasePredictor';
import EnhancedDiseasePrediction from './pages/user/EnhancedDiseasePrediction';
import DiagnosticHistory from './pages/user/DiagnosticHistory';
import UserProfile from './pages/user/Profile';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';

// Health worker pages
import HealthWorkerDashboard from './pages/healthworker/Dashboard';

// Pharmacy pages
import PharmacyDashboard from './pages/pharmacy/Dashboard';

// Hospital pages
import HospitalDashboard from './pages/hospital/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          {/* Uncomment these when you have the components ready */}
          {/* <Route path="/about" element={<About />} /> */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* <Route path="/contact" element={<Contact />} /> */}
          
          {/* User Routes */}
          <Route 
            path="/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['user', 'health_worker', 'pharmacy', 'hospital', 'admin']}>
                <UserDashboard />
              </PrivateRoute>
            }
          />
          <Route 
            path="/malaria-detection"
            element={
              <PrivateRoute allowedUserTypes={['user', 'health_worker']}>
                <MalariaDetection />
              </PrivateRoute>
            }
          />
          <Route 
            path="/disease-prediction"
            element={
              <PrivateRoute allowedUserTypes={['user', 'health_worker']}>
                <DiseasePrediction />
              </PrivateRoute>
            }
          />
          {/* NEW enhanced disease prediction route */}
          <Route 
            path="/enhanced-disease-prediction"
            element={
              <PrivateRoute allowedUserTypes={['user', 'health_worker']}>
                <EnhancedDiseasePrediction />
              </PrivateRoute>
            }
          />
          <Route 
            path="/diagnostic-history"
            element={
              <PrivateRoute allowedUserTypes={['user', 'health_worker']}>
                <DiagnosticHistory />
              </PrivateRoute>
            }
          />
          <Route 
            path="/profile"
            element={
              <PrivateRoute allowedUserTypes={['user', 'health_worker', 'pharmacy', 'hospital', 'admin']}>
                <UserProfile />
              </PrivateRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          
          {/* Health Worker Routes */}
          <Route 
            path="/health-worker/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['health_worker']}>
                <HealthWorkerDashboard />
              </PrivateRoute>
            }
          />
          
          {/* Pharmacy Routes */}
          <Route 
            path="/pharmacy/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['pharmacy']}>
                <PharmacyDashboard />
              </PrivateRoute>
            }
          />
          
          {/* Hospital Routes */}
          <Route 
            path="/hospital/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['hospital']}>
                <HospitalDashboard />
              </PrivateRoute>
            }
          />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
