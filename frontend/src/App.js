import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import all your components
import Landing from './components/Landing';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import Quiz from './components/Quiz';
import QuizDisplay from './components/QuizDisplay';
import Results from './components/Results';
import AllResults from './components/AllResults'; // NEW: Import AllResults component
import Profile from './components/Profile';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Terms from './components/Terms';
import Privacy from './components/Privacy';

// Import styles
import './styles/common.css';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Enhanced Protected Route Component with token verification
const ProtectedRoute = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
          setIsAuthenticated(false);
          setIsChecking(false);
          return;
        }

        // Verify token with backend (optional - falls back to local check)
        try {
          const response = await fetch(`${API_BASE_URL}/api/user/verify-token`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            setIsAuthenticated(data.valid || true);
            
            // Update user data if backend provided newer info
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user));
            }
          } else {
            // Token is invalid, clear auth data
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
          }
        } catch (apiError) {
          // If API is unavailable, allow offline mode with stored data
          console.warn('Token verification failed, using offline mode:', apiError);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="auth-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Verifying authentication...</h3>
          <p>Please wait while we check your credentials</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/signin" replace />;
};

// Enhanced Public Route Component
const PublicRoute = ({ children, redirectTo = "/" }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        setIsAuthenticated(!!(token && user));
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="auth-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Loading...</h3>
          <p>Preparing your experience</p>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to landing page instead of dashboard
  return !isAuthenticated ? children : <Navigate to={redirectTo} replace />;
};

