import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/ResetPassword.css';

export default function ResetPassword({ onBack, onSuccess, onError }) {
  // Extract token from URL parameters instead of props
  const { token: urlToken } = useParams();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    password: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  
  const redirectTimeoutRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Environment-based API URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Debug logging
  useEffect(() => {
    console.log('=== ResetPassword Debug ===');
    console.log('URL Token:', urlToken);
    console.log('Token Length:', urlToken?.length);
    console.log('Current URL:', window.location.href);
    console.log('========================');
  }, [urlToken]);

  // Focus password input on mount (after token validation)
  useEffect(() => {
    if (passwordInputRef.current && tokenValid) {
      passwordInputRef.current.focus();
    }
  }, [tokenValid]);

  // Validate token on mount
  useEffect(() => {
    const validateToken = () => {
      if (!urlToken) {
        console.error('No token found in URL');
        setTokenValid(false);
        setErrors({ 
          general: 'Invalid or missing reset token. Please request a new password reset.' 
        });
        setTokenValidated(true);
        return;
      }

      // For your current backend: tokens should be 64 characters (32 bytes as hex)
      if (urlToken.length !== 64) {
        console.error('Invalid token length:', urlToken.length);
        setTokenValid(false);
        setErrors({ 
          general: 'Invalid reset token format. Please request a new password reset.' 
        });
        setTokenValidated(true);
        return;
      }

      // Check if token contains only valid hex characters
      if (!/^[a-fA-F0-9]{64}$/.test(urlToken)) {
        console.error('Invalid token format - not hex');
        setTokenValid(false);
        setErrors({ 
          general: 'Invalid reset token format. Please request a new password reset.' 
        });
        setTokenValidated(true);
        return;
      }

      console.log('Token validation passed');
      setTokenValid(true);
      setErrors({});
      setTokenValidated(true);
    };

    validateToken();
  }, [urlToken]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const calculatePasswordStrength = useCallback((password) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;  // Changed from 8 to 6 to match backend
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z\d]/.test(password)) strength += 1;
    return strength;
  }, []);

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);
  const toggleConfirm = useCallback(() => setShowConfirm(prev => !prev), []);

  // FIXED: Updated validation to match backend requirements (6 characters minimum)
  const validateField = useCallback((name, value, allValues = {}) => {
    const currentForm = { ...form, ...allValues };
    
    switch (name) {
      case 'password':
        if (!value) return 'New password is required';
        // FIXED: Changed from 8 to 6 characters to match backend
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (value.length > 128) return 'Password is too long (max 128 characters)';
        return '';
      case 'confirm':
        if (!value) return 'Please confirm your password';
        if (value !== currentForm.password) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  }, [form]);

  // FIXED: Improved input change handler with proper error clearing
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      return newForm;
    });
    
    // Update password strength for password field
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    // FIXED: Clear errors immediately when user types valid input
    setTimeout(() => {
      const fieldError = validateField(name, value, { ...form, [name]: value });
      
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        
        if (fieldError) {
          newErrors[name] = fieldError;
        } else {
          delete newErrors[name]; // Remove error if field is now valid
        }
        
        // Also validate confirm field if password changed
        if (name === 'password' && form.confirm) {
          const confirmError = validateField('confirm', form.confirm, { password: value });
          if (confirmError) {
            newErrors.confirm = confirmError;
          } else {
            delete newErrors.confirm;
          }
        }
        
        return newErrors;
      });
    }, 100); // Small delay to ensure form state is updated

    // Clear general errors when user starts typing (but not success messages)
    if (errors.general && !message) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.general;
        return newErrors;
      });
    }
  }, [errors.general, message, validateField, calculatePasswordStrength, form]);

  const getPasswordStrengthText = useCallback(() => {
    switch (passwordStrength) {
      case 0: case 1: return 'Very Weak';
      case 2: return 'Weak';
      case 3: return 'Fair';
      case 4: return 'Good';
      case 5: return 'Strong';
      default: return '';
    }
  }, [passwordStrength]);

  const getPasswordStrengthColor = useCallback(() => {
    switch (passwordStrength) {
      case 0: case 1: return '#e63946';
      case 2: return '#f77f00';
      case 3: return '#fcbf49';
      case 4: return '#38b000';
      case 5: return '#2d8f47';
      default: return '#e0e0e0';
    }
  }, [passwordStrength]);

  // FIXED: Improved form validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!tokenValid) {
      setErrors({ 
        general: 'Invalid reset token. Please request a new password reset.' 
      });
      return;
    }

    if (!urlToken) {
      setErrors({ 
        general: 'Reset token is missing. Please request a new password reset.' 
      });
      return;
    }

    // Validate all fields
    const newErrors = {};
    Object.keys(form).forEach(key => {
      const error = validateField(key, form[key], form);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focus first error field
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.focus();
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsLoading(true);

    try {
      console.log('Submitting password reset for token:', urlToken);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/${urlToken}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          newPassword: form.password  // FIXED: Use 'newPassword' to match backend
        })
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        // Handle different error scenarios
        if (response.status === 400) {
          if (data.message && (
            data.message.toLowerCase().includes('token') ||
            data.message.toLowerCase().includes('expired') ||
            data.message.toLowerCase().includes('invalid')
          )) {
            setTokenValid(false);
            setErrors({ 
              general: 'This reset link has expired or is invalid. Please request a new password reset.' 
            });
          } else {
            setErrors({ general: data.message || 'Password reset failed. Please try again.' });
          }
        } else if (response.status === 404) {
          setErrors({ general: 'User not found. Please request a new password reset.' });
        } else if (response.status === 422) {
          // Validation errors from enhanced backend
          if (data.errors) {
            setErrors(data.errors);
          } else {
            setErrors({ general: data.message || 'Invalid password format.' });
          }
        } else if (response.status === 500) {
          setErrors({ general: 'Server error. Please try again later.' });
        } else {
          throw new Error(data.message || 'Reset failed. Please try again.');
        }
        
        onError && onError(data);
        return;
      }

      // Success - handle both current and enhanced backend response formats
      const successMessage = data.message || 
        'Password reset successful! You can now sign in with your new password.';
      
      setMessage(successMessage);
      setForm({ password: '', confirm: '' });
      setPasswordStrength(0);
      setErrors({}); // Clear all errors on success
      
      onSuccess && onSuccess(data);
      
      // Auto-redirect to sign in after 3 seconds
      redirectTimeoutRef.current = setTimeout(() => {
        if (onBack) {
          onBack();
        } else {
          navigate('/signin');
        }
      }, 3000);

    } catch (error) {
      console.error('Reset password error:', error);
      
      let errorMsg = 'Network error. Please check your connection and try again.';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMsg = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.name === 'SyntaxError') {
        errorMsg = 'Server response error. Please try again later.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrors({ general: errorMsg });
      onError && onError({ message: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = useCallback(() => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }
    if (onBack) {
      onBack();
    } else {
      navigate('/signin');
    }
  }, [onBack, navigate]);

  const handleRequestNewLink = useCallback(() => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }
    navigate('/forgot-password');
  }, [navigate]);

  // FIXED: Check for actual validation errors, not just password strength
  const isFormValid = form.password.length >= 6 && 
                     form.confirm && 
                     form.password === form.confirm &&
                     Object.keys(errors).length === 0;

  // Show loading state while validating token
  if (!tokenValidated) {
    return (
      <div className="reset-container">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Validating reset token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-container">
      {/* Left Side - Branding & Security Info */}
      <div className="reset-brand-section">
        <div className="brand-content">
          <div className="brand-header">
            <div className="brand-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h1>Secure Reset</h1>
            <p className="brand-tagline">Create Your New Password</p>
          </div>
          
          <div className="security-content">
            <h2>Almost There!</h2>
            <p>You're just one step away from regaining access to your QuizRipple account. Create a strong, secure password to protect your learning progress.</p>
            
            <div className="security-tips">
              <h3>Password Security Tips</h3>
              <div className="tip-item">
                <div className="tip-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="tip-text">
                  <h4>Use 6+ Characters</h4>
                  <p>Longer passwords are more secure</p>
                </div>
              </div>
              <div className="tip-item">
                <div className="tip-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="tip-text">
                  <h4>Mix Case & Numbers</h4>
                  <p>Combine uppercase, lowercase, and digits</p>
                </div>
              </div>
              <div className="tip-item">
                <div className="tip-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="tip-text">
                  <h4>Add Special Characters</h4>
                  <p>Include symbols like !@#$% for extra security</p>
                </div>
              </div>
              <div className="tip-item">
                <div className="tip-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="tip-text">
                  <h4>Avoid Common Words</h4>
                  <p>Don't use dictionary words or personal info</p>
                </div>
              </div>
            </div>

            <div className="reset-note">
              <div className="note-icon">
                <i className="fas fa-info-circle"></i>
              </div>
              <div className="note-text">
                <h4>One-Time Use</h4>
                <p>This reset link can only be used once and will expire for your security. After creating your new password, you'll be automatically redirected to sign in.</p>
              </div>
            </div>
          </div>
          
          <div className="brand-decoration">
            <div className="floating-element element-1">
              <i className="fas fa-lock"></i>
            </div>
            <div className="floating-element element-2">
              <i className="fas fa-key"></i>
            </div>
            <div className="floating-element element-3">
              <i className="fas fa-shield-alt"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Reset Form */}
      <div className="reset-form-section">
        <div className="form-container">
          <div className="form-header">
            <h3>Create New Password</h3>
            <p>Enter your new password below</p>
            {/* Token status indicator for debugging */}
            {process.env.NODE_ENV === 'development' && (
              <div className="debug-info">
                <small>
                  Token: {urlToken ? '✓ Present' : '✗ Missing'} | 
                  Valid: {tokenValid ? '✓' : '✗'} | 
                  Length: {urlToken?.length || 0}
                </small>
              </div>
            )}
          </div>

          {/* Success/Error Alerts */}
          {message && (
            <div className="alert success">
              <i className="fas fa-check-circle"></i>
              <div className="alert-content">
                <p>{message}</p>
                <div className="redirect-notice">
                  <i className="fas fa-clock"></i>
                  <span>Redirecting to sign in in 3 seconds...</span>
                </div>
              </div>
            </div>
          )}
          
          {errors.general && (
            <div className="alert error">
              <i className="fas fa-exclamation-circle"></i>
              <div className="alert-content">
                <p>{errors.general}</p>
                {!tokenValid && (
                  <div className="error-actions">
                    <button
                      type="button"
                      className="request-new-btn"
                      onClick={handleRequestNewLink}
                    >
                      Request New Reset Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tokenValid && (
            <form onSubmit={handleSubmit} noValidate className="reset-form">
              {/* New Password Field */}
              <div className="input-group">
                <label htmlFor="password">New Password</label>
                <div className={`input-wrapper ${errors.password ? 'error' : ''}`}>
                  <div className="input-icon">
                    <i className="fas fa-lock"></i>
                  </div>
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={form.password}
                    onChange={handleInputChange}
                    placeholder="Create a strong password"
                    disabled={isLoading}
                    autoComplete="new-password"
                    required
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePassword}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                
                {/* FIXED: Only show password strength when there's no error */}
                {form.password && !errors.password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill" 
                        style={{ 
                          width: `${(passwordStrength / 5) * 100}%`,
                          backgroundColor: getPasswordStrengthColor()
                        }}
                      />
                    </div>
                    <span 
                      className="strength-text"
                      style={{ color: getPasswordStrengthColor() }}
                    >
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                )}
                
                {/* FIXED: Only show error when there is one */}
                {errors.password && (
                  <div className="error-message" id="password-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="input-group">
                <label htmlFor="confirm">Confirm New Password</label>
                <div className={`input-wrapper ${errors.confirm ? 'error' : ''}`}>
                  <div className="input-icon">
                    <i className="fas fa-lock"></i>
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    id="confirm"
                    name="confirm"
                    value={form.confirm}
                    onChange={handleInputChange}
                    placeholder="Confirm your new password"
                    disabled={isLoading}
                    autoComplete="new-password"
                    required
                    aria-describedby={errors.confirm ? "confirm-error" : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={toggleConfirm}
                    disabled={isLoading}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                
                {/* FIXED: Only show error when there is one */}
                {errors.confirm && (
                  <div className="error-message" id="confirm-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>{errors.confirm}</span>
                  </div>
                )}
                
                {/* FIXED: Only show success when passwords match and no errors */}
                {form.confirm && form.password === form.confirm && !errors.confirm && !errors.password && (
                  <div className="success-message">
                    <i className="fas fa-check-circle"></i>
                    <span>Passwords match</span>
                  </div>
                )}
              </div>

              {/* FIXED: Submit Button with proper validation */}
              <button
                type="submit"
                className="submit-btn"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <i className="fas fa-check"></i>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security Note */}
          <div className="security-notice">
            <div className="notice-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="notice-text">
              <h4>Your Security Matters</h4>
              <p>After resetting your password, you'll be automatically signed out of all devices for security. You'll need to sign in again with your new password.</p>
            </div>
          </div>

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
