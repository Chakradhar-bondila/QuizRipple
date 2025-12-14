import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Results.css';

const Results = ({ onError, onSuccess }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Core state
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [questionFilter, setQuestionFilter] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);

  // Simplified state management
  const [dataState, setDataState] = useState({
    loaded: false,
    saved: false,
    processing: false
  });

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Stable references
  const abortControllerRef = useRef(null);

  // Get auth headers
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

  // Load user data once
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        onError?.('Could not load user data');
      }
    }
  }, [onError]);

  // Save results to backend
  const saveResultsToBackend = useCallback(async (resultsData) => {
    if (!user || dataState.saved || dataState.processing) {
      return;
    }

    setDataState(prev => ({ ...prev, processing: true }));
    setSaving(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/quiz-results`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ results: resultsData })
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          navigate('/signin');
          return;
        }
        throw new Error(`Failed to save results: ${response.status}`);
      }

      const savedResult = await response.json();
      
      if (savedResult.id) {
        resultsData.serverId = savedResult.id;
        localStorage.setItem('quiz-results', JSON.stringify(resultsData));
      }

      setDataState(prev => ({ ...prev, saved: true }));
      onSuccess?.('Quiz results saved successfully!');
      
    } catch (error) {
      console.error('Error saving results:', error);
      const errorMessage = error.message?.includes('Failed to fetch') 
        ? 'Unable to connect to server. Results saved locally.'
        : 'Failed to save results to server. Results saved locally.';
      onError?.(errorMessage);
    } finally {
      setSaving(false);
      setDataState(prev => ({ ...prev, processing: false }));
    }
  }, [user, dataState.saved, dataState.processing, API_BASE_URL, getAuthHeaders, onSuccess, onError, navigate]);

  // Load results - simplified logic
  useEffect(() => {
    if (!user || dataState.loaded) return;

    const loadResults = async () => {
      setDataState(prev => ({ ...prev, loaded: true }));
      setLoading(true);
      setError(null);

      try {
        let resultsData = null;

        // Check if coming from quiz completion
        if (location.state?.fromQuiz && location.state?.results) {
          resultsData = location.state.results;
          console.log('Loading results from quiz completion');
          
          // Clear navigation state
          navigate(location.pathname, { replace: true, state: {} });
          
          // Save to backend
          await saveResultsToBackend(resultsData);
        } else {
          // Load from localStorage
          const savedResults = localStorage.getItem('quiz-results');
          if (savedResults) {
            try {
              resultsData = JSON.parse(savedResults);
              console.log('Loading results from localStorage');
            } catch (error) {
              console.error('Error parsing saved results:', error);
              throw new Error('Invalid saved results data');
            }
          }
        }

        if (!resultsData) {
          navigate('/quiz', { replace: true });
          return;
        }

        setResults(resultsData);
        
      } catch (error) {
        console.error('Error loading results:', error);
        setError('Failed to load quiz results. Please try again.');
        onError?.(error.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [user, location.state, navigate, saveResultsToBackend, onError, dataState.loaded]);

  // Safe math calculations
  const safeCalculate = useCallback((numerator, denominator, fallback = 0) => {
    if (!denominator || denominator === 0) return fallback;
    return Math.round((numerator / denominator) * 100);
  }, []);

  const safeDivide = useCallback((numerator, denominator, fallback = 0) => {
    if (!denominator || denominator === 0) return fallback;
    return Math.round((numerator / denominator) * 100) / 100;
  }, []);

  // Performance insights with safe calculations
  const performanceInsights = useMemo(() => {
    if (!results) return [];

    const insights = [];
    const totalQuestions = results.totalQuestions || 1;
    const answeredQuestions = results.answeredQuestions || 0;
    const correctAnswers = results.correctAnswers || 0;
    const percentage = results.percentage || 0;
    const avgTimePerQuestion = results.timing?.averageTimePerQuestion || 0;
    
    // Overall performance
    if (results.passed) {
      insights.push({
        type: 'success',
        title: 'Congratulations!',
        message: `You passed the quiz with ${percentage}% score!`
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Keep Learning!',
        message: `You scored ${percentage}%. The passing score is ${results.quizConfig?.passingScore || 70}%.`
      });
    }

    // Time management
    if (avgTimePerQuestion < 30) {
      insights.push({
        type: 'info',
        title: 'Speed Master!',
        message: `You averaged ${avgTimePerQuestion}s per question. Excellent time management!`,
         
      });
    } else if (avgTimePerQuestion > 120) {
      insights.push({
        type: 'warning',
        title: 'Time Management',
        message: `You averaged ${avgTimePerQuestion}s per question. Consider practicing faster recall.`
      });
    }

    // Completion rate
    const completionRate = safeCalculate(answeredQuestions, totalQuestions);
    if (completionRate === 100) {
      insights.push({
        type: 'success',
        title: 'Complete Attempt!',
        message: 'You answered all questions. Great thoroughness!'
      });
    } else if (completionRate < 70) {
      insights.push({
        type: 'warning',
        title: 'Incomplete Attempt',
        message: `You answered ${completionRate}% of questions. Try to complete more questions next time.`
      });
    }

    // Accuracy
    const accuracy = safeCalculate(correctAnswers, answeredQuestions);
    if (accuracy >= 90) {
      insights.push({
        type: 'success',
        title: 'High Accuracy!',
        message: `${accuracy}% accuracy on answered questions. Excellent knowledge!`,
      });
    } else if (accuracy < 60) {
      insights.push({
        type: 'info',
        title: 'Focus on Accuracy',
        message: `${accuracy}% accuracy. Consider reviewing concepts before attempting.`,
        
      });
    }

    return insights;
  }, [results, safeCalculate]);

  // Performance statistics with safe calculations
  const performanceStats = useMemo(() => {
    if (!results) return null;

    const totalQuestions = results.totalQuestions || 1;
    const answeredQuestions = results.answeredQuestions || 0;
    const correctAnswers = results.correctAnswers || 0;
    const avgTimePerQuestion = results.timing?.averageTimePerQuestion || 0;
    const totalTimeSpent = (results.timing?.totalTimeSpent || 0) / 1000;
    const timeLimit = results.quizConfig?.timeLimit || 0;

    return {
      accuracy: safeCalculate(correctAnswers, answeredQuestions),
      efficiency: safeDivide(correctAnswers, totalTimeSpent),
      speedRating: avgTimePerQuestion < 60 ? 'Fast' : avgTimePerQuestion < 120 ? 'Moderate' : 'Slow',
      completionRate: safeCalculate(answeredQuestions, totalQuestions),
      timeEfficiency: timeLimit > 0 ? Math.max(0, safeCalculate(timeLimit - totalTimeSpent, timeLimit)) : 0
    };
  }, [results, safeCalculate, safeDivide]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (!results?.questionResults) return [];
    
    switch (questionFilter) {
      case 'correct':
        return results.questionResults.filter(q => q.status === 'correct');
      case 'incorrect':
        return results.questionResults.filter(q => q.status === 'incorrect');
      case 'skipped':
        return results.questionResults.filter(q => q.status === 'skipped');
      default:
        return results.questionResults;
    }
  }, [results?.questionResults, questionFilter]);

  // Format time helper
  const formatDuration = useCallback((milliseconds) => {
    const totalSeconds = Math.floor((milliseconds || 0) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Export functionality
  const exportResults = useCallback(async () => {
    if (!results || exportLoading) return;
    
    setExportLoading(true);
    
    try {
      const printContent = generatePrintContent(results, user, performanceStats, performanceInsights);
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        onSuccess?.('Results exported successfully!');
      } else {
        throw new Error('Unable to open print window');
      }
    } catch (error) {
      console.error('Error exporting results:', error);
      onError?.('Failed to export results. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }, [results, user, performanceStats, performanceInsights, exportLoading, onSuccess, onError]);

  // Generate print content
  const generatePrintContent = (results, user, performanceStats, performanceInsights) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quiz Results - ${results.student?.name || user?.name || 'User'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #667eea; padding-bottom: 20px; }
            .score { font-size: 32px; font-weight: bold; color: #667eea; margin: 20px 0; }
            .details { margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .detail-section { background: #f8f9fa; padding: 15px; border-radius: 8px; }
            .question { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .correct { background-color: #d1fae5; border-left: 4px solid #10b981; }
            .incorrect { background-color: #fee2e2; border-left: 4px solid #ef4444; }
            .skipped { background-color: #fef3c7; border-left: 4px solid #f59e0b; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Quiz Results Report</h1>
            <h2>${results.quizConfig?.title || 'Quiz Results'}</h2>
            <p><strong>Student:</strong> ${results.student?.name || user?.name || 'User'}</p>
            <p><strong>Date:</strong> ${new Date(results.timing?.submitTime || Date.now()).toLocaleString()}</p>
            <div class="score">Final Score: ${results.percentage}% (${results.grade})</div>
            <p><strong>Status:</strong> ${results.passed ? '✅ PASSED' : '❌ FAILED'}</p>
          </div>
          
          <div class="details">
            <div class="detail-section">
              <h3>📊 Score Summary</h3>
              <p>Total Score: ${results.totalScore || 0} / ${results.maxScore || 0}</p>
              <p>Percentage: ${results.percentage}%</p>
              <p>Grade: ${results.grade}</p>
              <p>Status: ${results.passed ? 'PASSED' : 'FAILED'}</p>
            </div>
            
            <div class="detail-section">
              <h3>📈 Performance Stats</h3>
              <p>Accuracy: ${performanceStats?.accuracy || 0}%</p>
              <p>Completion: ${performanceStats?.completionRate || 0}%</p>
              <p>Speed: ${performanceStats?.speedRating || 'Unknown'}</p>
              <p>Time Efficiency: ${performanceStats?.timeEfficiency || 0}%</p>
            </div>
          </div>
          
          <div class="questions">
            <h3>📝 Question Analysis</h3>
            ${results.questionResults?.map(q => `
              <div class="question ${q.status}">
                <strong>Q${q.questionNumber}:</strong> ${q.questionText}<br>
                <strong>Your Answer:</strong> ${q.userAnswerText || 'Not Answered'}<br>
                <strong>Correct Answer:</strong> ${q.correctAnswerText || 'N/A'}<br>
                <strong>Status:</strong> ${q.status?.toUpperCase() || 'UNKNOWN'}<br>
                <strong>Time:</strong> ${q.timeSpent || 0}s<br>
                <strong>Points:</strong> ${q.points || 0}
              </div>
            `).join('') || ''}
          </div>
        </body>
      </html>
    `;
  };

  // Share functionality
  const shareResults = useCallback(async () => {
    if (!results) return;
    
    try {
      const shareData = {
        title: `Quiz Results - ${results.quizConfig?.title || 'Quiz'}`,
        text: `I scored ${results.percentage}% on "${results.quizConfig?.title || 'a quiz'}"! ${results.passed ? '🎉' : '📚'}`,
        url: window.location.href
      };

      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        onSuccess?.('Results shared successfully!');
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        onSuccess?.('Results link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing results:', error);
      onError?.('Failed to share results. Please try again.');
    }
  }, [results, onSuccess, onError]);

  // Navigation functions
  const retakeQuiz = useCallback(() => {
    localStorage.removeItem('quiz-results');
    localStorage.removeItem('quiz-progress');
    localStorage.removeItem('quiz-current');
    navigate('/quiz', { replace: true });
  }, [navigate]);

  const viewAllResults = useCallback(() => {
    navigate('/all-results');
  }, [navigate]);

  const goHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="results-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading Results...</h2>
          <p>Processing your quiz performance...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="results-error">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h2>Error Loading Results</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              🔄 Retry
            </button>
            <button onClick={goHome} className="btn btn-outline">
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No results state
  if (!results) {
    return (
      <div className="results-error">
        <div className="error-container">
          <div className="error-icon">📊</div>
          <h2>No Results Found</h2>
          <p>No quiz results to display. Please take a quiz first.</p>
          <div className="error-actions">
            <button onClick={() => navigate('/quiz')} className="btn btn-primary">
              Take Quiz
            </button>
            <button onClick={goHome} className="btn btn-outline">
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Safe calculations for display
  const totalQuestions = results.totalQuestions || 1;
  const answeredQuestions = results.answeredQuestions || 0;
  const correctAnswers = results.correctAnswers || 0;
  const skippedQuestions = results.skippedQuestions || 0;
  const incorrectAnswers = Math.max(0, totalQuestions - correctAnswers - skippedQuestions);

  return (
    <div className="results-container">
      {/* Saving indicator */}
      {saving && (
        <div className="saving-indicator">
          <div className="saving-spinner"></div>
          <span>Saving results to server...</span>
        </div>
      )}

      {/* Header */}
      <div className="results-header">
        <div className="header-content">
          <h1>Quiz Results</h1>
          <div className="header-info">
            <span className="quiz-title">{results.quizConfig?.title || 'Quiz Results'}</span>
            <span className="student-name">👤 {results.student?.name || user?.name || 'User'}</span>
            <span className="submit-date">
              {new Date(results.timing?.submitTime || Date.now()).toLocaleDateString()}
            </span>
            <span className="submit-time">
              {new Date(results.timing?.submitTime || Date.now()).toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={exportResults} 
            className="action-btn export-btn"
            disabled={exportLoading}
          >
            {exportLoading ? (
              <>
                <div className="btn-spinner"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <span>Export</span>
              </>
            )}
          </button>
          <button onClick={shareResults} className="action-btn share-btn">
            <span>Share</span>
          </button>
          <button onClick={viewAllResults} className="action-btn history-btn">
            <span>View History</span>
          </button>
          <button onClick={retakeQuiz} className="action-btn retake-btn">
            <span>Retake</span>
          </button>
          <button onClick={goHome} className="action-btn home-btn">
            <span>Home</span>
          </button>
        </div>
      </div>

      {/* Score Overview */}
      <div className="score-overview">
        <div className="score-card main-score">
          <div className="score-circle">
            <div className="score-number">{results.percentage}%</div>
            <div className="score-grade">{results.grade}</div>
          </div>
          <div className="score-status">
            <span className={`status-badge ${results.passed ? 'passed' : 'failed'}`}>
              {results.passed ? '✅ PASSED' : '❌ FAILED'}
            </span>
          </div>
        </div>

        <div className="score-metrics">
          <div className="metric-card">
            <div className="metric-value">{correctAnswers}</div>
            <div className="metric-label">Correct</div>
            <div className="metric-percentage">
              {safeCalculate(correctAnswers, totalQuestions)}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{incorrectAnswers}</div>
            <div className="metric-label">Incorrect</div>
            <div className="metric-percentage">
              {safeCalculate(incorrectAnswers, totalQuestions)}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{skippedQuestions}</div>
            <div className="metric-label">Skipped</div>
            <div className="metric-percentage">
              {safeCalculate(skippedQuestions, totalQuestions)}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{results.timing?.totalTimeSpentFormatted || '0:00'}</div>
            <div className="metric-label">Time Taken</div>
            <div className="metric-percentage">
              Avg: {results.timing?.averageTimePerQuestion || 0}s/Q
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      {performanceInsights && performanceInsights.length > 0 && (
        <div className="insights-section">
          <h3>Performance Insights</h3>
          <div className="insights-grid">
            {performanceInsights.map((insight, index) => (
              <div key={index} className={`insight-card ${insight.type}`}>
                <div className="insight-header">
                  <span className="insight-icon">{insight.icon}</span>
                  <h4>{insight.title}</h4>
                </div>
                <p>{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Statistics */}
      {performanceStats && (
        <div className="advanced-stats-section">
          <h3>Advanced Statistics</h3>
          <div className="advanced-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-value">{performanceStats.accuracy}%</div>
                <div className="stat-label">Accuracy Rate</div>
                <div className="stat-description">On answered questions</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <div className="stat-value">{performanceStats.speedRating}</div>
                <div className="stat-label">Speed Rating</div>
                <div className="stat-description">Response time</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-content">
                <div className="stat-value">{performanceStats.completionRate}%</div>
                <div className="stat-label">Completion Rate</div>
                <div className="stat-description">Questions attempted</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-content">
                <div className="stat-value">{performanceStats.timeEfficiency}%</div>
                <div className="stat-label">Time Efficiency</div>
                <div className="stat-description">Time remaining</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            Questions ({filteredQuestions.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'timing' ? 'active' : ''}`}
            onClick={() => setActiveTab('timing')}
          >
            ⏱Timing
          </button>
        </div>

        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="tab-pane">
              <div className="overview-grid">
                <div className="overview-card">
                  <h4>Score Breakdown</h4>
                  <div className="breakdown-item">
                    <span>Total Score:</span>
                    <span>{results.totalScore || 0} / {results.maxScore || 0} points</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Percentage:</span>
                    <span>{results.percentage}%</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Grade:</span>
                    <span className="grade-display">{results.grade}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Status:</span>
                    <span className={`status-text ${results.passed ? 'passed' : 'failed'}`}>
                      {results.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span>Performance:</span>
                    <span>
                      {results.percentage >= 90 ? 'Excellent' : 
                       results.percentage >= 80 ? 'Good' : 
                       results.percentage >= 70 ? 'Average' : 'Needs Improvement'}
                    </span>
                  </div>
                </div>

                <div className="overview-card">
                  <h4>Performance Summary</h4>
                  <div className="breakdown-item">
                    <span>Questions Answered:</span>
                    <span>{answeredQuestions} / {totalQuestions}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Completion Rate:</span>
                    <span>{performanceStats?.completionRate || 0}%</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Accuracy Rate:</span>
                    <span>{performanceStats?.accuracy || 0}%</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Speed Rating:</span>
                    <span>{performanceStats?.speedRating || 'Unknown'}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Submission Method:</span>
                    <span className="capitalize">
                      {(results.submission?.reason || 'completed').replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="overview-card">
                  <h4>Time Analysis</h4>
                  <div className="breakdown-item">
                    <span>Total Time:</span>
                    <span>{results.timing?.totalTimeSpentFormatted || '0:00'}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Average per Question:</span>
                    <span>{results.timing?.averageTimePerQuestion || 0}s</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Time Limit:</span>
                    <span>{Math.floor((results.quizConfig?.timeLimit || 0) / 60)}:{String((results.quizConfig?.timeLimit || 0) % 60).padStart(2, '0')}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Time Efficiency:</span>
                    <span>{performanceStats?.timeEfficiency || 0}% remaining</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Pace:</span>
                    <span>{performanceStats?.speedRating || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="tab-pane">
              <div className="analytics-grid">
                {/* Difficulty Breakdown */}
                {results.analytics?.difficultyBreakdown && Object.keys(results.analytics.difficultyBreakdown).length > 0 && (
                  <div className="analytics-card">
                    <h4>Performance by Difficulty</h4>
                    <div className="analytics-list">
                      {Object.entries(results.analytics.difficultyBreakdown).map(([difficulty, stats]) => (
                        <div key={difficulty} className="analytics-item">
                          <div className="analytics-header">
                            <span className="difficulty-name">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                            <span className="difficulty-percentage">{stats.percentage || 0}%</span>
                          </div>
                          <div className="analytics-details">
                            <span>{stats.correct || 0} / {stats.total || 0} correct</span>
                            <span>({stats.attempted || 0} attempted)</span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${stats.percentage || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Breakdown */}
                {results.analytics?.categoryBreakdown && Object.keys(results.analytics.categoryBreakdown).length > 0 && (
                  <div className="analytics-card">
                    <h4>Performance by Category</h4>
                    <div className="analytics-list">
                      {Object.entries(results.analytics.categoryBreakdown).map(([category, stats]) => (
                        <div key={category} className="analytics-item">
                          <div className="analytics-header">
                            <span className="category-name">{category}</span>
                            <span className="category-percentage">{stats.percentage || 0}%</span>
                          </div>
                          <div className="analytics-details">
                            <span>{stats.correct || 0} / {stats.total || 0} correct</span>
                            <span>({stats.attempted || 0} attempted)</span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${stats.percentage || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Analysis */}
                <div className="analytics-card full-width">
                  <h4>⏱Detailed Time Analysis</h4>
                  <div className="time-stats">
                    <div className="time-stat">
                      <span className="time-label">Total Duration:</span>
                      <span className="time-value">{results.timing?.totalTimeSpentFormatted || '0:00'}</span>
                    </div>
                    <div className="time-stat">
                      <span className="time-label">Average per Question:</span>
                      <span className="time-value">{results.timing?.averageTimePerQuestion || 0}s</span>
                    </div>
                    <div className="time-stat">
                      <span className="time-label">Fastest Question:</span>
                      <span className="time-value">{Math.min(...(results.questionResults?.map(q => q.timeSpent || 0) || [0]))}s</span>
                    </div>
                    <div className="time-stat">
                      <span className="time-label">Slowest Question:</span>
                      <span className="time-value">{Math.max(...(results.questionResults?.map(q => q.timeSpent || 0) || [0]))}s</span>
                    </div>
                    <div className="time-stat">
                      <span className="time-label">Time Efficiency:</span>
                      <span className="time-value">
                        {(results.timing?.averageTimePerQuestion || 0) < 60 ? 'Excellent' :
                         (results.timing?.averageTimePerQuestion || 0) < 120 ? 'Good' : 'Needs Improvement'}
                      </span>
                    </div>
                    <div className="time-stat">
                      <span className="time-label">Pace Consistency:</span>
                      <span className="time-value">
                        {((Math.max(...(results.questionResults?.map(q => q.timeSpent || 0) || [0])) - 
                          Math.min(...(results.questionResults?.map(q => q.timeSpent || 0) || [0]))) < 60) ? 'Consistent' : 'Variable'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div className="tab-pane">
              <div className="questions-header">
                <h4>Question-by-Question Analysis</h4>
                <div className="questions-controls">
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="toggle-details-btn"
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                  <select 
                    className="question-filter"
                    value={questionFilter}
                    onChange={(e) => setQuestionFilter(e.target.value)}
                  >
                    <option value="all">All Questions ({results.questionResults?.length || 0})</option>
                    <option value="correct">Correct Only ({results.questionResults?.filter(q => q.status === 'correct').length || 0})</option>
                    <option value="incorrect">Incorrect Only ({results.questionResults?.filter(q => q.status === 'incorrect').length || 0})</option>
                    <option value="skipped">Skipped Only ({results.questionResults?.filter(q => q.status === 'skipped').length || 0})</option>
                  </select>
                </div>
              </div>
              
              <div className="questions-stats">
                <div className="stat-item">
                  <span className="stat-value">{results.questionResults?.filter(q => q.status === 'correct').length || 0}</span>
                  <span className="stat-label">Correct</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{results.questionResults?.filter(q => q.status === 'incorrect').length || 0}</span>
                  <span className="stat-label">Incorrect</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{results.questionResults?.filter(q => q.status === 'skipped').length || 0}</span>
                  <span className="stat-label">Skipped</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{results.questionResults?.filter(q => q.wasReviewed).length || 0}</span>
                  <span className="stat-label">Reviewed</span>
                </div>
              </div>
              
              <div className="questions-list">
                {filteredQuestions.map((question, index) => (
                  <div key={question.questionId || `q-${index}`} className={`question-item ${question.status || 'unknown'}`}>
                    <div className="question-header">
                      <div className="question-number">Q{question.questionNumber || index + 1}</div>
                      <div className="question-status">
                        <span className={`status-indicator ${question.status || 'unknown'}`}>
                          {question.status === 'correct' ? '✅' : 
                           question.status === 'incorrect' ? '❌' : '⏭️'}
                        </span>
                        <span className="status-text">{(question.status || 'unknown').toUpperCase()}</span>
                      </div>
                      <div className="question-metrics">
                        <span className="question-time">{question.timeSpent || 0}s</span>
                        <span className="question-points">{question.points || 0} pts</span>
                      </div>
                    </div>
                    
                    {showDetails && (
                      <div className="question-details">
                        <div className="question-text">
                          <strong>Question:</strong> {question.questionText || 'Question text not available'}
                        </div>
                        <div className="answer-details">
                          <div className="user-answer">
                            <strong>Your Answer:</strong> 
                            <span className={question.isCorrect ? 'correct-answer' : 'incorrect-answer'}>
                              {question.userAnswerText || 'Not Answered'}
                            </span>
                          </div>
                          <div className="correct-answer">
                            <strong>Correct Answer:</strong> 
                            <span className="correct-answer">{question.correctAnswerText || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="question-meta">
                          {question.difficulty && (
                            <span className="meta-item">
                              <strong>Difficulty:</strong> {question.difficulty}
                            </span>
                          )}
                          {question.category && (
                            <span className="meta-item">
                              <strong>Category:</strong> {question.category}
                            </span>
                          )}
                          <span className="meta-item">
                            <strong>Speed:</strong> {(question.timeSpent || 0) < 60 ? 'Fast' : (question.timeSpent || 0) < 120 ? 'Normal' : 'Slow'}
                          </span>
                          {question.wasReviewed && (
                            <span className="meta-item reviewed">🚩 Reviewed</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {filteredQuestions.length === 0 && (
                  <div className="no-questions">
                    <p>No questions match the selected filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timing Tab */}
          {activeTab === 'timing' && (
            <div className="tab-pane">
              <div className="timing-overview">
                <div className="timing-card">
                  <h4>Time Overview</h4>
                  <div className="timing-details">
                    <div className="timing-item">
                      <span className="timing-label">Start Time:</span>
                      <span className="timing-value">
                        {new Date(results.timing?.startTime || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <div className="timing-item">
                      <span className="timing-label">Submit Time:</span>
                      <span className="timing-value">
                        {new Date(results.timing?.submitTime || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <div className="timing-item">
                      <span className="timing-label">Total Duration:</span>
                      <span className="timing-value">
                        {formatDuration(results.timing?.totalTimeSpent || 0)}
                      </span>
                    </div>
                    <div className="timing-item">
                      <span className="timing-label">Time Limit:</span>
                      <span className="timing-value">
                        {Math.floor((results.quizConfig?.timeLimit || 0) / 60)}:{String((results.quizConfig?.timeLimit || 0) % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="timing-item">
                      <span className="timing-label">Time Used:</span>
                      <span className="timing-value">
                        {safeCalculate((results.timing?.totalTimeSpent || 0) / 1000, results.quizConfig?.timeLimit || 1)}%
                      </span>
                    </div>
                    <div className="timing-item">
                      <span className="timing-label">Average Speed:</span>
                      <span className="timing-value">
                        {results.timing?.averageTimePerQuestion || 0}s per question
                      </span>
                    </div>
                  </div>
                </div>

                <div className="timing-card">
                  <h4>Time Distribution</h4>
                  <div className="time-distribution">
                    {results.questionResults?.slice(0, 15).map((question, index) => {
                      const maxTime = Math.max(...(results.questionResults?.map(q => q.timeSpent || 0) || [1]));
                      const timePercent = maxTime > 0 ? ((question.timeSpent || 0) / maxTime) * 100 : 0;
                      
                      return (
                        <div key={question.questionId || `time-${index}`} className="time-bar">
                          <span className="question-label">Q{question.questionNumber || index + 1}</span>
                          <div className="time-bar-container">
                            <div 
                              className={`time-bar-fill ${question.status || 'unknown'}`}
                              style={{ width: `${timePercent}%` }}
                            ></div>
                          </div>
                          <span className="time-value">{question.timeSpent || 0}s</span>
                          <span className={`time-efficiency ${(question.timeSpent || 0) < 60 ? 'fast' : (question.timeSpent || 0) < 120 ? 'normal' : 'slow'}`}>
                            {(question.timeSpent || 0) < 60 ? '⚡' : (question.timeSpent || 0) < 120 ? '🔄' : '🐌'}
                          </span>
                        </div>
                      );
                    })}
                    {(results.questionResults?.length || 0) > 15 && (
                      <div className="more-questions">
                        ... and {(results.questionResults?.length || 0) - 15} more questions
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Results;