// Main App Component
export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Handle URL parameters for global messages
        const params = new URLSearchParams(window.location.search);
        const successMsg = params.get('success');
        const errorMsg = params.get('error');
        
        if (successMsg) {
          setGlobalSuccess(decodeURIComponent(successMsg));
          setTimeout(() => setGlobalSuccess(''), 5000);
        }
        
        if (errorMsg) {
          setGlobalError(decodeURIComponent(errorMsg));
          setTimeout(() => setGlobalError(''), 5000);
        }
        
        // Clean up URL parameters
        if (successMsg || errorMsg) {
          const url = new URL(window.location);
          url.searchParams.delete('success');
          url.searchParams.delete('error');
          window.history.replaceState({}, '', url);
        }
        
        // Check if we need to initialize user preferences
        const userPrefs = localStorage.getItem('userPreferences');
        if (!userPrefs) {
          const defaultPrefs = {
            theme: 'light',
            language: 'en',
            emailNotifications: true,
            pushNotifications: false,
            weeklyReport: true,
            achievementAlerts: true
          };
          localStorage.setItem('userPreferences', JSON.stringify(defaultPrefs));
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setGlobalError('Failed to initialize app. Please refresh the page.');
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Auto-clear global messages
  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => setGlobalError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => setGlobalSuccess(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [globalSuccess]);

  // Enhanced authentication success handler
  const handleAuthSuccess = (userData) => {
    try {
      console.log('Authentication successful:', userData);
      
      // Store authentication data
      if (userData.token) {
        localStorage.setItem('authToken', userData.token);
      }
      
      if (userData.user) {
        localStorage.setItem('user', JSON.stringify(userData.user));
        
        // Initialize user stats if not present
        const existingStats = localStorage.getItem('userStats');
        if (!existingStats) {
          const defaultStats = {
            totalQuizzes: 0,
            averageScore: 0,
            bestScore: 0,
            streak: 0,
            rank: 'Beginner',
            quizzesThisWeek: 0,
            totalTime: 0
          };
          localStorage.setItem('userStats', JSON.stringify(defaultStats));
        }
        
        setGlobalSuccess(`Welcome ${userData.user.name || userData.user.firstName || 'to QuizRipples'}!`);
      }
      
      // Force a page reload to update all components with new auth state
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (error) {
      console.error('Error handling auth success:', error);
      setGlobalError('Authentication successful, but there was an error. Please try refreshing the page.');
    }
  };

  // Enhanced authentication error handler
  const handleAuthError = (error) => {
    console.error('Authentication error:', error);
    
    let errorMessage = 'An authentication error occurred. Please try again.';
    
    if (error && typeof error === 'object') {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error && error.field) {
        errorMessage = `${error.field}: ${error.message}`;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    setGlobalError(errorMessage);
  };

  // Enhanced logout handler
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Try to logout from backend
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.warn('Backend logout failed, proceeding with local logout:', error);
        }
      }
      
      // Clear all stored data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userStats');
      localStorage.removeItem('quiz-progress');
      localStorage.removeItem('quiz-results');
      localStorage.removeItem('quiz-current');
      
      setGlobalSuccess('Logged out successfully');
      
      // Navigate to home after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      console.error('Logout error:', error);
      setGlobalError('Error during logout. Please try again.');
    }
  };

  // Global error handler for network/app errors
  const handleGlobalError = (error) => {
    console.error('Global error:', error);
    
    let errorMessage = 'Something went wrong. Please try again.';
    
    if (error && error.message) {
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Session expired. Please sign in again.';
        // Auto logout on 401 errors
        setTimeout(() => {
          handleLogout();
        }, 2000);
      } else {
        errorMessage = error.message;
      }
    }
    
    setGlobalError(errorMessage);
  };

  // Enhanced global success handler
  const handleGlobalSuccess = (message) => {
    setGlobalSuccess(message);
  };

  // Loading screen for initialization
  if (!isInitialized) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-icon">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <h2>QuizRipples</h2>
          <div className="loading-spinner"></div>
          <p>Initializing your learning experience...</p>
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {/* Global Alerts */}
        {globalSuccess && (
          <div className="global-alert global-success">
            <div className="alert-content">
              <i className="fas fa-check-circle"></i>
              <span>{globalSuccess}</span>
            </div>
            <button 
              className="alert-close"
              onClick={() => setGlobalSuccess('')}
              aria-label="Close success notification"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        
        {globalError && (
          <div className="global-alert global-error">
            <div className="alert-content">
              <i className="fas fa-exclamation-circle"></i>
              <span>{globalError}</span>
            </div>
            <button 
              className="alert-close"
              onClick={() => setGlobalError('')}
              aria-label="Close error notification"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Main Routes */}
        <Routes>
          {/* Landing Page - Always accessible */}
          <Route 
            path="/" 
            element={
              <Landing 
                onLogout={handleLogout} 
                onError={handleGlobalError}
                onSuccess={handleGlobalSuccess}
              />
            } 
          />
          
          {/* Authentication Routes - Only accessible when not logged in */}
          <Route 
            path="/signin" 
            element={
              <PublicRoute redirectTo="/">
                <SignIn 
                  onSuccess={handleAuthSuccess}
                  onError={handleAuthError}
                />
              </PublicRoute>
            } 
          />
          
          <Route 
            path="/signup" 
            element={
              <PublicRoute redirectTo="/">
                <SignUp 
                  onSuccess={handleAuthSuccess}
                  onError={handleAuthError}
                />
              </PublicRoute>
            } 
          />
          
          <Route 
            path="/forgot-password" 
            element={
              <PublicRoute redirectTo="/">
                <ForgotPassword 
                  onError={handleAuthError}
                  onSuccess={handleGlobalSuccess}
                />
              </PublicRoute>
            } 
          />
          
          <Route 
            path="/reset-password/:token" 
            element={
              <PublicRoute redirectTo="/">
                <ResetPassword 
                  onSuccess={() => handleGlobalSuccess('Password reset successful! You can now sign in with your new password.')}
                  onError={handleAuthError}
                />
              </PublicRoute>
            } 
          />

          {/* Protected Routes - Only accessible when logged in
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard 
                  onLogout={handleLogout} 
                  onError={handleGlobalError}
                  onSuccess={handleGlobalSuccess}
                />
              </ProtectedRoute>
            } 
          /> */}
          
          <Route 
            path="/quiz" 
            element={
              <ProtectedRoute>
                <QuizDisplay 
                  onError={handleGlobalError}
                  onSuccess={handleGlobalSuccess}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/quiz/:quizId" 
            element={
              <ProtectedRoute>
                <Quiz 
                  onError={handleGlobalError}
                  onSuccess={handleGlobalSuccess}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* UPDATED: Results route for immediate quiz completion results */}
          <Route 
            path="/results" 
            element={
              <ProtectedRoute>
                <Results 
                  onError={handleGlobalError}
                  onSuccess={handleGlobalSuccess}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* NEW: All Results route for quiz history */}
          <Route 
            path="/all-results" 
            element={
              <ProtectedRoute>
                <AllResults 
                  onError={handleGlobalError}
                  onSuccess={handleGlobalSuccess}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* Individual result view by ID */}
          <Route 
            path="/results/:resultId" 
            element={
              <ProtectedRoute>
                <Results 
                  onError={handleGlobalError}
                  onSuccess={handleGlobalSuccess}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile 
                  onLogout={handleLogout}
                  onError={handleGlobalError}
                  onSuccess={handleGlobalSuccess}
                />
              </ProtectedRoute>
            } 
          />

          {/* Practice and Testing Routes */}
          <Route 
            path="/practice" 
            element={
              <ProtectedRoute>
                <QuizDisplay 
                  practiceMode={true} 
                  onError={handleGlobalError}
                  onSuccess={handleGlobalSuccess}
                />
              </ProtectedRoute>
            } 
          />

          {/* NEW: Test environment route for development */}
          <Route 
            path="/test-quiz" 
            element={
              <ProtectedRoute>
                <QuizDisplay 
                  testMode={true} 
                  onError={handleGlobalError}
                  onSuccess={handleGlobalSuccess}
                />
              </ProtectedRoute>
            } 
          />

          {/* Semi-Public Routes */}
          <Route 
            path="/leaderboard" 
            element={
              <AllResults 
                leaderboardMode={true} 
                onError={handleGlobalError}
              />
            } 
          />

          {/* Legal/Static Routes - Always accessible */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          
          {/* Help Routes */}
          <Route 
            path="/help" 
            element={
              <div className="help-page content-page">
                <div className="container">
                  <div className="page-header">
                    <h1>Help & Support</h1>
                    <p>Find answers to common questions and get support</p>
                  </div>
                  <div className="page-content">
                    <div className="help-sections">
                      <div className="help-section">
                        <h3>Getting Started</h3>
                        <p>Learn how to use QuizRipples effectively</p>
                      </div>
                      <div className="help-section">
                        <h3>Taking Quizzes</h3>
                        <p>Tips and guidelines for quiz taking</p>
                      </div>
                      <div className="help-section">
                        <h3>Account Management</h3>
                        <p>Manage your profile and preferences</p>
                      </div>
                    </div>
                    <div className="page-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => window.history.back()}
                      >
                        ← Go Back
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => window.location.href = '/'}
                      >
                        🏠 Home
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            } 
          />
          
          <Route 
            path="/contact" 
            element={
              <div className="contact-page content-page">
                <div className="container">
                  <div className="page-header">
                    <h1>Contact Us</h1>
                    <p>Get in touch with our support team</p>
                  </div>
                  <div className="page-content">
                    <div className="contact-info">
                      <div className="contact-method">
                        <h3>📧 Email Support</h3>
                        <p>support@QuizRipples.com</p>
                      </div>
                      <div className="contact-method">
                        <h3>💬 Live Chat</h3>
                        <p>Available 24/7 for premium users</p>
                      </div>
                      <div className="contact-method">
                        <h3>📚 Knowledge Base</h3>
                        <p>Find answers in our help center</p>
                      </div>
                    </div>
                    <div className="page-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => window.history.back()}
                      >
                        ← Go Back
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => window.location.href = '/'}
                      >
                        🏠 Home
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            } 
          />

          {/* Error Handling Routes */}
          <Route 
            path="/404" 
            element={
              <div className="error-page">
                <div className="container">
                  <div className="error-content">
                    <div className="error-icon">
                      <i className="fas fa-search"></i>
                    </div>
                    <h1>404 - Page Not Found</h1>
                    <p>The page you're looking for doesn't exist or has been moved.</p>
                    <div className="error-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => window.history.back()}
                      >
                        ← Go Back
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => window.location.href = '/'}
                      >
                        🏠 Go Home
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            } 
          />
          
          <Route 
            path="/unauthorized" 
            element={
              <div className="error-page">
                <div className="container">
                  <div className="error-content">
                    <div className="error-icon">
                      <i className="fas fa-lock"></i>
                    </div>
                    <h1>401 - Unauthorized</h1>
                    <p>You don't have permission to access this resource.</p>
                    <div className="error-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => window.location.href = '/signin'}
                      >
                        🔐 Sign In
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => window.location.href = '/'}
                      >
                        🏠 Go Home
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            } 
          />
          
          <Route 
            path="/server-error" 
            element={
              <div className="error-page">
                <div className="container">
                  <div className="error-content">
                    <div className="error-icon">
                      <i className="fas fa-server"></i>
                    </div>
                    <h1>500 - Server Error</h1>
                    <p>Something went wrong on our end. Please try again later.</p>
                    <div className="error-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => window.location.reload()}
                      >
                        🔄 Retry
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => window.location.href = '/'}
                      >
                        🏠 Go Home
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            } 
          />
          
          {/* Catch all route - redirect to 404 */}
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
