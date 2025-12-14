 import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleButton from './GoogleButton';
import '../styles/SignUp.css';

export default function SignUp({ 
  onSwitch = () => {}, 
  onSuccess = () => {}, 
  onError = () => {} 
}) {
  const navigate = useNavigate();
  const nameInputRef = useRef(null);
  const otpInputRef = useRef(null);
  const redirectTimeoutRef = useRef(null);
  const otpTimerRef = useRef(null);

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    mobile: '', dob: '', gender: '', terms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, 3 (OTP verification)

  // NEW: OTP-related state
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [tempUserData, setTempUserData] = useState(null);
  const [resendCount, setResendCount] = useState(0);

  // Environment-based API URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Focus name input on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // NEW: OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      otpTimerRef.current = setTimeout(() => {
        setOtpCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (otpTimerRef.current) {
        clearTimeout(otpTimerRef.current);
      }
    };
  }, [otpCountdown]);

  // Focus OTP input when step 3 is reached
  useEffect(() => {
    if (currentStep === 3 && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current.focus();
      }, 100);
    }
  }, [currentStep]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (otpTimerRef.current) {
        clearTimeout(otpTimerRef.current);
      }
    };
  }, []);

  const calculatePasswordStrength = useCallback((password) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z\d]/.test(password)) strength += 1;
    return strength;
  }, []);

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);
  const toggleConfirm = useCallback(() => setShowConfirm(prev => !prev), []);

  const validateField = useCallback((name, value, allValues = form) => {
    switch (name) {
      case 'name':
        if (!value || !value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        if (value.trim().length > 50) return 'Name must be less than 50 characters';
        if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) return 'Name can only contain letters, spaces, hyphens and apostrophes';
        return '';
      case 'email':
        if (!value) return 'Email is required';
        if (value.length > 254) return 'Email is too long';
        if (!value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (value.length > 128) return 'Password is too long (max 128 characters)';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Password must contain uppercase, lowercase, and number';
        }
        return '';
      case 'confirm':
        if (!value) return 'Please confirm your password';
        if (value !== allValues.password) return 'Passwords do not match';
        return '';
      case 'mobile':
        if (!value) return 'Mobile number is required';
        const cleanMobile = value.replace(/[\s\-\(\)]/g, '');
        if (!/^[\+]?[0-9]{10,15}$/.test(cleanMobile)) {
          return 'Please enter a valid mobile number (10-15 digits)';
        }
        return '';
      case 'dob':
        if (!value) return 'Date of birth is required';
        const today = new Date();
        const birthDate = new Date(value);
        
        if (birthDate > today) return 'Date of birth cannot be in the future';
        
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        
        if (actualAge < 13) return 'You must be at least 13 years old';
        if (actualAge > 120) return 'Please enter a valid date of birth';
        return '';
      case 'gender':
        if (!value) return 'Please select your gender';
        if (!['male', 'female', 'other', 'prefer-not-to-say'].includes(value)) {
          return 'Please select a valid gender option';
        }
        return '';
      case 'terms':
        if (!value) return 'You must accept the Terms & Conditions';
        return '';
      case 'otp':
        if (!value) return 'OTP is required';
        if (!/^\d{6}$/.test(value)) return 'OTP must be exactly 6 digits';
        return '';
      default:
        return '';
    }
  }, [form]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    // Sanitize input for name field
    if (name === 'name') {
      newValue = value.replace(/[^\w\s'-]/gi, '');
    }
    
    // Clean mobile number input
    if (name === 'mobile') {
      newValue = value.replace(/[^\d\+\-\(\)\s]/g, '');
    }
    
    // NEW: Handle OTP input - only allow 6 digits
    if (name === 'otp') {
      newValue = value.replace(/\D/g, '').slice(0, 6);
    }
    
    if (name === 'otp') {
      setOtp(newValue);
    } else {
      setForm(prev => ({ ...prev, [name]: newValue }));
    }
    
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(newValue));
    }
    
    // Clear field-specific errors
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear general errors when user starts typing
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }

    // Real-time confirm password validation
    if (name === 'password' && form.confirm) {
      const confirmError = validateField('confirm', form.confirm, { ...form, password: newValue });
      setErrors(prev => ({ ...prev, confirm: confirmError }));
    }
  }, [errors, form, validateField, calculatePasswordStrength]);

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

  const nextStep = () => {
    const step1Fields = ['name', 'email', 'password', 'confirm'];
    const step1Errors = {};
    
    step1Fields.forEach(field => {
      const error = validateField(field, form[field], form);
      if (error) step1Errors[field] = error;
    });

    setErrors(step1Errors);

    if (Object.keys(step1Errors).length === 0) {
      setCurrentStep(2);
      setTimeout(() => {
        const mobileInput = document.querySelector('input[name="mobile"]');
        if (mobileInput) mobileInput.focus();
      }, 100);
    } else {
      const firstErrorField = Object.keys(step1Errors)[0];
      document.querySelector(`[name="${firstErrorField}"]`)?.focus();
    }
  };

  // NEW: Function to proceed to OTP verification
  const proceedToOtp = async () => {
    const step2Fields = ['mobile', 'dob', 'gender', 'terms'];
    const step2Errors = {};
    
    step2Fields.forEach(field => {
      const error = validateField(field, form[field], form);
      if (error) step2Errors[field] = error;
    });

    setErrors(step2Errors);

    if (Object.keys(step2Errors).length === 0) {
      await sendOtp();
    } else {
      const firstErrorField = Object.keys(step2Errors)[0];
      document.querySelector(`[name="${firstErrorField}"]`)?.focus();
    }
  };

  const prevStep = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
      setOtp('');
      setOtpSent(false);
      setOtpCountdown(0);
    } else {
      setCurrentStep(1);
      setErrors({});
    }
    
    setTimeout(() => {
      const focusField = currentStep === 3 ? 'gender' : 'password';
      const element = document.querySelector(`[name="${focusField}"]`);
      if (element) element.focus();
    }, 100);
  };

  // NEW: Send OTP function
  const sendOtp = async () => {
    setOtpLoading(true);
    setErrors({});

    try {
      const { confirm, ...submitData } = form;
      
      if (submitData.mobile) {
        submitData.mobile = submitData.mobile.replace(/[\s\-\(\)]/g, '');
      }

      console.log('Sending OTP for:', { email: submitData.email });

      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error && data.field) {
          setErrors({ [data.field]: data.message });
          if (data.field === 'email') {
            setCurrentStep(1);
          }
        } else {
          setErrors({ general: data.message || 'Failed to send OTP. Please try again.' });
        }
        return;
      }

      // Success - OTP sent
      setTempUserData(submitData);
      setOtpSent(true);
      setCurrentStep(3);
      setOtpCountdown(300); // 5 minutes
      setResendCount(prev => prev + 1);
      setErrors({ 
        success: `🔐 OTP sent to ${submitData.email}. Please check your inbox and enter the 6-digit code.` 
      });

    } catch (error) {
      console.error('Send OTP error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setOtpLoading(false);
    }
  };

  // NEW: Resend OTP function
  const resendOtp = async () => {
    if (resendCount >= 3) {
      setErrors({ general: 'Maximum resend attempts reached. Please try again later.' });
      return;
    }
    
    if (otpCountdown > 0) {
      setErrors({ general: `Please wait ${otpCountdown} seconds before requesting a new OTP.` });
      return;
    }

    await sendOtp();
  };

  // Safe function call helper
  const safeCall = (fn, ...args) => {
    if (typeof fn === 'function') {
      try {
        return fn(...args);
      } catch (error) {
        console.error('Error calling function:', error);
      }
    }
  };

  // Enhanced authentication and redirect function
  const authenticateAndRedirect = (userData, token) => {
    try {
      if (token) {
        localStorage.setItem('authToken', token);
      }
      
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      }
      
      setTimeout(() => {
        navigate('/dashboard', { 
          replace: true,
          state: { 
            welcomeMessage: `Welcome ${userData?.name || form.name}! Your account has been created successfully.`,
            isNewUser: true,
            justSignedUp: true
          }
        });
        
        window.dispatchEvent(new Event('storage'));
      }, 100);
      
    } catch (error) {
      console.error('Error setting authentication:', error);
      navigate('/', { replace: true });
    }
  };

  // NEW: Verify OTP and create account
  const verifyOtpAndCreateAccount = async (e) => {
    e.preventDefault();
    
    // Validate OTP
    const otpError = validateField('otp', otp);
    if (otpError) {
      setErrors({ otp: otpError });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Verifying OTP and creating account...');

      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          ...tempUserData,
          otp: otp
        }),
      });

      const data = await response.json();
      console.log('OTP verification response:', { 
        ...data, 
        token: data.token ? '[PRESENT]' : '[MISSING]',
        emailSent: data.emailSent
      });

      if (!response.ok) {
        if (data.message && data.message.toLowerCase().includes('otp')) {
          setErrors({ otp: data.message });
        } else {
          setErrors({ general: data.message || 'Verification failed. Please try again.' });
        }
        return;
      }

      // SUCCESS - Account created
      let successMessage = data.message || 'Account created successfully!';
      
      if (data.emailSent) {
        successMessage += ' 📧 A welcome email has been sent to your inbox.';
      } else {
        successMessage += ' ⚠️ Account created but welcome email could not be sent.';
      }
      
      setErrors({ 
        success: successMessage,
        emailStatus: data.emailSent ? 'sent' : 'failed',
        emailMessage: data.emailMessage
      });
      
      safeCall(onSuccess, { 
        ...data, 
        emailSent: data.emailSent,
        emailMessage: data.emailMessage 
      });

      const userData = {
        id: data.user?.id || data.id,
        name: data.user?.name || form.name,
        email: data.user?.email || form.email,
        mobile: data.user?.mobile || form.mobile,
        dob: data.user?.dob || form.dob,
        gender: data.user?.gender || form.gender,
        isEmailVerified: true, // Email is verified via OTP
        totalQuizzes: 0,
        quizzesCompleted: 0,
        lastQuizScore: 0,
        averageScore: 0,
        rank: 'Beginner',
        achievements: [],
        createdAt: new Date().toISOString(),
        ...data.user
      };

      redirectTimeoutRef.current = setTimeout(() => {
        authenticateAndRedirect(userData, data.token);
      }, 2500);

    } catch (error) {
      console.error('OTP verification error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setErrors({});
    
    try {
      setErrors({ 
        general: 'Google Sign Up is coming soon! Please use the regular signup form for now.' 
      });
    } catch (error) {
      console.error('Google sign up error:', error);
      setErrors({ general: 'Google sign up failed. Please try the regular signup form.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSwitchToSignIn = () => {
    try {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      
      safeCall(onSwitch);
      navigate('/signin', { replace: true });
    } catch (error) {
      console.error('Error navigating to sign in:', error);
      navigate('/signin');
    }
  };

  // NEW: Format countdown time
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="signup-container">
      {/* Left Side - Branding & Welcome */}
      <div className="signup-brand-section">
        <div className="brand-content">
          <div className="brand-header">
            <div className="brand-icon">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <h1>Join QuizRipple</h1>
            <p className="brand-tagline">Start Your Learning Adventure</p>
            <p className="brand-tagline">Join thousands mastering their skills. Test smarter. Learn faster.</p>
          </div>
          
          <div className="welcome-content">
            <h2>Create Your Account</h2>
            
            <div className="signup-benefits">
              <div className="benefit-item">
                <div className="benefit-icon">
                  <i className="fas fa-infinity"></i>
                </div>
                <div className="benefit-text">
                  <h4>Unlimited Access</h4>
                  <p>Access thousands of quizzes across multiple subjects</p>
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">
                  <i className="fas fa-medal"></i>
                </div>
                <div className="benefit-text">
                  <h4>Earn Achievements</h4>
                  <p>Unlock badges and track your learning progress</p>
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">
                  <i className="fas fa-users-cog"></i>
                </div>
                <div className="benefit-text">
                  <h4>Personalized Learning</h4>
                  <p>Get recommendations based on your performance</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* UPDATED: Step indicator for 3 steps */}
          <div className="step-indicator">
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <span>Basic Info</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <span>Additional Details</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <span>Verify Email</span>
            </div>
          </div>
          
          <div className="brand-decoration">
            <div className="floating-quiz-icon icon-1">
              <i className="fas fa-question"></i>
            </div>
            <div className="floating-quiz-icon icon-2">
              <i className="fas fa-lightbulb"></i>
            </div>
            <div className="floating-quiz-icon icon-3">
              <i className="fas fa-star"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="signup-form-section">
        <div className="form-container">
          <div className="form-header">
            <h3>Create Account</h3>
            <p>
              Step {currentStep} of 3: {
                currentStep === 1 ? 'Basic Information' : 
                currentStep === 2 ? 'Additional Details' : 
                'Email Verification'
              }
            </p>
          </div>

          {/* Success/Error Alerts */}
          {errors.success && (
            <div className="alert success">
              <i className="fas fa-check-circle"></i>
              <div className="alert-content">
                <p>{errors.success}</p>
                
                {/* Email Status Indicator */}
                {errors.emailStatus && currentStep === 3 && (
                  <div className="email-status">
                    {errors.emailStatus === 'sent' ? (
                      <div className="email-sent">
                        <i className="fas fa-envelope-check"></i>
                        <span>Welcome email sent successfully! Check your inbox.</span>
                      </div>
                    ) : (
                      <div className="email-failed">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>Welcome email couldn't be sent - but your account is ready!</span>
                      </div>
                    )}
                  </div>
                )}
                
                {currentStep === 3 && errors.emailStatus && (
                  <div className="redirect-notice">
                    <i className="fas fa-clock"></i>
                    <span>Redirecting to your dashboard...</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {errors.general && (
            <div className="alert error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={currentStep === 3 ? verifyOtpAndCreateAccount : (e) => e.preventDefault()} noValidate className="signup-form">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="form-step">
                {/* Name Field */}
                <div className="input-group">
                  <label htmlFor="name">Full Name</label>
                  <div className={`input-wrapper ${errors.name ? 'error' : ''}`}>
                    <div className="input-icon">
                      <i className="fas fa-user"></i>
                    </div>
                    <input
                      ref={nameInputRef}
                      type="text"
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      disabled={isLoading}
                      autoComplete="name"
                      maxLength={50}
                      required
                    />
                  </div>
                  {errors.name && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>{errors.name}</span>
                    </div>
                  )}
                </div>

                {/* Email Field */}
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
                      maxLength={254}
                      required
                    />
                  </div>
                  {errors.email && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>

                {/* Password Field */}
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
                      placeholder="Create a strong password (min 6 characters)"
                      disabled={isLoading}
                      autoComplete="new-password"
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePassword}
                      disabled={isLoading}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {form.password && (
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
                  {errors.password && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>{errors.password}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="input-group">
                  <label htmlFor="confirm">Confirm Password</label>
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
                      placeholder="Confirm your password"
                      disabled={isLoading}
                      autoComplete="new-password"
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={toggleConfirm}
                      disabled={isLoading}
                    >
                      <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {errors.confirm && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>{errors.confirm}</span>
                    </div>
                  )}
                  {form.confirm && form.password === form.confirm && !errors.confirm && (
                    <div className="success-message">
                      <i className="fas fa-check-circle"></i>
                      <span>Passwords match</span>
                    </div>
                  )}
                </div>

                <div className="step-actions">
                  <button
                    type="button"
                    className="next-btn"
                    onClick={nextStep}
                    disabled={isLoading}
                  >
                    <span>Continue</span>
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>

                <div className="divider">
                  <span>or</span>
                </div>

                <GoogleButton 
                  onClick={handleGoogleSignUp}
                  disabled={isLoading || isGoogleLoading}
                  loading={isGoogleLoading}
                  text="Sign up with Google"
                />
              </div>
            )}

            {/* Step 2: Additional Information */}
            {currentStep === 2 && (
              <div className="form-step">
                {/* Mobile Field */}
                <div className="input-group">
                  <label htmlFor="mobile">Mobile Number</label>
                  <div className={`input-wrapper ${errors.mobile ? 'error' : ''}`}>
                    <div className="input-icon">
                      <i className="fas fa-phone"></i>
                    </div>
                    <input
                      type="tel"
                      id="mobile"
                      name="mobile"
                      value={form.mobile}
                      onChange={handleInputChange}
                      placeholder="Enter your mobile number"
                      disabled={isLoading}
                      autoComplete="tel"
                      maxLength={20}
                      required
                    />
                  </div>
                  {errors.mobile && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>{errors.mobile}</span>
                    </div>
                  )}
                </div>

                {/* Date of Birth and Gender Row */}
                <div className="form-row">
                  <div className="input-group">
                    <label htmlFor="dob">Date of Birth</label>
                    <div className={`input-wrapper ${errors.dob ? 'error' : ''}`}>
                      <div className="input-icon">
                        <i className="fas fa-calendar"></i>
                      </div>
                      <input
                        type="date"
                        id="dob"
                        name="dob"
                        value={form.dob}
                        onChange={handleInputChange}
                        max={new Date(new Date().getFullYear() - 13, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                        min={new Date(new Date().getFullYear() - 120, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    {errors.dob && (
                      <div className="error-message">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>{errors.dob}</span>
                      </div>
                    )}
                  </div>

                  <div className="input-group">
                    <label htmlFor="gender">Gender</label>
                    <div className={`input-wrapper ${errors.gender ? 'error' : ''}`}>
                      <div className="input-icon">
                        <i className="fas fa-venus-mars"></i>
                      </div>
                      <select
                        id="gender"
                        name="gender"
                        value={form.gender}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </div>
                    {errors.gender && (
                      <div className="error-message">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>{errors.gender}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="checkbox-group">
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="terms"
                      name="terms"
                      checked={form.terms}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      required
                    />
                    <label htmlFor="terms" className="checkbox-label">
                      I agree to the{' '}
                      <a href="/terms" className="terms-link" target="_blank" rel="noopener noreferrer">
                        Terms & Conditions
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" className="terms-link" target="_blank" rel="noopener noreferrer">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                  {errors.terms && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>{errors.terms}</span>
                    </div>
                  )}
                </div>

                <div className="step-actions">
                  <button
                    type="button"
                    className="back-btn"
                    onClick={prevStep}
                    disabled={isLoading || otpLoading}
                  >
                    <i className="fas fa-arrow-left"></i>
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    className="submit-btn"
                    onClick={proceedToOtp}
                    disabled={isLoading || otpLoading}
                  >
                    {otpLoading ? (
                      <>
                        <div className="spinner"></div>
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <i className="fas fa-paper-plane"></i>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* NEW: Step 3: OTP Verification */}
            {currentStep === 3 && (
              <div className="form-step">
                <div className="otp-section">
                  <div className="otp-header">
                    <div className="otp-icon">
                      <i className="fas fa-shield-alt"></i>
                    </div>
                    <h4>Email Verification</h4>
                    <p>We've sent a 6-digit verification code to</p>
                    <p className="email-highlight">{form.email}</p>
                  </div>

                  <div className="input-group">
                    <label htmlFor="otp">Enter Verification Code</label>
                    <div className={`input-wrapper otp-input ${errors.otp ? 'error' : ''}`}>
                      <div className="input-icon">
                        <i className="fas fa-key"></i>
                      </div>
                      <input
                        ref={otpInputRef}
                        type="text"
                        id="otp"
                        name="otp"
                        value={otp}
                        onChange={handleInputChange}
                        placeholder="Enter 6-digit code"
                        disabled={isLoading}
                        maxLength={6}
                        autoComplete="one-time-code"
                        className="otp-field"
                        required
                      />
                    </div>
                    {errors.otp && (
                      <div className="error-message">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>{errors.otp}</span>
                      </div>
                    )}

                    {/* OTP Timer and Resend */}
                    <div className="otp-footer">
                      {otpCountdown > 0 ? (
                        <div className="otp-timer">
                          <i className="fas fa-clock"></i>
                          <span>Code expires in {formatCountdown(otpCountdown)}</span>
                        </div>
                      ) : (
                        <div className="otp-resend">
                          <span>Didn't receive the code?</span>
                          <button
                            type="button"
                            className="resend-link"
                            onClick={resendOtp}
                            disabled={otpLoading || resendCount >= 3}
                          >
                            {otpLoading ? 'Sending...' : 'Resend OTP'}
                          </button>
                          {resendCount > 0 && (
                            <small>({resendCount}/3 attempts)</small>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="step-actions">
                    <button
                      type="button"
                      className="back-btn"
                      onClick={prevStep}
                      disabled={isLoading}
                    >
                      <i className="fas fa-arrow-left"></i>
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <div className="spinner"></div>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Create Account</span>
                          <i className="fas fa-check"></i>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="otp-security-note">
                    <i className="fas fa-info-circle"></i>
                    <span>For your security, this code will expire in 5 minutes and can only be used once.</span>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Form Footer */}
          <div className="form-footer">
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="switch-link"
                onClick={handleSwitchToSignIn}
                disabled={isLoading}
              >
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
