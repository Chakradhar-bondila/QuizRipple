import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Profile.css';

const Profile = ({ onError, onSuccess, onLogout }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const deleteModalRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // State management - SIMPLIFIED
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Quiz results state - SIMPLIFIED
  const [quizResults, setQuizResults] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);
  
  // Form states
  const [personalForm, setPersonalForm] = useState({
    name: '',
    email: '',
    mobile: '',
    dob: '',
    gender: '',
    bio: '',
    location: '',
    website: ''
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [deleteForm, setDeleteForm] = useState({
    password: '',
    confirmText: ''
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReport: true,
    achievementAlerts: true,
    theme: 'light',
    language: 'en',
    timezone: 'auto',
    difficultyPreference: 'mixed'
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
    delete: false
  });

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // FIXED: Simple auth headers
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // FIXED: Enhanced statistics calculation - STABLE AND SIMPLIFIED
  const enhancedStats = useMemo(() => {
    console.log('🔄 Calculating stats with', quizResults?.length || 0, 'results');
    console.log('📊 Quiz results data:', quizResults);
    
    if (!Array.isArray(quizResults) || quizResults.length === 0) {
      console.log('❌ No quiz results available for stats calculation');
      return {
        totalQuizzes: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        passRate: 0,
        totalTimeHours: 0,
        recentTrend: 'insufficient-data',
        trendPercentage: 0,
        consistencyScore: 0,
        lastWeekCount: 0,
        passedCount: 0,
        failedCount: 0,
        rank: 'Beginner',
        streak: 0,
        achievements: [],
        recentQuizzes: [],
        improvementTrend: 'stable'
      };
    }

    console.log('✅ Calculating stats for', quizResults.length, 'quiz results');

    try {
      // Extract scores with multiple fallback paths
      const scores = quizResults.map(r => {
        const percentage = r.stats?.percentage || 
                          r.results?.percentage || 
                          r.percentage || 
                          r.score || 
                          r.finalScore || 0;
        return Math.min(Math.max(Number(percentage), 0), 100);
      }).filter(score => !isNaN(score) && score >= 0);

      console.log('📊 Extracted scores:', scores);

      const totalQuizzes = quizResults.length;
      const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
      
      // Calculate passed count with multiple fallback paths
      const passedCount = quizResults.filter(r => {
        const passed = r.stats?.passed || r.results?.passed || r.passed;
        const score = r.stats?.percentage || r.results?.percentage || r.percentage || r.score || 0;
        return passed === true || passed === 'true' || score >= 70;
      }).length;
      
      const passRate = totalQuizzes > 0 ? Math.round((passedCount / totalQuizzes) * 100) : 0;

      // Calculate total time
      const totalTime = quizResults.reduce((sum, r) => {
        const timeSpent = r.stats?.timing?.totalTimeSpent || 
                        r.results?.timing?.totalTimeSpent || 
                        r.timing?.totalTimeSpent ||
                        r.timeSpent || 0;
        return sum + (Number(timeSpent) / 1000 / 60 / 60); // Convert to hours
      }, 0);

      // Calculate streak
      const sortedResults = [...quizResults].sort((a, b) => 
        new Date(b.createdAt || b.date || b.timestamp || Date.now()) - 
        new Date(a.createdAt || a.date || a.timestamp || Date.now())
      );
      
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const uniqueDates = [...new Set(sortedResults.map(r => {
        const date = new Date(r.createdAt || r.date || r.timestamp || Date.now());
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      }))].sort((a, b) => b - a);

      if (uniqueDates.length > 0) {
        const mostRecentDate = uniqueDates[0];
        const daysSinceRecent = Math.floor((today.getTime() - mostRecentDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceRecent <= 1) {
          let currentDate = mostRecentDate;
          for (let dateTime of uniqueDates) {
            if (dateTime === currentDate) {
              streak++;
              currentDate -= (24 * 60 * 60 * 1000);
            } else {
              break;
            }
          }
        }
      }

      // Determine rank
      let rank = 'Beginner';
      if (averageScore >= 95 && totalQuizzes >= 20) rank = 'Master';
      else if (averageScore >= 90 && totalQuizzes >= 15) rank = 'Expert';
      else if (averageScore >= 85 && totalQuizzes >= 10) rank = 'Advanced+';
      else if (averageScore >= 80 && totalQuizzes >= 7) rank = 'Advanced';
      else if (averageScore >= 75 && totalQuizzes >= 5) rank = 'Intermediate+';
      else if (averageScore >= 70 && totalQuizzes >= 3) rank = 'Intermediate';
      else if (totalQuizzes >= 1) rank = 'Novice';

      // Calculate improvement trend
      let improvementTrend = 'stable';
      if (scores.length >= 6) {
        const recent = scores.slice(0, 3);
        const older = scores.slice(-3);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        if (recentAvg > olderAvg + 5) improvementTrend = 'improving';
        else if (recentAvg < olderAvg - 5) improvementTrend = 'declining';
      }

      // Get recent quizzes
      const recentQuizzes = sortedResults.slice(0, 5).map(r => ({
        id: r._id || r.id || Math.random().toString(),
        title: r.quizConfig?.title || r.title || r.quizTitle || 'Quiz',
        score: r.stats?.percentage || r.results?.percentage || r.percentage || r.score || 0,
        date: r.createdAt || r.date || r.timestamp || Date.now(),
        passed: r.stats?.passed || r.results?.passed || r.passed || false
      }));

      // Calculate achievements
      const achievements = [];
      if (totalQuizzes >= 1) achievements.push({ id: 'first_quiz', name: 'First Quiz', earned: true });
      if (streak >= 5) achievements.push({ id: 'streak_5', name: '5 Day Streak', earned: true });
      if (bestScore === 100) achievements.push({ id: 'perfect_score', name: 'Perfect Score', earned: true });
      if (averageScore >= 90) achievements.push({ id: 'high_achiever', name: 'High Achiever', earned: true });
      if (totalQuizzes >= 10) achievements.push({ id: 'dedicated', name: 'Dedicated Learner', earned: true });

      // Calculate last week count
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const lastWeekCount = quizResults.filter(r => {
        const resultDate = new Date(r.createdAt || r.date || r.timestamp || Date.now());
        return resultDate > weekAgo;
      }).length;

      // Calculate trends
      const recent = scores.slice(0, Math.min(5, scores.length));
      const previous = scores.slice(5, Math.min(10, scores.length));
      const recentAvg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
      const previousAvg = previous.length > 0 ? previous.reduce((a, b) => a + b, 0) / previous.length : 0;

      const calculatedStats = {
        totalQuizzes,
        averageScore,
        bestScore,
        worstScore,
        passRate,
        totalTimeHours: Math.round(totalTime * 10) / 10,
        recentTrend: recent.length && previous.length 
          ? (recentAvg > previousAvg ? 'improving' : recentAvg < previousAvg ? 'declining' : 'stable')
          : 'insufficient-data',
        trendPercentage: recent.length && previous.length && previousAvg > 0
          ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100)
          : 0,
        consistencyScore: scores.length > 1 ? Math.round(100 - (Math.sqrt(scores.reduce((sum, score) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          return sum + Math.pow(score - avg, 2);
        }, 0) / scores.length) || 0)) : 100,
        lastWeekCount,
        passedCount,
        failedCount: totalQuizzes - passedCount,
        rank,
        streak,
        achievements,
        recentQuizzes,
        improvementTrend
      };

      console.log('✅ Final calculated stats:', calculatedStats);
      return calculatedStats;

    } catch (error) {
      console.error('❌ Error calculating stats:', error);
      return {
        totalQuizzes: quizResults.length || 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        passRate: 0,
        totalTimeHours: 0,
        recentTrend: 'insufficient-data',
        trendPercentage: 0,
        consistencyScore: 0,
        lastWeekCount: 0,
        passedCount: 0,
        failedCount: quizResults.length || 0,
        rank: 'Beginner',
        streak: 0,
        achievements: [],
        recentQuizzes: [],
        improvementTrend: 'stable'
      };
    }
  }, [quizResults]);

  // FIXED: Simplified quiz results loading
  const loadQuizResults = useCallback(async (forceRefresh = false) => {
    if (!user) {
      console.log('👤 No user available, skipping quiz results load');
      return;
    }

    const userId = user.id || user._id;
    if (!userId) {
      console.error('❌ No user ID found');
      setStatsError('User ID not found');
      return;
    }

    if (statsLoading && !forceRefresh) {
      console.log('⏳ Already loading stats, skipping...');
      return;
    }

    console.log('🔄 Loading quiz results for user:', userId);
    setStatsLoading(true);
    setStatsError(null);

    try {
      const headers = getAuthHeaders();
      if (!headers) {
        throw new Error('No authentication token available');
      }

      // Try multiple endpoints
      const endpoints = [
        `${API_BASE_URL}/api/quiz-results/user/${userId}`,
        `${API_BASE_URL}/api/quiz-results?userId=${userId}`,
        `${API_BASE_URL}/api/results/user/${userId}`
      ];

      let response = null;
      let data = null;

      for (const endpoint of endpoints) {
        try {
          console.log('🌐 Trying endpoint:', endpoint);
          response = await fetch(endpoint, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (response.ok) {
            data = await response.json();
            console.log('✅ Success with endpoint:', endpoint);
            break;
          }
        } catch (fetchError) {
          console.warn('⚠️ Error with endpoint:', endpoint, fetchError.message);
        }
      }

      if (!response || !response.ok) {
        if (response?.status === 401) {
          console.log('🔒 Unauthorized, redirecting to signin');
          localStorage.removeItem('authToken');
          navigate('/signin');
          return;
        }
        throw new Error(`Failed to fetch results: ${response?.status || 'Network error'}`);
      }

      // Handle different response formats
      let results = [];
      if (Array.isArray(data)) {
        results = data;
      } else if (data.items || data.results || data.data) {
        results = data.items || data.results || data.data;
      }

      console.log('📊 Loaded results:', results.length, 'items');
      console.log('📊 Sample result:', results[0]);

      // Set results immediately
      setQuizResults(results);
      setStatsError(null);

    } catch (error) {
      console.error('❌ Error loading quiz results:', error);
      setStatsError(error.message || 'Failed to load quiz statistics');
    } finally {
      setStatsLoading(false);
    }
  }, [user, API_BASE_URL, getAuthHeaders, navigate, statsLoading]);

  // FIXED: Simplified refresh function
  const refreshStats = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    if (user) {
      loadQuizResults(true);
    }
  }, [user, loadQuizResults]);

  // FIXED: Load user data
  const loadUserData = useCallback(async () => {
    console.log('👤 Loading user data...');
    
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        console.log('🔒 No auth data, redirecting to signin');
        navigate('/signin');
        return;
      }

      const parsedUser = JSON.parse(userData);
      console.log('👤 Loaded user:', parsedUser.name, parsedUser.id || parsedUser._id);
      
      setUser(parsedUser);
      setPersonalForm({
        name: parsedUser.name || '',
        email: parsedUser.email || '',
        mobile: parsedUser.mobile || '',
        dob: parsedUser.dob ? parsedUser.dob.split('T')[0] : '',
        gender: parsedUser.gender || '',
        bio: parsedUser.bio || '',
        location: parsedUser.location || '',
        website: parsedUser.website || ''
      });

      // Load preferences
      loadUserPreferences();

    } catch (error) {
      console.error('❌ Error loading user data:', error);
      setError('Failed to load profile data');
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  }, [navigate, onError]);

  // Load user preferences
  const loadUserPreferences = useCallback(() => {
    try {
      const savedPrefs = localStorage.getItem('userPreferences');
      if (savedPrefs) {
        setPreferences(prev => ({ ...prev, ...JSON.parse(savedPrefs) }));
      }
    } catch (error) {
      console.warn('⚠️ Could not load preferences:', error);
    }
  }, []);

  // FIXED: Mount effect - runs once
  useEffect(() => {
    console.log('🚀 Component mounted, loading user data');
    isMountedRef.current = true;
    loadUserData();
    
    return () => {
      console.log('🛑 Component unmounting');
      isMountedRef.current = false;
    };
  }, [loadUserData]);

  // FIXED: Load quiz results when user is available
  useEffect(() => {
    if (user && (user.id || user._id)) {
      console.log('👤 User available, loading quiz results');
      // Small delay to ensure component is stable
      const timer = setTimeout(() => {
        loadQuizResults();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user?.id, user?._id, loadQuizResults]);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('🔍 State Debug:', {
      userExists: !!user,
      userId: user?.id || user?._id,
      quizResultsLength: quizResults?.length || 0,
      statsLoading,
      statsError,
      enhancedStatsTotal: enhancedStats.totalQuizzes,
      enhancedStatsAverage: enhancedStats.averageScore
    });
  }, [user, quizResults, statsLoading, statsError, enhancedStats]);

  // Rest of your existing handlers (keeping them exactly the same)
  const handlePersonalChange = useCallback((e) => {
    const { name, value } = e.target;
    setPersonalForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const handleSecurityChange = useCallback((e) => {
    const { name, value } = e.target;
    setSecurityForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const handleDeleteFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setDeleteForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePreferenceChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setPreferences(prev => ({ ...prev, [name]: newValue }));
  }, []);

  const togglePasswordVisibility = useCallback((field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setSaving(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isMountedRef.current) {
          setUser(prev => ({ ...prev, avatar: e.target.result }));
          
          const updatedUser = { ...user, avatar: e.target.result };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          setMessage('Profile picture updated successfully!');
          if (onSuccess) onSuccess('Profile picture updated successfully!');
        }
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      setError('Failed to upload profile picture');
      if (onError) onError(error);
    } finally {
      setSaving(false);
    }
  }, [user, onSuccess, onError]);

  const validatePersonalForm = useCallback(() => {
    const errors = {};
    if (!personalForm.name.trim()) errors.name = 'Name is required';
    if (!personalForm.email.trim()) errors.email = 'Email is required';
    if (personalForm.email && !personalForm.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = 'Please enter a valid email';
    }
    return errors;
  }, [personalForm]);

  const savePersonalInfo = useCallback(async () => {
    try {
      const errors = validatePersonalForm();
      if (Object.keys(errors).length > 0) {
        setError('Please check your input and try again');
        return;
      }

      setSaving(true);
      
      const headers = getAuthHeaders();
      if (!headers) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/user`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(personalForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedUser = { ...user, ...personalForm };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setIsEditing(false);
      setMessage('Personal information updated successfully!');
      if (onSuccess) onSuccess('Personal information updated successfully!');
      
    } catch (error) {
      console.error('❌ Error saving personal info:', error);
      const errorMessage = error.message || 'Failed to update personal information';
      setError(errorMessage);
      if (onError) onError(error);
    } finally {
      setSaving(false);
    }
  }, [personalForm, validatePersonalForm, API_BASE_URL, getAuthHeaders, user, onSuccess, onError]);

  const changePassword = useCallback(async () => {
    try {
      if (!securityForm.currentPassword) {
        setError('Current password is required');
        return;
      }
      
      if (securityForm.newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
      
      if (securityForm.newPassword !== securityForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      setSaving(true);
      
      const headers = getAuthHeaders();
      if (!headers) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/user/password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          currentPassword: securityForm.currentPassword,
          newPassword: securityForm.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }
      
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed successfully!');
      if (onSuccess) onSuccess('Password changed successfully!');
      
    } catch (error) {
      console.error('❌ Error changing password:', error);
      const errorMessage = error.message || 'Failed to change password';
      setError(errorMessage);
      if (onError) onError(error);
    } finally {
      setSaving(false);
    }
  }, [securityForm, API_BASE_URL, getAuthHeaders, onSuccess, onError]);

  const savePreferences = useCallback(async () => {
    try {
      setSaving(true);
      
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
      try {
        const headers = getAuthHeaders();
        if (headers) {
          const response = await fetch(`${API_BASE_URL}/api/user/preferences`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(preferences)
          });

          if (!response.ok) {
            console.warn('⚠️ Failed to save preferences to server, but saved locally');
          }
        }
      } catch (apiError) {
        console.warn('⚠️ Could not save preferences to API:', apiError);
      }
      
      setMessage('Preferences saved successfully!');
      if (onSuccess) onSuccess('Preferences saved successfully!');
      
    } catch (error) {
      console.error('❌ Error saving preferences:', error);
      setError('Failed to save preferences');
      if (onError) onError(error);
    } finally {
      setSaving(false);
    }
  }, [preferences, API_BASE_URL, getAuthHeaders, onSuccess, onError]);

  const isDeleteFormValid = useMemo(() => {
    return deleteForm.password.length >= 6 && 
           deleteForm.confirmText.toLowerCase() === 'delete my account';
  }, [deleteForm]);

  const deleteAccount = useCallback(async () => {
    try {
      if (!isDeleteFormValid) {
        setError('Please enter your password and confirmation text');
        return;
      }

      setSaving(true);
      
      const headers = getAuthHeaders();
      if (!headers) {
        throw new Error('Not authenticated');
      }

      const verifyResponse = await fetch(`${API_BASE_URL}/api/user/verify-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          password: deleteForm.password
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Invalid password');
      }
      
      const deleteResponse = await fetch(`${API_BASE_URL}/api/user`, {
        method: 'DELETE',
        headers
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.message || 'Failed to delete account');
      }
      
      localStorage.clear();
      
      if (onLogout) {
        onLogout();
      } else {
        navigate('/');
      }
      
    } catch (error) {
      console.error('❌ Error deleting account:', error);
      const errorMessage = error.message || 'Failed to delete account';
      setError(errorMessage);
      if (onError) onError(error);
      setSaving(false);
    }
  }, [isDeleteFormValid, deleteForm.password, API_BASE_URL, getAuthHeaders, onLogout, navigate, onError]);

  const clearMessages = useCallback(() => {
    setMessage('');
    setError('');
    setStatsError(null);
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(clearMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, clearMessages]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearMessages, 8000);
      return () => clearTimeout(timer);
    }
  }, [error, clearMessages]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setPersonalForm({
      name: user?.name || '',
      email: user?.email || '',
      mobile: user?.mobile || '',
      dob: user?.dob ? user.dob.split('T')[0] : '',
      gender: user?.gender || '',
      bio: user?.bio || '',
      location: user?.location || '',
      website: user?.website || ''
    });
    clearMessages();
  }, [user, clearMessages]);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteForm({ password: '', confirmText: '' });
    clearMessages();
  }, [clearMessages]);

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <h3>Loading Profile...</h3>
          <p>Please wait while we fetch your information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <div className="container">
          <div className="header-content">
            <button onClick={handleBack} className="back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </button>
            <div className="header-info">
              <h1>Profile Settings</h1>
              <p>Manage your account and quiz performance</p>
            </div>
            <div className="header-actions">
              <button 
                onClick={refreshStats}
                className="refresh-stats-btn"
                disabled={statsLoading}
                title="Refresh Quiz Statistics"
              >
                {statsLoading ? (
                  <div className="spinner-small"></div>
                ) : (
                  <i className="fas fa-sync-alt"></i>
                )}
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(message || error || statsError) && (
        <div className={`profile-message ${error || statsError ? 'error' : 'success'}`}>
          <div className="container">
            <div className="message-content">
              <i className={`fas ${error || statsError ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
              <span>{message || error || statsError}</span>
              <button onClick={clearMessages} className="message-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        <div className="profile-content">
          {/* Sidebar */}
          <div className="profile-sidebar">
            <div className="profile-card">
              <div className="avatar-section">
                <div className="avatar-container" onClick={handleAvatarClick}>
                  <img 
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=667eea&color=fff&size=120`}
                    alt={user?.name || 'User'}
                    className="profile-avatar"
                  />
                  <div className="avatar-overlay">
                    <i className="fas fa-camera"></i>
                    <span>Change Photo</span>
                  </div>
                  {saving && <div className="avatar-loading"><div className="spinner"></div></div>}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
              
              <div className="profile-info">
                <h2>{user?.name || 'User'}</h2>
                <p className="profile-email">{user?.email}</p>
                
                <div className="profile-stats">
                  <div className="stat-item" title={`${enhancedStats.totalQuizzes} quizzes completed`}>
                    <span className="stat-value">{enhancedStats.totalQuizzes}</span>
                    <span className="stat-label">Quizzes</span>
                  </div>
                  <div className="stat-item" title={`${enhancedStats.averageScore}% average score`}>
                    <span className="stat-value">{enhancedStats.averageScore}%</span>
                    <span className="stat-label">Avg Score</span>
                  </div>
                  <div className="stat-item" title={`Current rank: ${enhancedStats.rank}`}>
                    <span className="stat-value">{enhancedStats.rank}</span>
                    <span className="stat-label">Rank</span>
                  </div>
                </div>
                

                {statsError && !statsLoading && (
                  <div className="stats-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>Stats unavailable</span>
                    <button onClick={refreshStats} className="retry-btn" title="Retry loading stats">
                      <i className="fas fa-redo"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="profile-nav">
              <button 
                className={`nav-item ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                <i className="fas fa-user"></i>
                <span>Personal Info</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <i className="fas fa-lock"></i>
                <span>Security</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'preferences' ? 'active' : ''}`}
                onClick={() => setActiveTab('preferences')}
              >
                <i className="fas fa-cog"></i>
                <span>Preferences</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('stats')}
              >
                <i className="fas fa-chart-line"></i>
                <span>Statistics</span>
                {enhancedStats.totalQuizzes > 0 && (
                  <span className="nav-badge">{enhancedStats.totalQuizzes}</span>
                )}
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="profile-main">
            
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="tab-content">
                <div className="content-header">
                  <h3>Personal Information</h3>
                  <div className="header-actions">
                    {!isEditing ? (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="btn btn-outline"
                      >
                        <i className="fas fa-edit"></i>
                        <span>Edit</span>
                      </button>
                    ) : (
                      <div className="edit-actions">
                        <button 
                          onClick={cancelEditing}
                          className="btn btn-outline"
                          disabled={saving}
                        >
                          <span>Cancel</span>
                        </button>
                        <button 
                          onClick={savePersonalInfo}
                          className="btn btn-primary"
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <div className="btn-spinner"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save"></i>
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={personalForm.name}
                      onChange={handlePersonalChange}
                      disabled={!isEditing}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={personalForm.email}
                      onChange={handlePersonalChange}
                      disabled={!isEditing}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="mobile">Mobile Number</label>
                    <input
                      type="tel"
                      id="mobile"
                      name="mobile"
                      value={personalForm.mobile}
                      onChange={handlePersonalChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="dob">Date of Birth</label>
                    <input
                      type="date"
                      id="dob"
                      name="dob"
                      value={personalForm.dob}
                      onChange={handlePersonalChange}
                      disabled={!isEditing}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="gender">Gender</label>
                    <select
                      id="gender"
                      name="gender"
                      value={personalForm.gender}
                      onChange={handlePersonalChange}
                      disabled={!isEditing}
                      className="form-input"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="location">Location</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={personalForm.location}
                      onChange={handlePersonalChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="City, Country"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="website">Website</label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={personalForm.website}
                      onChange={handlePersonalChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="bio">Bio</label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={personalForm.bio}
                      onChange={handlePersonalChange}
                      disabled={!isEditing}
                      className="form-textarea"
                      rows="4"
                      placeholder="Tell us about yourself..."
                      maxLength="500"
                    />
                    {isEditing && (
                      <div className="form-help">
                        {personalForm.bio.length}/500 characters
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="tab-content">
                <div className="content-header">
                  <h3>Security Settings</h3>
                  <p>Manage your password and account security</p>
                </div>

                <div className="security-section">
                  <h4>Change Password</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="currentPassword">Current Password *</label>
                      <div className="password-input">
                        <input
                          type={showPassword.current ? 'text' : 'password'}
                          id="currentPassword"
                          name="currentPassword"
                          value={securityForm.currentPassword}
                          onChange={handleSecurityChange}
                          className="form-input"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          className="password-toggle"
                        >
                          <i className={`fas ${showPassword.current ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="newPassword">New Password *</label>
                      <div className="password-input">
                        <input
                          type={showPassword.new ? 'text' : 'password'}
                          id="newPassword"
                          name="newPassword"
                          value={securityForm.newPassword}
                          onChange={handleSecurityChange}
                          className="form-input"
                          minLength="6"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          className="password-toggle"
                        >
                          <i className={`fas ${showPassword.new ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      <div className="form-help">
                        Password must be at least 6 characters long
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm New Password *</label>
                      <div className="password-input">
                        <input
                          type={showPassword.confirm ? 'text' : 'password'}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={securityForm.confirmPassword}
                          onChange={handleSecurityChange}
                          className="form-input"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="password-toggle"
                        >
                          <i className={`fas ${showPassword.confirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      {securityForm.newPassword && securityForm.confirmPassword && (
                        <div className={`form-help ${securityForm.newPassword === securityForm.confirmPassword ? 'success' : 'error'}`}>
                          {securityForm.newPassword === securityForm.confirmPassword ? 
                            '✓ Passwords match' : 
                            '✗ Passwords do not match'
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={changePassword}
                    className="btn btn-primary"
                    disabled={saving || !securityForm.currentPassword || !securityForm.newPassword || !securityForm.confirmPassword}
                  >
                    {saving ? (
                      <>
                        <div className="btn-spinner"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key"></i>
                        <span>Change Password</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="security-section danger-zone">
                  <h4>Danger Zone</h4>
                  <p>Once you delete your account, there is no going back. Please be certain.</p>
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    className="btn btn-danger"
                  >
                    <i className="fas fa-trash-alt"></i>
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="tab-content">
                <div className="content-header">
                  <h3>Preferences</h3>
                  <div className="header-actions">
                    <button 
                      onClick={savePreferences}
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="btn-spinner"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i>
                          <span>Save Preferences</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="preferences-sections">
                  <div className="preference-section">
                    <h4>Notifications</h4>
                    <div className="preference-group">
                      <div className="preference-item">
                        <div className="preference-info">
                          <label htmlFor="emailNotifications">Email Notifications</label>
                          <p>Receive updates and quiz results via email</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            id="emailNotifications"
                            name="emailNotifications"
                            checked={preferences.emailNotifications}
                            onChange={handlePreferenceChange}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="preference-item">
                        <div className="preference-info">
                          <label htmlFor="pushNotifications">Push Notifications</label>
                          <p>Get notified about new quizzes and achievements</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            id="pushNotifications"
                            name="pushNotifications"
                            checked={preferences.pushNotifications}
                            onChange={handlePreferenceChange}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="preference-item">
                        <div className="preference-info">
                          <label htmlFor="weeklyReport">Weekly Progress Report</label>
                          <p>Receive a summary of your weekly quiz activity</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            id="weeklyReport"
                            name="weeklyReport"
                            checked={preferences.weeklyReport}
                            onChange={handlePreferenceChange}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="preference-item">
                        <div className="preference-info">
                          <label htmlFor="achievementAlerts">Achievement Alerts</label>
                          <p>Get notified when you unlock new achievements</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            id="achievementAlerts"
                            name="achievementAlerts"
                            checked={preferences.achievementAlerts}
                            onChange={handlePreferenceChange}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="preference-section">
                    <h4>General</h4>
                    <div className="preference-group">
                      <div className="form-group">
                        <label htmlFor="theme">Theme</label>
                        <select
                          id="theme"
                          name="theme"
                          value={preferences.theme}
                          onChange={handlePreferenceChange}
                          className="form-input"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto (System)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="language">Language</label>
                        <select
                          id="language"
                          name="language"
                          value={preferences.language}
                          onChange={handlePreferenceChange}
                          className="form-input"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="timezone">Timezone</label>
                        <select
                          id="timezone"
                          name="timezone"
                          value={preferences.timezone}
                          onChange={handlePreferenceChange}
                          className="form-input"
                        >
                          <option value="auto">Auto Detect</option>
                          <option value="UTC">UTC</option>
                          <option value="EST">Eastern Time</option>
                          <option value="PST">Pacific Time</option>
                          <option value="GMT">Greenwich Mean Time</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="difficultyPreference">Preferred Difficulty</label>
                        <select
                          id="difficultyPreference"
                          name="difficultyPreference"
                          value={preferences.difficultyPreference}
                          onChange={handlePreferenceChange}
                          className="form-input"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="mixed">Mixed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Statistics Tab */}
            {activeTab === 'stats' && (
              <div className="tab-content">
                <div className="content-header">
                  <h3>Your Statistics</h3>
                  <p>Track your learning progress and achievements</p>
                  <div className="header-actions">
                    <button 
                      onClick={refreshStats}
                      className="btn btn-outline"
                      disabled={statsLoading}
                      title="Refresh Statistics"
                    >
                      {statsLoading ? (
                        <>
                          <div className="btn-spinner"></div>
                          <span>Refreshing...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sync-alt"></i>
                          <span>Refresh</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => navigate('/all-results')}
                      className="btn btn-primary"
                    >
                      <i className="fas fa-chart-bar"></i>
                      <span>View All Results</span>
                    </button>
                  </div>
                </div>

                {statsError && !statsLoading ? (
                  <div className="stats-error-state">
                    <div className="error-icon">⚠️</div>
                    <h4>Unable to Load Statistics</h4>
                    <p>{statsError}</p>
                    <div className="error-actions">
                      <button onClick={refreshStats} className="btn btn-primary">
                        <i className="fas fa-redo"></i>
                        <span>Try Again</span>
                      </button>
                      <button 
                        onClick={() => navigate('/all-results')}
                        className="btn btn-outline"
                      >
                        <i className="fas fa-external-link-alt"></i>
                        <span>View All Results</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Enhanced Statistics Grid */}
                    <div className="stats-grid">
                      <div className="stat-card" tabIndex="0">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                          <div className="stat-value">{enhancedStats.totalQuizzes}</div>
                          <div className="stat-label">Total Quizzes</div>
                          {enhancedStats.totalQuizzes > 0 && (
                            <div className="stat-subtitle">
                              {enhancedStats.lastWeekCount} this week
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="stat-card" tabIndex="0">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-content">
                          <div className="stat-value">{enhancedStats.averageScore}%</div>
                          <div className="stat-label">Average Score</div>
                          {enhancedStats.recentTrend !== 'insufficient-data' && (
                            <div className={`stat-subtitle trend-${enhancedStats.recentTrend}`}>
                              {enhancedStats.recentTrend}
                              {enhancedStats.trendPercentage !== 0 && (
                                <span> ({enhancedStats.trendPercentage > 0 ? '+' : ''}{enhancedStats.trendPercentage}%)</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="stat-card" tabIndex="0">
                        <div className="stat-icon">🏆</div>
                        <div className="stat-content">
                          <div className="stat-value">{enhancedStats.bestScore}%</div>
                          <div className="stat-label">Best Score</div>
                          {enhancedStats.worstScore !== 100 && enhancedStats.worstScore !== enhancedStats.bestScore && (
                            <div className="stat-subtitle">
                              Worst: {enhancedStats.worstScore}%
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="stat-card" tabIndex="0">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                          <div className="stat-value">{enhancedStats.passRate}%</div>
                          <div className="stat-label">Pass Rate</div>
                          <div className="stat-subtitle">
                            {enhancedStats.passedCount} passed, {enhancedStats.failedCount} failed
                          </div>
                        </div>
                      </div>

                      <div className="stat-card" tabIndex="0">
                        <div className="stat-icon">⏰</div>
                        <div className="stat-content">
                          <div className="stat-value">{enhancedStats.totalTimeHours}h</div>
                          <div className="stat-label">Total Time</div>
                          {enhancedStats.totalQuizzes > 0 && (
                            <div className="stat-subtitle">
                              ~{Math.round((enhancedStats.totalTimeHours * 60) / enhancedStats.totalQuizzes)}m per quiz
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="stat-card" tabIndex="0">
                        <div className="stat-icon">🔥</div>
                        <div className="stat-content">
                          <div className="stat-value">{enhancedStats.streak}</div>
                          <div className="stat-label">Day Streak</div>
                          {enhancedStats.streak > 0 && (
                            <div className="stat-subtitle">
                              Keep it up!
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="stat-card" tabIndex="0">
                        <div className="stat-icon">🎖️</div>
                        <div className="stat-content">
                          <div className="stat-value">{enhancedStats.rank}</div>
                          <div className="stat-label">Current Rank</div>
                          {enhancedStats.consistencyScore > 0 && (
                            <div className="stat-subtitle">
                              {enhancedStats.consistencyScore}% consistency
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="stat-card" tabIndex="0">
                        <div className="stat-icon">
                          {enhancedStats.improvementTrend === 'improving' ? '📈' : 
                           enhancedStats.improvementTrend === 'declining' ? '📉' : '➡️'}
                        </div>
                        <div className="stat-content">
                          <div className="stat-value" style={{ textTransform: 'capitalize' }}>
                            {enhancedStats.improvementTrend}
                          </div>
                          <div className="stat-label">Trend</div>
                          <div className="stat-subtitle">
                            Recent performance
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Achievements Section */}
                    <div className="achievements-section">
                      <h4>🏆 Achievements</h4>
                      <div className="achievements-grid">
                        {enhancedStats.achievements.length > 0 ? (
                          enhancedStats.achievements.map(achievement => (
                            <div key={achievement.id} className="achievement-item earned">
                              <i className="fas fa-star"></i>
                              <span>{achievement.name}</span>
                            </div>
                          ))
                        ) : (
                          <div className="no-achievements">
                            <p>Complete more quizzes to unlock achievements!</p>
                          </div>
                        )}
                        
                        {/* Show pending achievements */}
                        {enhancedStats.totalQuizzes === 0 && (
                          <div className="achievement-item pending">
                            <i className="fas fa-star"></i>
                            <span>First Quiz</span>
                            <small>Complete your first quiz</small>
                          </div>
                        )}
                        {enhancedStats.streak < 5 && (
                          <div className="achievement-item pending">
                            <i className="fas fa-fire"></i>
                            <span>5 Day Streak</span>
                            <small>Take quizzes for 5 consecutive days</small>
                          </div>
                        )}
                        {enhancedStats.bestScore < 100 && (
                          <div className="achievement-item pending">
                            <i className="fas fa-trophy"></i>
                            <span>Perfect Score</span>
                            <small>Score 100% on any quiz</small>
                          </div>
                        )}
                        {enhancedStats.averageScore < 90 && (
                          <div className="achievement-item pending">
                            <i className="fas fa-medal"></i>
                            <span>High Achiever</span>
                            <small>Maintain 90%+ average score</small>
                          </div>
                        )}
                        {enhancedStats.totalQuizzes < 10 && (
                          <div className="achievement-item pending">
                            <i className="fas fa-graduation-cap"></i>
                            <span>Dedicated Learner</span>
                            <small>Complete 10 quizzes</small>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Quizzes Section */}
                    {enhancedStats.recentQuizzes.length > 0 && (
                      <div className="recent-quizzes-section">
                        <h4>📝 Recent Quizzes</h4>
                        <div className="recent-quizzes-list">
                          {enhancedStats.recentQuizzes.map(quiz => (
                            <div key={quiz.id} className="recent-quiz-item">
                              <div className="quiz-info">
                                <h5>{quiz.title}</h5>
                                <p>{new Date(quiz.date).toLocaleDateString()}</p>
                              </div>
                              <div className="quiz-score">
                                <span className={quiz.passed ? 'passed' : 'failed'}>
                                  {quiz.score}%
                                </span>
                                <i className={`fas ${quiz.passed ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="view-all-link">
                          <button 
                            onClick={() => navigate('/all-results')}
                            className="btn btn-outline"
                          >
                            <i className="fas fa-external-link-alt"></i>
                            <span>View All {enhancedStats.totalQuizzes} Results</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* No Data State */}
                    {enhancedStats.totalQuizzes === 0 && !statsLoading && (
                      <div className="no-stats-state">
                        <div className="no-stats-icon">📊</div>
                        <h4>No Quiz Data Yet</h4>
                        <p>Take your first quiz to see your statistics here!</p>
                        <button 
                          onClick={() => navigate('/quiz')}
                          className="btn btn-primary"
                        >
                          <i className="fas fa-play"></i>
                          <span>Take Your First Quiz</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={deleteModalRef}>
            <div className="modal-header">
              <h3>Delete Account</h3>
              <button 
                className="modal-close"
                onClick={closeDeleteModal}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <i className="fas fa-exclamation-triangle"></i>
                <h4>This action cannot be undone!</h4>
              </div>
              
              <p>All your data, including quiz history and achievements, will be permanently deleted.</p>
              
              <div className="delete-form">
                <div className="form-group">
                  <label htmlFor="deletePassword">Enter your password to confirm *</label>
                  <div className="password-input">
                    <input
                      type={showPassword.delete ? 'text' : 'password'}
                      id="deletePassword"
                      name="password"
                      value={deleteForm.password}
                      onChange={handleDeleteFormChange}
                      className="form-input"
                      placeholder="Your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('delete')}
                      className="password-toggle"
                    >
                      <i className={`fas ${showPassword.delete ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmText">Type "delete my account" to confirm *</label>
                  <input
                    type="text"
                    id="confirmText"
                    name="confirmText"
                    value={deleteForm.confirmText}
                    onChange={handleDeleteFormChange}
                    className="form-input"
                    placeholder="delete my account"
                    required
                  />
                  {deleteForm.confirmText && deleteForm.confirmText.toLowerCase() !== 'delete my account' && (
                    <div className="form-help error">
                      Please type exactly "delete my account"
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={closeDeleteModal}
                className="btn btn-outline"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={deleteAccount}
                className="btn btn-danger"
                disabled={saving || !isDeleteFormValid}
              >
                {saving ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash-alt"></i>
                    <span>Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
