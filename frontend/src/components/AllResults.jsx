import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import '../styles/AllResults.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Safe math utilities
const safeMath = {
  divide: (numerator, denominator, fallback = 0) => {
    if (!denominator || denominator === 0 || !Number.isFinite(denominator)) return fallback;
    const result = numerator / denominator;
    return Number.isFinite(result) ? result : fallback;
  },
  
  percentage: (numerator, denominator, fallback = 0) => {
    if (!denominator || denominator === 0 || !Number.isFinite(denominator)) return fallback;
    const result = (numerator / denominator) * 100;
    return Number.isFinite(result) ? Math.round(result) : fallback;
  },
  
  average: (values, fallback = 0) => {
    if (!Array.isArray(values) || values.length === 0) return fallback;
    const validValues = values.filter(v => Number.isFinite(v));
    if (validValues.length === 0) return fallback;
    const sum = validValues.reduce((a, b) => a + b, 0);
    return Math.round(sum / validValues.length);
  },
  
  max: (values, fallback = 0) => {
    if (!Array.isArray(values) || values.length === 0) return fallback;
    const validValues = values.filter(v => Number.isFinite(v));
    return validValues.length > 0 ? Math.max(...validValues) : fallback;
  },
  
  min: (values, fallback = 0) => {
    if (!Array.isArray(values) || values.length === 0) return fallback;
    const validValues = values.filter(v => Number.isFinite(v));
    return validValues.length > 0 ? Math.min(...validValues) : fallback;
  },
  
  variance: (values, fallback = 0) => {
    if (!Array.isArray(values) || values.length === 0) return fallback;
    const validValues = values.filter(v => Number.isFinite(v));
    if (validValues.length === 0) return fallback;
    const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const variance = validValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / validValues.length;
    return Number.isFinite(variance) ? variance : fallback;
  },
  
  round: (value, decimals = 0) => {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
};

// Simple Line Chart Component
const LineChart = ({ data, width = 500, height = 200, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>📊 No data available for {title}</p>
      </div>
    );
  }

  const scores = data.map(d => d.score).filter(s => Number.isFinite(s));
  if (scores.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>📊 No valid data for {title}</p>
      </div>
    );
  }

  const maxScore = safeMath.max(scores, 100);
  const minScore = safeMath.min(scores, 0);
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  const scoreRange = maxScore - minScore || 1;

  const points = data.map((d, i) => {
    const x = padding + (i * chartWidth) / Math.max(data.length - 1, 1);
    const y = height - padding - ((d.score - minScore) / scoreRange) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="chart-wrapper">
      <h4 className="chart-title">{title}</h4>
      <svg width={width} height={height} className="line-chart">
        <defs>
          <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ddd" strokeWidth="2"/>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ddd" strokeWidth="2"/>

        <polyline
          fill="none"
          stroke="var(--primary-600)"
          strokeWidth="3"
          points={points}
          className="chart-line"
        />

        {data.map((d, i) => {
          const x = padding + (i * chartWidth) / Math.max(data.length - 1, 1);
          const y = height - padding - ((d.score - minScore) / scoreRange) * chartHeight;
          return (
            <circle 
              key={i} 
              cx={x} 
              cy={y} 
              r={4} 
              fill="var(--primary-600)" 
              className="chart-point"
              tabIndex="0"
            >
              <title>{`${d.date}: ${d.score}%`}</title>
            </circle>
          );
        })}

        <text x={padding - 10} y={height - padding} fontSize="12" fill="var(--gray-600)" textAnchor="end">{minScore}%</text>
        <text x={padding - 10} y={padding + 5} fontSize="12" fill="var(--gray-600)" textAnchor="end">{maxScore}%</text>
        
        {data.length <= 10 && data.map((d, i) => {
          const x = padding + (i * chartWidth) / Math.max(data.length - 1, 1);
          return (
            <text 
              key={i}
              x={x} 
              y={height - padding + 20} 
              fontSize="10" 
              fill="var(--gray-600)" 
              textAnchor="middle"
            >
              {d.shortDate}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// Bar Chart Component
const BarChart = ({ data, width = 400, height = 200, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>📊 No data available for {title}</p>
      </div>
    );
  }

  const validData = data.filter(d => Number.isFinite(d.value));
  if (validData.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>📊 No valid data for {title}</p>
      </div>
    );
  }

  const maxValue = safeMath.max(validData.map(d => d.value), 1);
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  const barWidth = chartWidth / validData.length * 0.8;
  const barSpacing = chartWidth / validData.length * 0.2;

  return (
    <div className="chart-wrapper">
      <h4 className="chart-title">{title}</h4>
      <svg width={width} height={height} className="bar-chart">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ddd" strokeWidth="2"/>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ddd" strokeWidth="2"/>

        {validData.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = padding + i * (barWidth + barSpacing);
          const y = height - padding - barHeight;
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="var(--primary-500)"
                className="chart-bar"
                tabIndex="0"
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={height - padding + 15}
                fontSize="10"
                fill="var(--gray-600)"
                textAnchor="middle"
              >
                {d.label}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 5}
                fontSize="10"
                fill="var(--gray-700)"
                textAnchor="middle"
                fontWeight="600"
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Donut Chart Component
const DonutChart = ({ passed, failed, width = 200, height = 200 }) => {
  const passedCount = Number.isFinite(passed) ? Math.max(0, passed) : 0;
  const failedCount = Number.isFinite(failed) ? Math.max(0, failed) : 0;
  const total = passedCount + failedCount;
  
  if (total === 0) {
    return (
      <div className="chart-placeholder">
        <p>📊 No quiz data available</p>
      </div>
    );
  }

  const radius = Math.min(width, height) / 2 - 20;
  const innerRadius = radius * 0.6;
  const centerX = width / 2;
  const centerY = height / 2;

  const passedAngle = (passedCount / total) * 2 * Math.PI;
  const failedAngle = (failedCount / total) * 2 * Math.PI;

  const createArcPath = (startAngle, endAngle, outerRadius, innerRadius) => {
    const x1 = centerX + outerRadius * Math.cos(startAngle);
    const y1 = centerY + outerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(endAngle);
    const y2 = centerY + outerRadius * Math.sin(endAngle);
    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(startAngle);
    const y4 = centerY + innerRadius * Math.sin(startAngle);

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <div className="chart-wrapper">
      <h4 className="chart-title">Pass/Fail Distribution</h4>
      <svg width={width} height={height} className="donut-chart">
        <path
          d={createArcPath(-Math.PI / 2, -Math.PI / 2 + passedAngle, radius, innerRadius)}
          fill="var(--success-500)"
          className="chart-segment"
          tabIndex="0"
        >
          <title>{`Passed: ${passedCount} (${safeMath.percentage(passedCount, total)}%)`}</title>
        </path>
        
        <path
          d={createArcPath(-Math.PI / 2 + passedAngle, -Math.PI / 2 + passedAngle + failedAngle, radius, innerRadius)}
          fill="var(--error-500)"
          className="chart-segment"
          tabIndex="0"
        >
          <title>{`Failed: ${failedCount} (${safeMath.percentage(failedCount, total)}%)`}</title>
        </path>

        <text x={centerX} y={centerY - 5} textAnchor="middle" fontSize="18" fontWeight="bold" fill="var(--gray-700)">
          {total}
        </text>
        <text x={centerX} y={centerY + 15} textAnchor="middle" fontSize="12" fill="var(--gray-500)">
          Total Quizzes
        </text>
      </svg>
      
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: 'var(--success-500)'}}></span>
          <span>Passed ({passedCount})</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: 'var(--error-500)'}}></span>
          <span>Failed ({failedCount})</span>
        </div>
      </div>
    </div>
  );
};

const AllResults = ({ onError, onSuccess }) => {
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Enhanced state management
  const [state, setState] = useState({
    results: [],
    loading: true,
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
    hasNextPage: false,
    isLoadingMore: false,
    lastFetchTime: null
  });

  const [filters, setFilters] = useState({
    searchTerm: '',
    sortBy: 'date',
    filterBy: 'all',
    dateRange: 'all',
    scoreRange: [0, 100]
  });

  const [ui, setUi] = useState({
    viewMode: localStorage.getItem('resultsViewMode') || 'cards',
    selectedResults: new Set(),
    showVisualization: false,
    isOffline: !navigator.onLine
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(filters.searchTerm);
  const [user, setUser] = useState(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.searchTerm]);

  // Load user data
  useEffect(() => {
    const loadUser = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } else {
          navigate('/signin');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        navigate('/signin');
      }
    };
    
    loadUser();
  }, [navigate]);

  // Enhanced auth headers
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

  // Enhanced fetch with retry logic
  const fetchResults = useCallback(async (page = 1, append = false, retryCount = 0) => {
    if (!user?.id && !user?._id) {
      console.warn('No user ID available for fetching results');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ 
      ...prev, 
      loading: !append, 
      isLoadingMore: append,
      error: null 
    }));

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        search: debouncedSearchTerm || '',
        sort: filters.sortBy || 'date',
        filter: filters.filterBy || 'all',
        dateRange: filters.dateRange || 'all',
        scoreMin: (filters.scoreRange[0] || 0).toString(),
        scoreMax: (filters.scoreRange[1] || 100).toString()
      });

      const response = await fetch(
        `${API_BASE_URL}/api/quiz-results/user/${user.id || user._id}?${queryParams}`,
        {
          headers: getAuthHeaders(),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          navigate('/signin');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const totalPages = Number.isFinite(data.totalPages) ? Math.max(1, data.totalPages) : 1;
      const totalResults = Number.isFinite(data.total) ? Math.max(0, data.total) : 0;

      const newState = {
        results: append ? [...state.results, ...items] : items,
        currentPage: page,
        totalPages,
        totalResults,
        hasNextPage: Boolean(data.hasNextPage),
        loading: false,
        isLoadingMore: false,
        error: null,
        lastFetchTime: Date.now()
      };

      setState(prev => ({ ...prev, ...newState }));

    } catch (error) {
      if (error.name === 'AbortError') return;
      
      console.error('Error fetching results:', error);
      
      // Retry logic for network errors
      if (retryCount < 2 && error.message.includes('fetch')) {
        console.log(`Retrying request... (${retryCount + 1}/2)`);
        setTimeout(() => fetchResults(page, append, retryCount + 1), 1000);
        return;
      }
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        isLoadingMore: false,
        error: error.message 
      }));
      
      onError?.(`Failed to load quiz history: ${error.message}`);
    }
  }, [user, filters, debouncedSearchTerm, getAuthHeaders, onError, navigate, state.results]);

  // Auto-refresh when user changes
  useEffect(() => {
    if (user) {
      fetchResults(1);
    }
  }, [user, debouncedSearchTerm, filters.sortBy, filters.filterBy, filters.dateRange, JSON.stringify(filters.scoreRange)]);

  // Enhanced statistics with safe math
  const enhancedStats = useMemo(() => {
    if (!Array.isArray(state.results) || state.results.length === 0) return null;

    try {
      // Extract valid scores
      const scores = state.results
        .map(r => r.stats?.percentage)
        .filter(s => Number.isFinite(s))
        .map(s => Math.max(0, Math.min(100, s))); // Clamp to 0-100

      if (scores.length === 0) return null;

      // Calculate basic stats
      const totalQuizzes = state.results.length;
      const passedCount = state.results.filter(r => r.stats?.passed === true).length;
      const failedCount = totalQuizzes - passedCount;
      
      // Time calculations
      const totalTime = state.results.reduce((sum, r) => {
        const timeSpent = r.timing?.totalTimeSpent || 0;
        return sum + (Number.isFinite(timeSpent) ? timeSpent : 0);
      }, 0);
      
      // Trend analysis
      const recent = scores.slice(0, 5);
      const previous = scores.slice(5, 10);
      const recentAvg = safeMath.average(recent);
      const previousAvg = safeMath.average(previous);
      
      let recentTrend = 'insufficient-data';
      let trendPercentage = 0;
      
      if (recent.length >= 3 && previous.length >= 3) {
        const diff = recentAvg - previousAvg;
        if (Math.abs(diff) > 2) {
          recentTrend = diff > 0 ? 'improving' : 'declining';
          trendPercentage = safeMath.percentage(diff, previousAvg);
        } else {
          recentTrend = 'stable';
        }
      }
      
      // Consistency calculation
      const variance = safeMath.variance(scores);
      const standardDeviation = Math.sqrt(variance);
      const consistencyScore = Math.max(0, 100 - standardDeviation);
      
      // Recent activity
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const lastWeekCount = state.results.filter(r => {
        const createdAt = new Date(r.createdAt);
        return createdAt instanceof Date && !isNaN(createdAt) && createdAt > weekAgo;
      }).length;

      return {
        totalQuizzes,
        averageScore: safeMath.average(scores),
        bestScore: safeMath.max(scores),
        worstScore: safeMath.min(scores, 100),
        passRate: safeMath.percentage(passedCount, totalQuizzes),
        totalTimeHours: safeMath.round(totalTime / (1000 * 60 * 60), 1),
        recentTrend,
        trendPercentage: Math.abs(trendPercentage),
        consistencyScore: Math.round(consistencyScore),
        lastWeekCount,
        passedCount,
        failedCount,
        medianScore: scores.length > 0 ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)] : 0,
        scoreRange: scores.length > 0 ? safeMath.max(scores) - safeMath.min(scores, 100) : 0
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return null;
    }
  }, [state.results]);

  // Chart data with safe calculations
  const chartData = useMemo(() => {
    if (!Array.isArray(state.results) || state.results.length === 0) return null;

    try {
      // Line chart data - scores over time
      const validResults = state.results
        .filter(r => r.createdAt && r.stats?.percentage != null)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(-10);

      const lineChartData = validResults.map(r => {
        const date = new Date(r.createdAt);
        const score = Number.isFinite(r.stats.percentage) ? Math.max(0, Math.min(100, r.stats.percentage)) : 0;
        
        return {
          date: date.toLocaleDateString(),
          shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score
        };
      });

      // Bar chart data - score distribution
      const scoreRanges = [
        { label: '0-20%', min: 0, max: 20 },
        { label: '21-40%', min: 21, max: 40 },
        { label: '41-60%', min: 41, max: 60 },
        { label: '61-80%', min: 61, max: 80 },
        { label: '81-100%', min: 81, max: 100 }
      ];

      const barChartData = scoreRanges.map(range => ({
        label: range.label,
        value: state.results.filter(r => {
          const score = r.stats?.percentage;
          return Number.isFinite(score) && score >= range.min && score <= range.max;
        }).length
      }));

      return {
        lineChartData,
        barChartData
      };
    } catch (error) {
      console.error('Error generating chart data:', error);
      return null;
    }
  }, [state.results]);

  // Enhanced filtering and sorting
  const processedResults = useMemo(() => {
    if (!Array.isArray(state.results)) return [];

    try {
      let processed = [...state.results];

      // Apply date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const cutoff = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            cutoff.setHours(0, 0, 0, 0);
            break;
          case 'week':
            cutoff.setDate(now.getDate() - 7);
            break;
          case 'month':
            cutoff.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            cutoff.setMonth(now.getMonth() - 3);
            break;
          default:
            cutoff.setFullYear(now.getFullYear() - 1);
        }
        
        processed = processed.filter(result => {
          const resultDate = new Date(result.createdAt);
          return resultDate instanceof Date && !isNaN(resultDate) && resultDate >= cutoff;
        });
      }

      // Apply score range filter
      processed = processed.filter(result => {
        const score = result.stats?.percentage;
        return Number.isFinite(score) && 
               score >= (filters.scoreRange[0] || 0) && 
               score <= (filters.scoreRange[1] || 100);
      });

      // Apply status filter
      if (filters.filterBy !== 'all') {
        processed = processed.filter(result => {
          switch (filters.filterBy) {
            case 'passed':
              return result.stats?.passed === true;
            case 'failed':
              return result.stats?.passed === false;
            case 'high-score':
              return (result.stats?.percentage || 0) >= 80;
            case 'recent':
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              const resultDate = new Date(result.createdAt);
              return resultDate instanceof Date && !isNaN(resultDate) && resultDate > oneWeekAgo;
            default:
              return true;
          }
        });
      }

      // Apply sorting
      processed.sort((a, b) => {
        try {
          switch (filters.sortBy) {
            case 'date':
              const dateA = new Date(a.createdAt);
              const dateB = new Date(b.createdAt);
              return dateB - dateA;
            case 'score':
              const scoreA = Number.isFinite(a.stats?.percentage) ? a.stats.percentage : 0;
              const scoreB = Number.isFinite(b.stats?.percentage) ? b.stats.percentage : 0;
              return scoreB - scoreA;
            case 'title':
              const titleA = a.quizConfig?.title || '';
              const titleB = b.quizConfig?.title || '';
              return titleA.localeCompare(titleB);
            case 'time':
              const timeA = Number.isFinite(a.timing?.totalTimeSpent) ? a.timing.totalTimeSpent : 0;
              const timeB = Number.isFinite(b.timing?.totalTimeSpent) ? b.timing.totalTimeSpent : 0;
              return timeA - timeB;
            default:
              return 0;
          }
        } catch (error) {
          console.error('Error sorting results:', error);
          return 0;
        }
      });

      return processed;
    } catch (error) {
      console.error('Error processing results:', error);
      return [];
    }
  }, [state.results, filters]);

  // FIXED: View result with COMPLETE data structure
  const viewResult = useCallback((result) => {
    try {
      if (!result) {
        onError?.('Invalid result data');
        return;
      }

      console.log('🔍 Original result from database:', result);

      // Create the COMPLETE data structure that Results expects
      const completeResultData = {
        // Core quiz stats - these come from result.stats
        totalQuestions: result.quizConfig?.totalQuestions || 30,
        answeredQuestions: result.stats?.answeredQuestions || 0,
        correctAnswers: result.stats?.correctAnswers || 0,
        skippedQuestions: result.stats?.skippedQuestions || 0,
        totalScore: result.stats?.totalScore || 0,
        maxScore: result.stats?.maxScore || 0,
        percentage: result.stats?.percentage || 0,
        grade: result.stats?.grade || 'F',
        passed: Boolean(result.stats?.passed),

        // Quiz configuration - preserve original structure
        quizConfig: {
          title: result.quizConfig?.title || 'Web Development Fundamentals Quiz',
          timeLimit: result.quizConfig?.timeLimit || 1800,
          passingScore: result.quizConfig?.passingScore || 70,
          totalQuestions: result.quizConfig?.totalQuestions || 30
        },

        // Student information - preserve original structure
        student: {
          name: result.student?.name || user?.name || 'Hari Krishna',
          email: result.student?.email || user?.email || 'notbot4444@gmail.com'
        },

        // Timing data - CRITICAL for time display
        timing: {
          startTime: result.timing?.startTime || new Date('2025-07-06T12:07:30.675Z'),
          submitTime: result.timing?.submitTime || new Date('2025-07-06T12:07:44.084Z'),
          totalTimeSpent: result.timing?.totalTimeSpent || 13409, // This is the key field!
          totalTimeSpentFormatted: result.timing?.totalTimeSpentFormatted || '00:13',
          averageTimePerQuestion: result.timing?.averageTimePerQuestion || 0
        },

        // Submission details
        submission: {
          reason: result.submission?.reason || 'completed',
          timestamp: result.submission?.timestamp || new Date()
        },

        // Question results - preserve original array
        questionResults: Array.isArray(result.questionResults) ? result.questionResults : [],

        // Analytics data - preserve original structure
        analytics: result.analytics || {
          summary: {},
          categoryBreakdown: {},
          difficultyBreakdown: {},
          timeAnalysis: {}
        }
      };

      console.log('✅ Complete data structure being passed:', completeResultData);

      // Store complete data in localStorage
      localStorage.setItem('quiz-results', JSON.stringify(completeResultData));
      
      // Navigate with complete data
      navigate('/results', {
        state: {
          fromHistory: true,
          resultId: result._id,
          results: completeResultData  // ✅ Complete structure
        }
      });

    } catch (error) {
      console.error('❌ Error viewing result:', error);
      onError?.('Failed to view result details');
    }
  }, [navigate, onError, user]);

  // Enhanced delete with proper error handling
  const deleteResult = useCallback(async (resultId) => {
    if (!resultId) return;

    if (!window.confirm('Are you sure you want to delete this result? This action cannot be undone.')) {
      return;
    }

    try {
      const originalResults = [...state.results];
      
      // Optimistic update
      setState(prev => ({
        ...prev,
        results: prev.results.filter(r => r._id !== resultId),
        totalResults: Math.max(0, prev.totalResults - 1)
      }));

      const response = await fetch(`${API_BASE_URL}/api/quiz-results/${resultId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        // Revert on failure
        setState(prev => ({ ...prev, results: originalResults }));
        throw new Error(`Failed to delete result: ${response.statusText}`);
      }

      onSuccess?.('Result deleted successfully');

    } catch (error) {
      console.error('Error deleting result:', error);
      onError?.('Failed to delete result');
    }
  }, [state.results, getAuthHeaders, onSuccess, onError]);

  // Enhanced bulk delete
  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Array.from(ui.selectedResults).filter(id => id);
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} results? This action cannot be undone.`)) {
      return;
    }

    try {
      const originalResults = [...state.results];
      
      // Optimistic update
      setState(prev => ({
        ...prev,
        results: prev.results.filter(r => !selectedIds.includes(r._id)),
        totalResults: Math.max(0, prev.totalResults - selectedIds.length)
      }));

      const deletePromises = selectedIds.map(id => 
        fetch(`${API_BASE_URL}/api/quiz-results/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
      );

      const responses = await Promise.allSettled(deletePromises);
      const failedDeletes = responses.filter(r => r.status === 'rejected' || !r.value?.ok);

      if (failedDeletes.length > 0) {
        // Revert on partial failure
        setState(prev => ({ ...prev, results: originalResults }));
        throw new Error(`Failed to delete ${failedDeletes.length} results`);
      }

      setUi(prev => ({ ...prev, selectedResults: new Set() }));
      onSuccess?.(`${selectedIds.length} results deleted successfully`);

    } catch (error) {
      console.error('Bulk delete error:', error);
      onError?.('Failed to delete selected results');
    }
  }, [ui.selectedResults, state.results, getAuthHeaders, onSuccess, onError]);

  // Enhanced export with data validation
  const exportResults = useCallback((format = 'csv') => {
    try {
      if (!Array.isArray(processedResults) || processedResults.length === 0) {
        onError?.('No results to export');
        return;
      }

      const data = processedResults.map(result => {
        const createdAt = new Date(result.createdAt);
        const isValidDate = createdAt instanceof Date && !isNaN(createdAt);
        
        return {
          date: isValidDate ? createdAt.toLocaleDateString() : 'Unknown',
          time: isValidDate ? createdAt.toLocaleTimeString() : 'Unknown',
          title: result.quizConfig?.title || 'Quiz',
          score: Number.isFinite(result.stats?.percentage) ? result.stats.percentage : 0,
          grade: result.stats?.grade || 'N/A',
          status: result.stats?.passed ? 'Passed' : 'Failed',
          timeTaken: result.timing?.totalTimeSpentFormatted || '0:00',
          correctAnswers: Number.isFinite(result.stats?.correctAnswers) ? result.stats.correctAnswers : 0,
          totalQuestions: Number.isFinite(result.quizConfig?.totalQuestions) ? result.quizConfig.totalQuestions : 0
        };
      });

      let content, mimeType, extension;

      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;
        default:
          content = [
            'Date,Time,Title,Score,Grade,Status,Time Taken,Correct Answers,Total Questions',
            ...data.map(row => 
              `"${row.date}","${row.time}","${row.title}","${row.score}%","${row.grade}","${row.status}","${row.timeTaken}","${row.correctAnswers}","${row.totalQuestions}"`
            )
          ].join('\n');
          mimeType = 'text/csv';
          extension = 'csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-results-${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onSuccess?.(`Results exported as ${format.toUpperCase()} successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      onError?.('Failed to export results');
    }
  }, [processedResults, onSuccess, onError]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('resultsViewMode', ui.viewMode);
  }, [ui.viewMode]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setUi(prev => ({ ...prev, isOffline: false }));
    const handleOffline = () => setUi(prev => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            document.querySelector('.search-input')?.focus();
            break;
          case 'e':
            e.preventDefault();
            exportResults();
            break;
          case 'a':
            if (processedResults.length > 0) {
              e.preventDefault();
              setUi(prev => ({
                ...prev,
                selectedResults: new Set(processedResults.map(r => r._id))
              }));
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [exportResults, processedResults]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Loading state
  if (state.loading && !state.results.length) {
    return (
      <div className="all-results-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading Quiz History...</h2>
          <p>Fetching your quiz results</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="all-results-error">
        <div className="error-content">
          <h2>⚠️ Something went wrong</h2>
          <p>{state.error}</p>
          <div className="error-actions">
            <button onClick={() => fetchResults(1)} className="action-btn primary">
              🔄 Retry
            </button>
            <button onClick={() => navigate('/')} className="action-btn outline">
              🏠 Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="all-results-container" role="main" aria-label="Quiz Results">
      {/* Offline indicator */}
      {ui.isOffline && (
        <div className="offline-banner" role="alert">
          📡 You're offline. Some features may be limited.
        </div>
      )}

      {/* Enhanced Header */}
      <header className="all-results-header">
        <div className="header-content">
          <div className="header-title">
            <h1>📊 Quiz History</h1>
            <p>
              Your complete quiz performance overview
              {enhancedStats && (
                <span className="stats-summary">
                  • {enhancedStats.totalQuizzes} quizzes • {enhancedStats.averageScore}% avg
                </span>
              )}
            </p>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => navigate('/quiz')} 
              className="action-btn primary"
              aria-label="Take a new quiz"
            >
              📝 Take New Quiz
            </button>
            <button 
              onClick={() => setUi(prev => ({ ...prev, showVisualization: !prev.showVisualization }))}
              className="action-btn outline"
              aria-label={ui.showVisualization ? 'Hide charts' : 'Show charts'}
            >
              📈 {ui.showVisualization ? 'Hide' : 'Show'} Charts
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="action-btn outline"
              aria-label="Go to home page"
            >
              🏠 Home
            </button>
          </div>
        </div>
      </header>

      {/* Data Visualization Section */}
      {ui.showVisualization && enhancedStats && chartData && (
        <section className="visualization-section" aria-label="Performance visualizations">
          <div className="charts-container">
            <div className="charts-grid">
              {/* Performance Trend Chart */}
              <div className="chart-item">
                <LineChart 
                  data={chartData.lineChartData} 
                  width={600} 
                  height={250} 
                  title="📈 Performance Trend (Last 10 Quizzes)"
                />
              </div>

              {/* Score Distribution Chart */}
              <div className="chart-item">
                <BarChart 
                  data={chartData.barChartData} 
                  width={500} 
                  height={250} 
                  title="📊 Score Distribution"
                />
              </div>

              {/* Pass/Fail Donut Chart */}
              <div className="chart-item">
                <DonutChart 
                  passed={enhancedStats.passedCount} 
                  failed={enhancedStats.failedCount} 
                  width={250} 
                  height={250}
                />
              </div>

              {/* Performance Insights */}
              <div className="chart-item insights-panel">
                <h4 className="chart-title">🎯 Performance Insights</h4>
                <div className="insights-content">
                  <div className="insight-item">
                    <span className="insight-icon">🏆</span>
                    <div className="insight-text">
                      <strong>Best Performance:</strong> {enhancedStats.bestScore}% score
                    </div>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">📊</span>
                    <div className="insight-text">
                      <strong>Consistency:</strong> {enhancedStats.consistencyScore}% consistency score
                    </div>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">⚡</span>
                    <div className="insight-text">
                      <strong>Recent Activity:</strong> {enhancedStats.lastWeekCount} quizzes this week
                    </div>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">
                      {enhancedStats.recentTrend === 'improving' ? '📈' : 
                       enhancedStats.recentTrend === 'declining' ? '📉' : '➡️'}
                    </span>
                    <div className="insight-text">
                      <strong>Trend:</strong> Your performance is {enhancedStats.recentTrend}
                      {enhancedStats.trendPercentage !== 0 && (
                        <span> ({enhancedStats.trendPercentage}%)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Enhanced Statistics */}
      {enhancedStats && (
        <section className="overall-stats" aria-labelledby="stats-heading">
          <h3 id="stats-heading">📈 Performance Analytics</h3>
          <div className="stats-grid">
            <div className="stat-card" tabIndex="0">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{enhancedStats.totalQuizzes}</div>
                <div className="stat-label">Total Quizzes</div>
              </div>
            </div>
            <div className="stat-card" tabIndex="0">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-value">{enhancedStats.averageScore}%</div>
                <div className="stat-label">Average Score</div>
              </div>
            </div>
            <div className="stat-card" tabIndex="0">
              <div className="stat-icon">🏆</div>
              <div className="stat-content">
                <div className="stat-value">{enhancedStats.bestScore}%</div>
                <div className="stat-label">Best Score</div>
              </div>
            </div>
            <div className="stat-card" tabIndex="0">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{enhancedStats.passRate}%</div>
                <div className="stat-label">Pass Rate</div>
              </div>
            </div>
            <div className="stat-card" tabIndex="0">
              <div className="stat-icon">⏰</div>
              <div className="stat-content">
                <div className="stat-value">{enhancedStats.totalTimeHours}h</div>
                <div className="stat-label">Total Time</div>
              </div>
            </div>
            <div className="stat-card" tabIndex="0">
              <div className="stat-icon">
                {enhancedStats.recentTrend === 'improving' ? '📈' : 
                 enhancedStats.recentTrend === 'declining' ? '📉' : '➡️'}
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {enhancedStats.recentTrend === 'improving' ? 'Improving' : 
                   enhancedStats.recentTrend === 'declining' ? 'Declining' : 'Stable'}
                </div>
                <div className="stat-label">Recent Trend</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Enhanced Controls */}
      <section className="results-controls" aria-label="Filter and search controls">
        <div className="controls-left">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search quizzes... (Ctrl+F)"
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="search-input"
              aria-label="Search quizzes"
            />
            <i className="fas fa-search search-icon" aria-hidden="true"></i>
          </div>
          
          <select
            value={filters.filterBy}
            onChange={(e) => setFilters(prev => ({ ...prev, filterBy: e.target.value }))}
            className="filter-select"
            aria-label="Filter results by status"
          >
            <option value="all">All Results</option>
            <option value="passed">Passed Only</option>
            <option value="failed">Failed Only</option>
            <option value="high-score">High Scores (80%+)</option>
            <option value="recent">Recent (Last Week)</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="filter-select"
            aria-label="Filter by date range"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">This Year</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            className="sort-select"
            aria-label="Sort results by"
          >
            <option value="date">Sort by Date</option>
            <option value="score">Sort by Score</option>
            <option value="title">Sort by Title</option>
            <option value="time">Sort by Time</option>
          </select>
        </div>

        <div className="controls-right">
          {ui.selectedResults.size > 0 && (
            <div className="bulk-actions">
              <span className="selection-count">
                {ui.selectedResults.size} selected
              </span>
              <button 
                onClick={handleBulkDelete}
                className="action-btn small danger"
                aria-label={`Delete ${ui.selectedResults.size} selected results`}
              >
                🗑️ Delete Selected
              </button>
              <button 
                onClick={() => setUi(prev => ({ ...prev, selectedResults: new Set() }))}
                className="action-btn small outline"
                aria-label="Clear selection"
              >
                ✕ Clear
              </button>
            </div>
          )}

          <div className="view-toggle" role="radiogroup" aria-label="View mode">
            <button
              className={`view-btn ${ui.viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setUi(prev => ({ ...prev, viewMode: 'cards' }))}
              aria-label="Card view"
              role="radio"
              aria-checked={ui.viewMode === 'cards'}
            >
              <i className="fas fa-th" aria-hidden="true"></i>
            </button>
            <button
              className={`view-btn ${ui.viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setUi(prev => ({ ...prev, viewMode: 'list' }))}
              aria-label="List view"
              role="radio"
              aria-checked={ui.viewMode === 'list'}
            >
              <i className="fas fa-list" aria-hidden="true"></i>
            </button>
          </div>
          
          <div className="export-group">
            <button onClick={() => exportResults('csv')} className="export-btn">
              📄 Export CSV
            </button>
            <button onClick={() => exportResults('json')} className="export-btn">
              📋 Export JSON
            </button>
          </div>
        </div>
      </section>

      {/* Results Display */}
      {processedResults.length === 0 ? (
        <div className="no-results" role="region" aria-label="No results found">
          <div className="no-results-icon">📭</div>
          <h3>No Results Found</h3>
          <p>
            {filters.searchTerm || filters.filterBy !== 'all' || filters.dateRange !== 'all'
              ? 'No quizzes match your current filters. Try adjusting your search or filters.'
              : 'You haven\'t taken any quizzes yet. Take your first quiz to get started!'
            }
          </p>
          <div className="no-results-actions">
            <button onClick={() => navigate('/quiz')} className="action-btn primary">
              📝 Take Your First Quiz
            </button>
            {(filters.searchTerm || filters.filterBy !== 'all' || filters.dateRange !== 'all') && (
              <button 
                onClick={() => setFilters({ 
                  searchTerm: '', 
                  sortBy: 'date', 
                  filterBy: 'all', 
                  dateRange: 'all', 
                  scoreRange: [0, 100] 
                })}
                className="action-btn outline"
              >
                🔄 Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <section className="results-section" aria-label="Quiz results">
          <div className="results-actions-bar">
            <div className="results-count">
              Showing {processedResults.length} of {state.totalResults} results
            </div>
            <div className="select-actions">
              <button
                onClick={() => setUi(prev => ({
                  ...prev,
                  selectedResults: new Set(processedResults.map(r => r._id))
                }))}
                className="action-btn small outline"
                disabled={processedResults.length === 0}
              >
                Select All
              </button>
            </div>
          </div>

          <div className={`results-grid ${ui.viewMode}`} role="grid">
            {processedResults.map((result) => (
              <article 
                key={result._id} 
                className={`result-card ${ui.selectedResults.has(result._id) ? 'selected' : ''}`}
                role="gridcell"
              >
                <div className="result-header">
                  <div className="result-checkbox">
                    <input
                      type="checkbox"
                      checked={ui.selectedResults.has(result._id)}
                      onChange={(e) => {
                        const newSelected = new Set(ui.selectedResults);
                        if (e.target.checked) {
                          newSelected.add(result._id);
                        } else {
                          newSelected.delete(result._id);
                        }
                        setUi(prev => ({ ...prev, selectedResults: newSelected }));
                      }}
                      aria-label={`Select ${result.quizConfig?.title || 'quiz'}`}
                    />
                  </div>
                  <div className="result-title">
                    <h4>{result.quizConfig?.title || 'Quiz'}</h4>
                    <time className="result-date" dateTime={result.createdAt}>
                      {new Date(result.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  <div className="result-actions">
                    <button
                      onClick={() => viewResult(result)}
                      className="action-btn small"
                      title="View Details"
                      aria-label={`View details for ${result.quizConfig?.title || 'quiz'}`}
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => deleteResult(result._id)}
                      className="action-btn small danger"
                      title="Delete Result"
                      aria-label={`Delete ${result.quizConfig?.title || 'quiz'} result`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="result-content">
                  <div className="score-display">
                    <div className={`score-circle ${result.stats?.passed ? 'passed' : 'failed'}`}>
                      <span className="score-number">
                        {Number.isFinite(result.stats?.percentage) ? result.stats.percentage : 0}%
                      </span>
                      <span className="score-grade">{result.stats?.grade || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="result-details">
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`detail-value ${result.stats?.passed ? 'passed' : 'failed'}`}>
                        {result.stats?.passed ? '✅ Passed' : '❌ Failed'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Score:</span>
                      <span className="detail-value">
                        {Number.isFinite(result.stats?.correctAnswers) ? result.stats.correctAnswers : 0} / {Number.isFinite(result.quizConfig?.totalQuestions) ? result.quizConfig.totalQuestions : 0}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">
                        {result.timing?.totalTimeSpentFormatted || '0:00'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Questions:</span>
                      <span className="detail-value">
                        {Number.isFinite(result.stats?.answeredQuestions) ? result.stats.answeredQuestions : 0} answered
                      </span>
                    </div>
                  </div>
                </div>

                <footer className="result-footer">
                  <div className="performance-indicator">
                    {(() => {
                      const percentage = Number.isFinite(result.stats?.percentage) ? result.stats.percentage : 0;
                      if (percentage >= 90) return <span className="performance excellent">🏆 Excellent</span>;
                      if (percentage >= 80) return <span className="performance good">⭐ Good</span>;
                      if (percentage >= 70) return <span className="performance average">👍 Average</span>;
                      return <span className="performance needs-improvement">📚 Needs Improvement</span>;
                    })()}
                  </div>
                  <time className="result-time" dateTime={result.createdAt}>
                    {new Date(result.createdAt).toLocaleTimeString()}
                  </time>
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

AllResults.propTypes = {
  onError: PropTypes.func,
  onSuccess: PropTypes.func
};

export default AllResults;
