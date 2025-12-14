import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleButton from './GoogleButton';
import '../styles/SignIn.css';

export default function SignIn({ onSwitch, onForgot, onSuccess, onError }) {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  // Environment-based API URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const togglePassword = () => setShowPassword(!showPassword);

  const validate = () => {
    const newErrors = {};
    
    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific errors on input change
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({}); // Clear any previous errors

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data.field) {
          setErrors({ [data.field]: data.message });
        } else {
          setErrors({ general: data.message || 'Sign in failed' });
        }
        onError && onError(data);
        return;
      }

      // Store user data and token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setErrors({ success: 'Welcome back! Redirecting to your Landing Page...' });
      onSuccess && onSuccess(data);

      // Redirect after success message
      setTimeout(() => {
        navigate('/'); // Changed to dashboard for better UX
      }, 1500);

    } catch (error) {
      console.error('Sign in error:', error);
      const errorMsg = 'Network error. Please check your connection and try again.';
      setErrors({ general: errorMsg });
      onError && onError({ message: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrors({});

    try {
      console.log('Google Sign In clicked');
      // Google OAuth integration would go here
      // For demo purposes, simulate successful Google login
      setTimeout(() => {
        const googleUser = {
          name: 'Google User',
          email: 'user@gmail.com',
          avatar: 'https://ui-avatars.com/api/?name=Google+User&background=667eea&color=fff'
        };
        
        localStorage.setItem('authToken', 'google-mock-token');
        localStorage.setItem('user', JSON.stringify(googleUser));
        
        setErrors({ success: 'Google sign in successful! Redirecting...' });
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }, 2000);
      
    } catch (error) {
      console.error('Google sign in error:', error);
      setErrors({ general: 'Google sign in failed. Please try again.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignUpRedirect = () => {
    navigate('/signup');
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <div className="signin-container">
      {/* Left Side - Brand Section */}
      <div className="signin-brand-section">
        <div className="brand-content">
          <div className="brand-header">
            <div className="brand-icon">
              <i className="fas fa-brain"></i>
            </div>
            <h1>QuizRipple</h1>
            <p className="brand-tagline">Challenge Your Mind</p>
          </div>
          
          <div className="welcome-content">
            <h2>Welcome Back!</h2>
            {/* <p>Ready to continue your learning journey? Test your knowledge with thousands of engaging quizzes.</p> */}
            
            <div className="feature-highlights">
              <div className="feature-item">
                <i className="fas fa-trophy"></i>
                <span>Track Your Progress</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-users"></i>
                <span>Compete with Friends</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-chart-line"></i>
                <span>Improve Your Skills</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Decorative Elements */}
        <div className="brand-decoration">
          <div className="floating-element element-1"></div>
          <div className="floating-element element-2"></div>
          <div className="floating-element element-3"></div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="signin-form-section">
        <div className="form-container">
          <div className="form-header">
            <h3>Sign In</h3>
            <p>Enter your credentials to access your account</p>
          </div>

          {/* Alert Messages */}
          {errors.success && (
            <div className="alert success">
              <i className="fas fa-check-circle"></i>
              {errors.success}
            </div>
          )}
          
          {errors.general && (
            <div className="alert error">
              <i className="fas fa-exclamation-circle"></i>
              {errors.general}
            </div>
          )}

          <form className="signin-form" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className={`input-wrapper ${errors.email ? 'error' : ''}`}>
                <div className="input-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <div className="error-message">
                  <i className="fas fa-exclamation-triangle"></i>
                  {errors.email}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className={`input-wrapper ${errors.password ? 'error' : ''}`}>
                <div className="input-icon">
                  <i className="fas fa-lock"></i>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePassword}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
              {errors.password && (
                <div className="error-message">
                  <i className="fas fa-exclamation-triangle"></i>
                  {errors.password}
                </div>
              )}
            </div>

            {/* Forgot Password */}
            <div className="forgot-password">
              <button
                type="button"
                className="forgot-link"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <span>Or continue with</span>
          </div>

          {/* Google Sign In */}
          <GoogleButton
            onClick={handleGoogleSignIn}
            isLoading={isGoogleLoading}
            disabled={isLoading}
          />

          {/* Form Footer */}
          <div className="form-footer">
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="switch-link"
                onClick={handleSignUpRedirect}
                disabled={isLoading}
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
