import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/Landing.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Landing = ({ onError, onSuccess, onLogout }) => {
  // State management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [navigationError, setNavigationError] = useState('');
  const [userStats, setUserStats] = useState({
    totalQuizzes: 0,
    lastScore: 0,
    rank: 'Beginner',
    streak: 0,
    quizzesThisWeek: 0,
    averageScore: 0,
    bestScore: 0,
    worstScore: 100,
    passRate: 0,
    totalTimeHours: 0,
    recentTrend: 'insufficient-data',
    trendPercentage: 0,
    consistencyScore: 0,
    passedCount: 0,
    failedCount: 0,
    recentActivity: []
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Get auth headers for API calls
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Fetch and calculate user statistics from quiz results
  const fetchUserStats = useCallback(async (userData) => {
    if (!userData?.id && !userData?._id) return;

    setStatsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/quiz-results/user/${userData.id || userData._id}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          navigate('/signin');
          return;
        }
        throw new Error('Failed to fetch quiz results');
      }

      const data = await response.json();
      const results = data.items || data.results || [];

      if (results.length === 0) {
        setUserStats({
          totalQuizzes: 0,
          lastScore: 0,
          rank: 'Beginner',
          streak: 0,
          quizzesThisWeek: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 100,
          passRate: 0,
          totalTimeHours: 0,
          recentTrend: 'insufficient-data',
          trendPercentage: 0,
          consistencyScore: 0,
          passedCount: 0,
          failedCount: 0,
          recentActivity: []
        });
        return;
      }

      // Calculate enhanced statistics
      const scores = results.map(r => r.stats?.percentage || 0);
      const passedCount = results.filter(r => r.stats?.passed).length;
      const totalTime = results.reduce((sum, r) => sum + (r.timing?.totalTimeSpent || 0), 0);
      
      // Calculate trends
      const recent = scores.slice(0, 5);
      const previous = scores.slice(5, 10);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length || 0;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length || 0;
      
      // Calculate weekly count
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const quizzesThisWeek = results.filter(r => new Date(r.createdAt) > weekAgo).length;

      // Calculate streak (simplified - consecutive days with quizzes)
      const sortedResults = results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < sortedResults.length; i++) {
        const resultDate = new Date(sortedResults[i].createdAt);
        resultDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((currentDate - resultDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === streak) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (daysDiff > streak) {
          break;
        }
      }

      // Calculate rank based on average score
      const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      let rank = 'Beginner';
      if (averageScore >= 95) rank = 'Expert';
      else if (averageScore >= 90) rank = 'Master';
      else if (averageScore >= 80) rank = 'Advanced';
      else if (averageScore >= 70) rank = 'Intermediate';
      else if (averageScore >= 60) rank = 'Novice';

      // Calculate consistency score
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
      const consistencyScore = Math.round(100 - (Math.sqrt(variance) || 0));

      const enhancedStats = {
        totalQuizzes: results.length,
        averageScore: averageScore,
        bestScore: Math.max(...scores, 0),
        worstScore: Math.min(...scores, 100),
        passRate: Math.round((passedCount / results.length) * 100),
        totalTimeHours: Math.round(totalTime / (1000 * 60 * 60) * 10) / 10,
        recentTrend: recent.length && previous.length 
          ? (recentAvg > previousAvg ? 'improving' : recentAvg < previousAvg ? 'declining' : 'stable')
          : 'insufficient-data',
        trendPercentage: recent.length && previous.length 
          ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100)
          : 0,
        consistencyScore: consistencyScore,
        quizzesThisWeek: quizzesThisWeek,
        passedCount,
        failedCount: results.length - passedCount,
        lastScore: results.length > 0 ? (results[0].stats?.percentage || 0) : 0,
        rank: rank,
        streak: streak,
        recentActivity: results.slice(0, 5).map(r => ({
          date: new Date(r.createdAt).toLocaleDateString(),
          score: r.stats?.percentage || 0,
          title: r.quizConfig?.title || 'Quiz',
          passed: r.stats?.passed || false
        }))
      };

      setUserStats(enhancedStats);
      
      // Save to localStorage for caching
      localStorage.setItem('userStats', JSON.stringify(enhancedStats));

    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Load from localStorage as fallback
      const savedStats = localStorage.getItem('userStats');
      if (savedStats) {
        try {
          setUserStats(JSON.parse(savedStats));
        } catch (parseError) {
          console.error('Error parsing saved stats:', parseError);
        }
      }
    } finally {
      setStatsLoading(false);
    }
  }, [getAuthHeaders, navigate]);

  // Enhanced authentication check with error handling
  const checkAuthStatus = useCallback(() => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setIsLoggedIn(true);
        setUser(parsedUser);
        
        // Fetch user statistics from API
        fetchUserStats(parsedUser);
      } else {
        setIsLoggedIn(false);
        setUser(null);
        setUserStats({
          totalQuizzes: 0,
          lastScore: 0,
          rank: 'Beginner',
          streak: 0,
          quizzesThisWeek: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 100,
          passRate: 0,
          totalTimeHours: 0,
          recentTrend: 'insufficient-data',
          trendPercentage: 0,
          consistencyScore: 0,
          passedCount: 0,
          failedCount: 0,
          recentActivity: []
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoggedIn(false);
      setUser(null);
      showErrorMessage('Authentication error. Please sign in again.');
    } finally {
      setLoading(false);
    }
  }, [fetchUserStats]);

  // Enhanced error message handling
  const showErrorMessage = useCallback((message) => {
    setNavigationError(message);
    setWelcomeMessage(message);
    setShowWelcome(true);
    if (onError) onError(message);
    setTimeout(() => {
      setShowWelcome(false);
      setNavigationError('');
    }, 5000);
  }, [onError]);

  // Enhanced success message handling
  const showSuccessMessage = useCallback((message, duration = 3000) => {
    setWelcomeMessage(message);
    setShowWelcome(true);
    if (onSuccess) onSuccess(message);
    setTimeout(() => {
      setShowWelcome(false);
    }, duration);
  }, [onSuccess]);

  // Check authentication on mount and listen for changes
  useEffect(() => {
    checkAuthStatus();
    
    // Listen for storage changes (when user signs up/signs in)
    const handleStorageChange = (e) => {
      if (e.key === 'authToken' || e.key === 'user' || e.key === 'userStats') {
        checkAuthStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuthStatus]);

  // Handle welcome message from navigation state
  useEffect(() => {
    if (location.state) {
      const { welcomeMessage: navWelcomeMessage, isNewUser, justSignedUp } = location.state;
      
      if (navWelcomeMessage) {
        showSuccessMessage(navWelcomeMessage, 5000);
        
        // Clear the navigation state to prevent showing message on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, showSuccessMessage]);

  // Enhanced navigation handlers with error handling
  const handleNavigation = useCallback((path, errorMessage = 'Navigation failed') => {
    try {
      navigate(path);
    } catch (error) {
      console.error('Navigation error:', error);
      showErrorMessage(errorMessage);
    }
  }, [navigate, showErrorMessage]);

  const handleSignIn = useCallback(() => {
    handleNavigation('/signin', 'Unable to navigate to sign in page');
  }, [handleNavigation]);

  const handleSignUp = useCallback(() => {
    handleNavigation('/signup', 'Unable to navigate to sign up page');
  }, [handleNavigation]);

  const handleStartQuiz = useCallback(() => {
    if (!isLoggedIn) {
      showErrorMessage('Please sign in to take a quiz');
      return;
    }
    handleNavigation('/quiz', 'Unable to start quiz');
  }, [isLoggedIn, handleNavigation, showErrorMessage]);

  // Navigate to AllResults
  const handleViewResults = useCallback(() => {
    try {
      if (!isLoggedIn) {
        showErrorMessage('Please sign in to view your results');
        return;
      }

      // Navigate directly to all results page
      handleNavigation('/all-results', 'Unable to navigate to results page');
    } catch (error) {
      console.error('Error accessing results:', error);
      showErrorMessage('Error accessing results. Please try again.');
    }
  }, [isLoggedIn, handleNavigation, showErrorMessage]);

  // Enhanced logout function
  const handleLogout = useCallback(() => {
    try {
      // Clear authentication data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userStats');
      localStorage.removeItem('quiz-progress');
      localStorage.removeItem('quiz-results');
      localStorage.removeItem('quiz-current');
      
      // Update state
      setIsLoggedIn(false);
      setUser(null);
      setUserStats({
        totalQuizzes: 0,
        lastScore: 0,
        rank: 'Beginner',
        streak: 0,
        quizzesThisWeek: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 100,
        passRate: 0,
        totalTimeHours: 0,
        recentTrend: 'insufficient-data',
        trendPercentage: 0,
        consistencyScore: 0,
        passedCount: 0,
        failedCount: 0,
        recentActivity: []
      });
      setShowWelcome(false);
      setWelcomeMessage('');
      
      // Call parent logout handler if provided
      if (onLogout) {
        onLogout();
      } else {
        // Navigate to home
        navigate('/', { replace: true });
      }
      
      // Show logout message
      showSuccessMessage('You have been successfully logged out. See you next time!');
      
    } catch (error) {
      console.error('Error during logout:', error);
      showErrorMessage('Error during logout. Please try again.');
    }
  }, [navigate, showSuccessMessage, showErrorMessage, onLogout]);

  const handleDismissWelcome = useCallback(() => {
    setShowWelcome(false);
    setNavigationError('');
  }, []);

  // Enhanced practice mode handler
  const handlePracticeMode = useCallback(() => {
    if (!isLoggedIn) {
      showErrorMessage('Please sign in to access practice mode');
      return;
    }
    handleNavigation('/practice', 'Unable to access practice mode');
  }, [isLoggedIn, handleNavigation, showErrorMessage]);

  // Enhanced profile handler
  const handleProfile = useCallback(() => {
    if (!isLoggedIn) {
      showErrorMessage('Please sign in to access profile');
      return;
    }
    handleNavigation('/profile', 'Unable to access profile');
  }, [isLoggedIn, handleNavigation, showErrorMessage]);

  // New: Handle leaderboard navigation
  const handleLeaderboard = useCallback(() => {
    handleNavigation('/leaderboard', 'Unable to access leaderboard');
  }, [handleNavigation]);

  // Calculate performance indicator
  const getPerformanceIndicator = useCallback(() => {
    const avgScore = userStats.averageScore;
    if (avgScore >= 90) return { text: 'Excellent', color: 'excellent', icon: '🏆' };
    if (avgScore >= 80) return { text: 'Great', color: 'great', icon: '⭐' };
    if (avgScore >= 70) return { text: 'Good', color: 'good', icon: '👍' };
    if (avgScore >= 60) return { text: 'Fair', color: 'fair', icon: '📚' };
    return { text: 'Keep Learning', color: 'learning', icon: '💪' };
  }, [userStats.averageScore]);

  // Show loading state
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-container">
          <div className="spinner"></div>
          <h2>Loading QuizRipple...</h2>
          <p>Preparing your learning experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-root">
      {/* Enhanced Welcome Banner with error/success states */}
      {showWelcome && welcomeMessage && (
        <div className={`welcome-banner ${navigationError ? 'error' : 'success'}`}>
          <div className="container">
            <div className="welcome-content">
              <i className={`fas ${navigationError ? 'fa-exclamation-triangle' : 'fa-check-circle'} welcome-icon`}></i>
              <span className="welcome-text">{welcomeMessage}</span>
              <button 
                className="welcome-dismiss" 
                onClick={handleDismissWelcome}
                aria-label="Dismiss welcome message"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Header */}
      <header className="hero">
        <div className="container hero-content">
          <div className="header-left">
            <h1 className="app-title">
              <i className="fas fa-graduation-cap"></i> QuizRipple
            </h1>
            <p className="subtitle">
              {isLoggedIn 
                ? `Welcome back, ${user?.name || user?.firstName || user?.username || 'User'}! Ready for another challenge?`
                : 'Challenge yourself. Master web development. Track your progress.'
              }
            </p>
          </div>
          
          <div className="header-right">
            {!isLoggedIn ? (
              <div className="auth-buttons">
                <button className="btn btn-outline" onClick={handleSignIn}>
                  <i className="fas fa-sign-in-alt"></i> Sign In
                </button>
                <button className="btn btn-primary" onClick={handleSignUp}>
                  <i className="fas fa-user-plus"></i> Sign Up
                </button>
              </div>
            ) : (
              <div className="user-menu">
                <div className="user-stats-mini">
                  <div className="stat-mini">
                    <span className="stat-label">Score</span>
                    <span className="stat-value">{statsLoading ? '...' : userStats.averageScore}%</span>
                  </div>
                  <div className="stat-mini">
                    <span className="stat-label">Rank</span>
                    <span className="stat-value">{statsLoading ? '...' : userStats.rank}</span>
                  </div>
                  <div className="stat-mini">
                    <span className="stat-label">Streak</span>
                    <span className="stat-value">{statsLoading ? '...' : userStats.streak}🔥</span>
                  </div>
                </div>
                <div className="user-profile">
                  <img 
                    src={user?.avatar || user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.firstName || 'User')}&background=667eea&color=fff`} 
                    alt={user?.name || user?.firstName || 'User'} 
                    className="avatar" 
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.firstName || 'User')}&background=667eea&color=fff`;
                    }}
                  />
                  <div className="user-info">
                    <span className="user-name">{user?.name || user?.firstName || 'User'}</span>
                    <span className="user-email">{user?.email}</span>
                  </div>
                  <div className="dropdown">
                    <button className="dropdown-btn" aria-label="User menu">
                      <i className="fas fa-chevron-down"></i>
                    </button>
                    <div className="dropdown-menu">
                      <button className="dropdown-item" onClick={handleViewResults}>
                        <i className="fas fa-chart-line"></i> Quiz History
                      </button>
                      <button className="dropdown-item" onClick={handleProfile}>
                        <i className="fas fa-user-cog"></i> Profile Settings
                      </button>
                      <button className="dropdown-item" onClick={handleLeaderboard}>
                        <i className="fas fa-trophy"></i> Leaderboard
                      </button>
                      <hr className="dropdown-divider" />
                      <button className="dropdown-item logout-btn" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i> Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Enhanced Main Content */}
      <main className="main-content">
        {!isLoggedIn ? (
          <>
            <section className="intro-section container">
              <h2>Welcome to QuizRipples!</h2>
              <p className="intro-description">
                Test your knowledge with our interactive quiz platform. You'll have <strong>30 minutes</strong> to answer <strong>20 questions</strong> covering HTML, CSS, JavaScript, and general web development concepts.
              </p>
              
              <div className="cta-section">
                <h3>Ready to get started?</h3>
                <p>Join thousands of developers improving their skills</p>
                <div className="cta-buttons">
                  <button className="btn btn-primary btn-large" onClick={handleSignUp}>
                    <i className="fas fa-rocket"></i> Start Your Journey
                  </button>
                  <button className="btn btn-outline btn-large" onClick={handleSignIn}>
                    <i className="fas fa-sign-in-alt"></i> I Have an Account
                  </button>
                </div>
              </div>
            </section>

            <section className="features-section container">
              <div className="quiz-overview">
                <div className="overview-card">
                  <i className="fas fa-clock"></i>
                  <h3>30 Minutes</h3>
                  <p>Complete the quiz at your own pace</p>
                </div>
                <div className="overview-card">
                  <i className="fas fa-question-circle"></i>
                  <h3>20 Questions</h3>
                  <p>Carefully selected for comprehensive coverage</p>
                </div>
                <div className="overview-card">
                  <i className="fas fa-trophy"></i>
                  <h3>70% to Pass</h3>
                  <p>Achieve excellence and track your improvement</p>
                </div>
                <div className="overview-card">
                  <i className="fas fa-save"></i>
                  <h3>Auto-Save</h3>
                  <p>Your progress is always safe</p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="dashboard-section container">
              <div className="welcome-back">
                <h2>Ready for your next challenge?</h2>
                <p className="dashboard-description">
                  Continue your learning journey. Track your progress and master new skills.
                </p>
                
                <div className="quiz-actions">
                  <button onClick={handleStartQuiz} className="btn btn-primary btn-hero">
                    <i className="fas fa-play"></i> Start New Quiz
                  </button>
                  <button onClick={handlePracticeMode} className="btn btn-outline">
                    <i className="fas fa-dumbbell"></i> Practice Mode
                  </button>
                  <button onClick={handleViewResults} className="btn btn-secondary">
                    <i className="fas fa-history"></i> View History
                  </button>
                </div>
              </div>

              <div className="dashboard-stats">
                <div className="stat-card primary">
                  <div className="stat-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <div className="stat-content">
                    <h3>{statsLoading ? '...' : userStats.totalQuizzes}</h3>
                    <p>Quizzes Completed</p>
                    {/* <span className="stat-trend">
                      {!statsLoading && userStats.quizzesThisWeek > 0 && `+${userStats.quizzesThisWeek} this week`}
                    </span> */}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-star"></i>
                  </div>
                  <div className="stat-content">
                    <h3>{statsLoading ? '...' : userStats.averageScore}%</h3>
                    <p>Average Score</p>
                    <span className={`performance-badge ${getPerformanceIndicator().color}`}>
                       {getPerformanceIndicator().text}
                    </span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-medal"></i>
                  </div>
                  <div className="stat-content">
                    <h3>{statsLoading ? '...' : userStats.rank}</h3>
                    <p>Current Rank</p>
                    <span className="rank-progress">
                      Best: {statsLoading ? '...' : userStats.bestScore}%
                    </span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-fire"></i>
                  </div>
                  <div className="stat-content">
                    <h3>{statsLoading ? '...' : userStats.streak}</h3>
                    <p>Day Streak</p>
                    <span className="streak-status">
                      {statsLoading ? '...' : userStats.streak > 0 ? 'Keep it up!' : 'Start today!'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="recent-activity container">
              <h3>Quick Actions</h3>
              <div className="action-grid">
                <button onClick={handleStartQuiz} className="action-card primary-action">
                  <i className="fas fa-play-circle"></i>
                  <h4>Take Quiz</h4>
                  <p>Start a new assessment</p>
                  <span className="action-badge">Popular</span>
                </button>
                <button onClick={handleViewResults} className="action-card">
                  <i className="fas fa-history"></i>
                  <h4>Quiz History</h4>
                  <p>View all your results</p>
                  {!statsLoading && userStats.totalQuizzes > 0 && (
                    <span className="action-count">{userStats.totalQuizzes} attempts</span>
                  )}
                </button>
                <button onClick={handlePracticeMode} className="action-card">
                  <i className="fas fa-code"></i>
                  <h4>Practice</h4>
                  <p>Improve specific skills</p>
                </button>
                <button onClick={handleLeaderboard} className="action-card">
                  <i className="fas fa-trophy"></i>
                  <h4>Leaderboard</h4>
                  <p>See top performers</p>
                </button>
              </div>
            </section>

            <section className="progress-section container">
              <h3>Your Progress</h3>
              <div className="progress-cards">
                <div className="progress-card">
                  <div className="progress-header">
                    <h4>Weekly Goal</h4>
                    <span className="progress-percentage">
                      {statsLoading ? '...' : Math.min(100, ((userStats.quizzesThisWeek || 0) / 5) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${statsLoading ? 0 : Math.min(100, ((userStats.quizzesThisWeek || 0) / 5) * 100)}%` }}
                    ></div>
                  </div>
                  <p>{statsLoading ? '...' : userStats.quizzesThisWeek || 0} of 5 quizzes completed</p>
                  <button onClick={handleStartQuiz} className="progress-action">
                    Take Quiz
                  </button>
                </div>
                
                <div className="progress-card">
                  <div className="progress-header">
                    <h4>Accuracy Rate</h4>
                    <span className="progress-percentage">
                      {statsLoading ? '...' : userStats.averageScore || 0}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill accuracy" 
                      style={{ width: `${statsLoading ? 0 : userStats.averageScore || 0}%` }}
                    ></div>
                  </div>
                  <p>Average across all quizzes</p>
                  <button onClick={handleViewResults} className="progress-action">
                    View Details
                  </button>
                </div>

                <div className="progress-card">
                  <div className="progress-header">
                    <h4>Consistency</h4>
                    <span className="progress-percentage">
                      {statsLoading ? '...' : userStats.consistencyScore || 0}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill consistency" 
                      style={{ width: `${statsLoading ? 0 : userStats.consistencyScore || 0}%` }}
                    ></div>
                  </div>
                  <p>Performance consistency score</p>
                  <button onClick={handleViewResults} className="progress-action">
                    Analyze
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              {!statsLoading && userStats.recentActivity?.length > 0 && (

                <div className="recent-activity-list">
                  <h4>Recent Activity</h4>
                  <div className="activity-items">
                    {userStats.recentActivity.slice(0, 3).map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-icon">
                          <i className={`fas ${activity.passed ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                        </div>
                        <div className="activity-content">
                          <h5>{activity.title}</h5>
                          <p>{activity.score}% • {activity.date}</p>
                        </div>
                        <div className={`activity-status ${activity.passed ? 'passed' : 'failed'}`}>
                          {activity.passed ? '✅' : '❌'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleViewResults} className="view-all-btn">
                    View All Activity
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        
      </main>

      {/* Enhanced Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <span>© {new Date().getFullYear()} QuizRipple. All rights reserved.</span>
            <div className="footer-links">
              <Link to="/help">Help</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              {isLoggedIn && (
                <>
                  <Link to="/contact">Contact</Link>
                  <button onClick={handleViewResults} className="footer-link-btn">
                    Quiz History
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
