// src/components/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const Dashboard = ({ onError, onSuccess }) => {
  const navigate = useNavigate();

  // State management
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    bestScore: 0,
    streak: 0,
    weeklyGoal: 5,
    weeklyProgress: 0,
    rank: 'Beginner',
    recentQuizzes: [],
    achievements: [],
    totalTime: 0,
    passRate: 0
  });
  const [goals, setGoals] = useState({
    weekly: { target: 5, current: 0, completed: false },
    monthly: { target: 20, current: 0, completed: false },
    accuracy: { target: 85, current: 0, completed: false }
  });
  const [notifications, setNotifications] = useState([]);
  const [timeOfDay, setTimeOfDay] = useState('');

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Get greeting based on time
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 17) return '☀️ Good Afternoon';
    if (hour < 21) return '🌆 Good Evening';
    return '🌙 Good Night';
  }, []);

  // Load user data and stats
  const loadUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        navigate('/signin');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setTimeOfDay(getGreeting());

      // Load stats from localStorage or API
      await loadStats(parsedUser);
      await loadNotifications();

    } catch (error) {
      console.error('Error loading user data:', error);
      if (onError) onError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [navigate, getGreeting, onError]);

  // Load statistics
  const loadStats = useCallback(async (userData) => {
    try {
      // Try localStorage first
      const savedStats = localStorage.getItem('userStats');
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        setStats(prev => ({ ...prev, ...parsedStats }));
        updateGoals(parsedStats);
      }

      // Try to fetch from API for latest data
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const apiStats = await response.json();
        setStats(prev => ({ ...prev, ...apiStats }));
        updateGoals(apiStats);
        localStorage.setItem('userStats', JSON.stringify(apiStats));
      }
    } catch (error) {
      console.warn('Could not load stats from API, using local data');
    }
  }, [API_BASE_URL]);

  // Update goals based on stats
  const updateGoals = useCallback((currentStats) => {
    const weeklyProgress = currentStats.quizzesThisWeek || 0;
    const monthlyProgress = currentStats.totalQuizzes || 0;
    const accuracy = currentStats.averageScore || 0;

    setGoals({
      weekly: {
        target: 5,
        current: weeklyProgress,
        completed: weeklyProgress >= 5
      },
      monthly: {
        target: 20,
        current: Math.min(monthlyProgress, 20),
        completed: monthlyProgress >= 20
      },
      accuracy: {
        target: 85,
        current: accuracy,
        completed: accuracy >= 85
      }
    });
  }, []);

  // Load notifications
  const loadNotifications = useCallback(() => {
    const notifications = [];
    
    // Check for streak notifications
    const savedStats = JSON.parse(localStorage.getItem('userStats') || '{}');
    if (savedStats.streak > 0) {
      notifications.push({
        id: 'streak',
        type: 'success',
        title: `${savedStats.streak} Day Streak! 🔥`,
        message: 'Keep it up! Take another quiz to maintain your streak.',
        action: () => navigate('/quiz')
      });
    }

    // Check for goals
    if (savedStats.quizzesThisWeek >= 5) {
      notifications.push({
        id: 'weekly-goal',
        type: 'achievement',
        title: 'Weekly Goal Achieved! 🎯',
        message: 'You\'ve completed your weekly quiz goal.',
        action: () => navigate('/profile')
      });
    }

    // Add welcome back message
    notifications.push({
      id: 'welcome',
      type: 'info',
      title: 'Welcome back!',
      message: 'Ready to continue your learning journey?',
      action: () => navigate('/quiz')
    });

    setNotifications(notifications.slice(0, 3)); // Limit to 3 notifications
  }, [navigate]);

  // Quick actions
  const quickActions = useMemo(() => [
    {
      title: 'Take Quiz',
      description: 'Start a new assessment',
      icon: 'fas fa-play-circle',
      color: 'primary',
      action: () => navigate('/quiz'),
      badge: 'Popular'
    },
    {
      title: 'Practice Mode',
      description: 'Improve specific skills',
      icon: 'fas fa-dumbbell',
      color: 'secondary',
      action: () => navigate('/practice')
    },
    {
      title: 'View Results',
      description: 'Analyze your performance',
      icon: 'fas fa-chart-line',
      color: 'info',
      action: () => navigate('/all-results'),
      badge: stats.totalQuizzes > 0 ? `${stats.totalQuizzes} attempts` : null
    },
    {
      title: 'Leaderboard',
      description: 'See top performers',
      icon: 'fas fa-trophy',
      color: 'warning',
      action: () => navigate('/leaderboard')
    }
  ], [navigate, stats.totalQuizzes]);

  // Performance insights
  const insights = useMemo(() => {
    const insights = [];
    
    if (stats.averageScore > 0) {
      if (stats.averageScore >= 90) {
        insights.push({
          type: 'success',
          title: 'Outstanding Performance!',
          message: `Your average score of ${stats.averageScore}% is excellent.`
        });
      } else if (stats.averageScore >= 75) {
        insights.push({
          type: 'info',
          title: 'Good Progress',
          message: `You're doing well with ${stats.averageScore}% average. Aim for 90%!`
        });
      } else {
        insights.push({
          type: 'warning',
          title: 'Room for Improvement',
          message: 'Focus on practice to boost your scores.'
        });
      }
    }

    if (stats.streak === 0) {
      insights.push({
        type: 'info',
        title: 'Start Your Streak',
        message: 'Take a quiz today to begin building your learning streak!'
      });
    }

    return insights;
  }, [stats]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <h3>Loading Dashboard...</h3>
          <p>Preparing your overview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <h1>{timeOfDay}, {user?.name || 'User'}!</h1>
              <p>Here's your learning overview for today</p>
            </div>
            <div className="header-right">
              <button 
                onClick={() => navigate('/quiz')} 
                className="btn btn-primary btn-hero"
              >
                <i className="fas fa-play"></i>
                Take Quiz Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="dashboard-content">
          {/* Key Stats Overview */}
          <section className="stats-overview">
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-header">
                  <div className="stat-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <div className="stat-trend">
                    {stats.totalQuizzes > 0 && (
                      <span className="trend-up">+{stats.quizzesThisWeek || 0} this week</span>
                    )}
                  </div>
                </div>
                <div className="stat-content">
                  <h3>{stats.totalQuizzes}</h3>
                  <p>Quizzes Completed</p>
                </div>
              </div>

              <div className="stat-card success">
                <div className="stat-header">
                  <div className="stat-icon">
                    <i className="fas fa-percentage"></i>
                  </div>
                  <div className="stat-trend">
                    {stats.averageScore >= 75 ? (
                      <span className="trend-up">Great!</span>
                    ) : (
                      <span className="trend-neutral">Keep going</span>
                    )}
                  </div>
                </div>
                <div className="stat-content">
                  <h3>{stats.averageScore}%</h3>
                  <p>Average Score</p>
                </div>
              </div>

              <div className="stat-card warning">
                <div className="stat-header">
                  <div className="stat-icon">
                    <i className="fas fa-fire"></i>
                  </div>
                  <div className="stat-trend">
                    {stats.streak > 0 ? (
                      <span className="trend-up">Active</span>
                    ) : (
                      <span className="trend-neutral">Start today</span>
                    )}
                  </div>
                </div>
                <div className="stat-content">
                  <h3>{stats.streak}</h3>
                  <p>Day Streak</p>
                </div>
              </div>

              <div className="stat-card info">
                <div className="stat-header">
                  <div className="stat-icon">
                    <i className="fas fa-medal"></i>
                  </div>
                </div>
                <div className="stat-content">
                  <h3>{stats.rank}</h3>
                  <p>Current Rank</p>
                </div>
              </div>
            </div>
          </section>

          {/* Goals Progress */}
          <section className="goals-section">
            <h2>Your Goals</h2>
            <div className="goals-grid">
              <div className={`goal-card ${goals.weekly.completed ? 'completed' : ''}`}>
                <div className="goal-header">
                  <h4>Weekly Target</h4>
                  {goals.weekly.completed && <i className="fas fa-check-circle goal-check"></i>}
                </div>
                <div className="goal-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${Math.min(100, (goals.weekly.current / goals.weekly.target) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {goals.weekly.current} / {goals.weekly.target} quizzes
                  </span>
                </div>
                <p>{goals.weekly.completed ? 'Goal achieved!' : `${goals.weekly.target - goals.weekly.current} more to go`}</p>
              </div>

              <div className={`goal-card ${goals.accuracy.completed ? 'completed' : ''}`}>
                <div className="goal-header">
                  <h4>Accuracy Target</h4>
                  {goals.accuracy.completed && <i className="fas fa-check-circle goal-check"></i>}
                </div>
                <div className="goal-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill accuracy"
                      style={{ width: `${Math.min(100, (goals.accuracy.current / goals.accuracy.target) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {goals.accuracy.current}% / {goals.accuracy.target}%
                  </span>
                </div>
                <p>{goals.accuracy.completed ? 'Excellent accuracy!' : 'Keep improving your scores'}</p>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            {/* Quick Actions */}
            <section className="quick-actions">
              <h2>Quick Actions</h2>
              <div className="actions-grid">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`action-card ${action.color}`}
                  >
                    <div className="action-icon">
                      <i className={action.icon}></i>
                    </div>
                    <div className="action-content">
                      <h4>{action.title}</h4>
                      <p>{action.description}</p>
                      {action.badge && (
                        <span className="action-badge">{action.badge}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Recent Activity */}
            <section className="recent-activity">
              <h2>Recent Activity</h2>
              {stats.recentQuizzes && stats.recentQuizzes.length > 0 ? (
                <div className="activity-list">
                  {stats.recentQuizzes.slice(0, 5).map((quiz, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">
                        <i className={`fas ${quiz.passed ? 'fa-check-circle success' : 'fa-times-circle error'}`}></i>
                      </div>
                      <div className="activity-content">
                        <h4>{quiz.title || 'Quiz'}</h4>
                        <p>Score: {quiz.score}%</p>
                        <span className="activity-date">
                          {new Date(quiz.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-activity">
                  <i className="fas fa-clipboard-list"></i>
                  <p>No recent activity</p>
                  <button onClick={() => navigate('/quiz')} className="btn btn-outline">
                    Take Your First Quiz
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Notifications & Insights */}
          {(notifications.length > 0 || insights.length > 0) && (
            <section className="notifications-insights">
              {notifications.length > 0 && (
                <div className="notifications">
                  <h3>Notifications</h3>
                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`notification ${notification.type}`}>
                        <div className="notification-content">
                          <h4>{notification.title}</h4>
                          <p>{notification.message}</p>
                        </div>
                        {notification.action && (
                          <button 
                            onClick={notification.action}
                            className="notification-action"
                          >
                            <i className="fas fa-arrow-right"></i>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.length > 0 && (
                <div className="insights">
                  <h3>Insights</h3>
                  <div className="insight-list">
                    {insights.map((insight, index) => (
                      <div key={index} className={`insight ${insight.type}`}>
                        <div className="insight-icon">
                          <i className={`fas ${
                            insight.type === 'success' ? 'fa-lightbulb' :
                            insight.type === 'warning' ? 'fa-exclamation-triangle' :
                            'fa-info-circle'
                          }`}></i>
                        </div>
                        <div className="insight-content">
                          <h4>{insight.title}</h4>
                          <p>{insight.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Navigation Cards */}
          <section className="navigation-section">
            <h2>Explore More</h2>
            <div className="nav-cards">
              <button onClick={() => navigate('/all-results')} className="nav-card">
                <i className="fas fa-chart-bar"></i>
                <h4>Detailed Analytics</h4>
                <p>Deep dive into your quiz performance with charts and trends</p>
              </button>
              <button onClick={() => navigate('/profile')} className="nav-card">
                <i className="fas fa-user-cog"></i>
                <h4>Profile Settings</h4>
                <p>Manage your account, preferences, and security settings</p>
              </button>
              <button onClick={() => navigate('/leaderboard')} className="nav-card">
                <i className="fas fa-trophy"></i>
                <h4>Leaderboard</h4>
                <p>See how you rank against other quiz masters</p>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
