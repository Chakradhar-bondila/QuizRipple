import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ForgotPassword.css';

export default function ForgotPassword({ onBack, onResetSent, onError }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);

  const navigate = useNavigate();
  const emailInputRef = useRef(null);
  const cooldownIntervalRef = useRef(null);
  const messageTimeoutRef = useRef(null);

  // Environment-based API URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Focus email input on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTime > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            clearInterval(cooldownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(cooldownIntervalRef.current);
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldownTime]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  // Enhanced email validation function
  const validateEmail = (email) => {
    if (!email) return false;
    
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Additional checks
    const isValidFormat = emailRegex.test(email);
    const isValidLength = email.length <= 254 && email.length >= 5;
    const hasValidDomain = email.split('@')[1]?.includes('.');
    
    return isValidFormat && isValidLength && hasValidDomain;
  };

  // Handle email input change
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear previous messages when user starts typing
    if (error) setError('');
    if (message) setMessage('');
    
    // Real-time email validation (only show error after user stops typing)
    if (value.trim()) {
      const isValid = validateEmail(value.trim());
      setIsEmailValid(isValid);
    } else {
      setIsEmailValid(true); // Don't show error for empty field
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setMessage('');
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    // Validation checks
    if (!trimmedEmail) {
      setError('Email address is required.');
      emailInputRef.current?.focus();
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      setIsEmailValid(false);
      emailInputRef.current?.focus();
      return;
    }

    // Enhanced rate limiting check
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptTime;
    
    if (attempts >= 3 && cooldownTime > 0) {
      setError(`Too many attempts. Please wait ${cooldownTime} seconds before trying again.`);
      return;
    }

    // Prevent rapid successive attempts
    if (timeSinceLastAttempt < 3000) { // 3 seconds between attempts
      setError('Please wait a moment before trying again.');
      return;
    }

    setIsLoading(true);
    setLastAttemptTime(now);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          email: trimmedEmail
        })
      });

      const data = await response.json();

      // Handle different response formats (current and enhanced backend)
      if (!response.ok) {
        // Enhanced backend error format
        if (data.error && data.message) {
          throw new Error(data.message);
        }
        // Original backend error format
        throw new Error(data.message || 'Failed to send reset email');
      }

      // Success handling for both backend formats
      const successMsg = data.message || 
        'If an account with this email exists, you will receive a password reset link shortly.';
      
      setMessage(successMsg);
      setEmail('');
      setAttempts(0);
      setCooldownTime(0);
      setIsEmailValid(true);
      
      // Callback for successful reset email sent
      if (onResetSent) {
        onResetSent({
          email: trimmedEmail,
          resetToken: data.resetToken, // May not exist in current backend
          success: true
        });
      }
      
      // Auto-hide success message after 15 seconds
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = setTimeout(() => {
        setMessage('');
      }, 15000);
      
    } catch (err) {
      console.error('Forgot password error:', err);
      
      let errorMsg = 'Unable to process your request. Please try again later.';
      
      // Handle specific error types
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMsg = 'Unable to connect to server. Please check your internet connection.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      
      if (onError) {
        onError({ 
          message: errorMsg, 
          email: trimmedEmail,
          attempts: attempts + 1
        });
      }
      
      // Implement progressive rate limiting
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setCooldownTime(60); // 60 seconds cooldown after 3 attempts
      } else if (newAttempts >= 2) {
        setCooldownTime(10); // 10 seconds cooldown after 2 attempts
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend functionality
  const handleResend = async () => {
    if (cooldownTime === 0 && !isLoading) {
      // Simulate form submission for resend
      const syntheticEvent = {
        preventDefault: () => {}
      };
      await handleSubmit(syntheticEvent);
    }
  };

  // Handle back navigation
  const handleBackToSignIn = () => {
    // Clear any ongoing timers
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }
    
    if (onBack) {
      onBack();
    } else {
      navigate('/signin');
    }
  };

  // Calculate button disabled state
  const isButtonDisabled = isLoading || 
                          !email.trim() || 
                          !isEmailValid || 
                          (attempts >= 3 && cooldownTime > 0);

  return (
    <div className="forgot-container">
      {/* Left Side - Branding & Support */}
      <div className="forgot-brand-section">
        <div className="brand-content">
          <div className="brand-header">
            <div className="brand-icon">
              <i className="fas fa-key"></i>
            </div>
            <h1>Account Recovery</h1>
            <p className="brand-tagline">Get Back to Learning</p>
          </div>
          
          <div className="recovery-content">
            <h2>Forgot Your Password?</h2>
            <p>Don't worry! It happens to the best of us. We'll help you get back to your quizzes in no time.</p>
            
            <div className="recovery-steps">
              <div className="step-item">
                <div className="step-icon">
                  <span className="step-number">1</span>
                </div>
                <div className="step-text">
                  <h4>Enter Your Email</h4>
                  <p>Provide the email address associated with your account</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-icon">
                  <span className="step-number">2</span>
                </div>
                <div className="step-text">
                  <h4>Check Your Inbox</h4>
                  <p>We'll send you a secure password reset link</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-icon">
                  <span className="step-number">3</span>
                </div>
                <div className="step-text">
                  <h4>Create New Password</h4>
                  <p>Follow the link to set up a new secure password</p>
                </div>
              </div>
            </div>

            <div className="security-note">
              <div className="security-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <div className="security-text">
                <h4>Security First</h4>
                <p>Your password reset link will expire in 1 hour for your security. We take your account protection seriously.</p>
              </div>
            </div>
          </div>
          
          <div className="brand-decoration">
            <div className="floating-element element-1">
              <i className="fas fa-envelope"></i>
            </div>
            <div className="floating-element element-2">
              <i className="fas fa-lock"></i>
            </div>
            <div className="floating-element element-3">
              <i className="fas fa-check-circle"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Reset Form */}
      <div className="forgot-form-section">
        <div className="form-container">
          <div className="form-header">
            <h3>Reset Password</h3>
            <p>Enter your email to receive reset instructions</p>
          </div>

          {/* Success Alert */}
          {message && (
            <div className="alert success">
              <i className="fas fa-check-circle"></i>
              <div className="alert-content">
                <p>{message}</p>
                <div className="success-actions">
                  <button 
                    type="button" 
                    className="resend-btn"
                    onClick={handleResend}
                    disabled={cooldownTime > 0 || isLoading}
                  >
                    {cooldownTime > 0 
                      ? `Resend in ${cooldownTime}s` 
                      : "Didn't receive the email? Resend"
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Alert */}
          {error && (
            <div className="alert error">
              <i className="fas fa-exclamation-circle"></i>
              <div className="alert-content">
                <p>{error}</p>
                {attempts >= 2 && (
                  <div className="error-help">
                    <small>
                      <i className="fas fa-info-circle"></i>
                      Having trouble? Make sure you're using the correct email address.
                    </small>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="forgot-form">
            {/* Email Field */}
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className={`input-wrapper ${!isEmailValid && email ? 'error' : ''}`}>
                <div className="input-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <input
                  ref={emailInputRef}
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your registered email"
                  disabled={isLoading}
                  autoComplete="email"
                  maxLength={254}
                  required
                  aria-describedby={!isEmailValid && email ? "email-error" : "email-help"}
                />
                {isLoading && (
                  <div className="input-loading">
                    <div className="input-spinner"></div>
                  </div>
                )}
              </div>
              
              {!isEmailValid && email && (
                <div className="error-message" id="email-error">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>Please enter a valid email address</span>
                </div>
              )}
              
              <div className="help-text" id="email-help">
                <i className="fas fa-info-circle"></i>
                <span>We'll send reset instructions to this email address</span>
              </div>
            </div>

            {/* Rate Limiting Notice */}
            {cooldownTime > 0 && (
              <div className="cooldown-notice">
                <i className="fas fa-clock"></i>
                <span>
                  Please wait <strong>{cooldownTime} second{cooldownTime !== 1 ? 's' : ''}</strong> before trying again
                </span>
                <div className="cooldown-bar">
                  <div 
                    className="cooldown-fill" 
                    style={{ 
                      width: `${((60 - cooldownTime) / 60) * 100}%`,
                      transition: 'width 1s linear'
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={isButtonDisabled}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <i className="fas fa-paper-plane"></i>
                </>
              )}
            </button>
          </form>

          {/* Help Section */}
          <div className="help-section">
            <h4>Need Additional Help?</h4>
            <ul className="help-list">
              <li>
                <i className="fas fa-check"></i>
                <span>Ensure you're using the email associated with your account</span>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <span>Check your spam/junk folder if you don't see the email</span>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <span>Reset links expire in 1 hour for security</span>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <span>You can request a new link if the previous one expired</span>
              </li>
            </ul>
          </div>

          {/* Attempts Counter (for debugging/transparency) */}
          {attempts > 0 && (
            <div className="attempts-notice">
              <i className="fas fa-info-circle"></i>
              <span>
                Attempts: {attempts}/3
                {attempts >= 3 && cooldownTime === 0 && (
                  <span className="reset-notice"> - Counter reset</span>
                )}
              </span>
            </div>
          )}

          {/* Form Footer */}
          <div className="form-footer">
            <p>
              Remember your password?{' '}
              <button
                type="button"
                className="back-link"
                onClick={handleBackToSignIn}
                disabled={isLoading}
              >
                Back to Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
