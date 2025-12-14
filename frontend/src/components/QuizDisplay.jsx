import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/QuizDisplay.css';

const QuizDisplay = () => {
  // Navigation hook
  const navigate = useNavigate();
  
  // Core quiz data state
  const [quizData, setQuizData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [reviewFlags, setReviewFlags] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState({});
  
  // Timer and session state
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  
  // UI and system state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [submissionReason, setSubmissionReason] = useState('completed');
  
  // Modal and fullscreen state
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [fullscreenRetryCount, setFullscreenRetryCount] = useState(0);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(true);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  
  // User state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Refs for cleanup and management
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const fullscreenCheckRef = useRef(null);
  const visibilityRef = useRef(null);

  // **ENHANCED: Cross-platform fullscreen support**
  const isFullscreenSupported_ = useCallback(() => {
    return !!(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled ||
      Element.prototype.requestFullscreen ||
      Element.prototype.webkitRequestFullscreen ||
      Element.prototype.mozRequestFullScreen ||
      Element.prototype.msRequestFullscreen
    );
  }, []);

  // **IMPROVED: More reliable fullscreen detection for all OS**
const isInFullscreen = useCallback(() => {
  const hasFullscreenElement = !!(
    document.fullscreenElement || 
    document.webkitFullscreenElement || 
    document.mozFullScreenElement || 
    document.msFullscreenElement
  );

  // Additional checks for Windows and other OS
  const isFullscreenMode = 
    hasFullscreenElement ||
    (window.innerHeight === window.screen.height) ||
    (window.outerHeight === window.screen.height) ||
    (window.innerWidth === window.screen.width && window.innerHeight === window.screen.height) ||
    (!window.screenTop && !window.screenY) ||
    (navigator.userAgent.includes('Windows') && window.screen && 
     Math.abs(window.innerHeight - window.screen.height) <= 1) ||
    (document.documentElement.clientHeight === window.screen.height);

  return isFullscreenMode;
}, []);


  // **ENHANCED: Comprehensive tab and window switching detection**
  const startComprehensiveMonitoring = useCallback(() => {
    // Clear existing intervals
    if (fullscreenCheckRef.current) {
      clearInterval(fullscreenCheckRef.current);
    }
    if (visibilityRef.current) {
      clearInterval(visibilityRef.current);
    }
    
    // Fullscreen monitoring - every 300ms for better responsiveness
    fullscreenCheckRef.current = setInterval(() => {
      if (isActive && !isQuizCompleted && !showSubmissionModal) {
        if (!isInFullscreen()) {
          console.warn('Fullscreen exited - showing warning modal');
          setShowFullscreenModal(true);
        }
      }
    }, 300);
    
    // Additional visibility monitoring for tab switches
    visibilityRef.current = setInterval(() => {
      if (isActive && !isQuizCompleted && !showSubmissionModal && document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        console.warn('Tab switch detected via interval check');
        if (!showFullscreenModal) {
          setShowFullscreenModal(true);
        }
      }
    }, 200);
  }, [isActive, isQuizCompleted, showSubmissionModal, isInFullscreen]);

  const stopComprehensiveMonitoring = useCallback(() => {
    if (fullscreenCheckRef.current) {
      clearInterval(fullscreenCheckRef.current);
      fullscreenCheckRef.current = null;
    }
    if (visibilityRef.current) {
      clearInterval(visibilityRef.current);
      visibilityRef.current = null;
    }
  }, []);

  // **IMPROVED: Enhanced fullscreen entry with better Windows support**
  const enterFullScreen = useCallback(async () => {
    try {
      if (!isFullscreenSupported_()) {
        console.warn('Fullscreen is not supported in this browser');
        setIsFullscreenSupported(false);
        return false;
      }

      const elem = document.documentElement;
      
      // Enhanced fullscreen request with more options for Windows
      const fullscreenOptions = {
        navigationUI: "hide"
      };

      let fullscreenPromise = null;

      if (elem.requestFullscreen) {
        fullscreenPromise = elem.requestFullscreen(fullscreenOptions);
      } else if (elem.mozRequestFullScreen) {
        fullscreenPromise = elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        // Enhanced for Safari and Chrome on different OS
        fullscreenPromise = elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      } else if (elem.msRequestFullscreen) {
        fullscreenPromise = elem.msRequestFullscreen();
      } else {
        throw new Error('No fullscreen method available');
      }

      if (fullscreenPromise) {
        await fullscreenPromise;
      }
      
      // Additional verification for Windows
      setTimeout(() => {
        if (!isInFullscreen()) {
          console.warn('Fullscreen may not have activated properly');
          setFullscreenRetryCount(prev => prev + 1);
          if (fullscreenRetryCount < 2) {
            setTimeout(() => enterFullScreen(), 500);
          }
        } else {
          console.log('Fullscreen activated successfully');
          setShowFullscreenModal(false);
          setFullscreenRetryCount(0);
          startComprehensiveMonitoring();
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.warn('Could not enter fullscreen mode:', error.message);
      setFullscreenRetryCount(prev => prev + 1);
      
      if (fullscreenRetryCount >= 3) {
        const isWindows = navigator.userAgent.includes('Windows');
        const message = isWindows 
          ? 'Fullscreen mode is required. Please press F11 or allow fullscreen permissions and try again.'
          : 'Fullscreen mode is required. Please allow fullscreen permissions and try again.';
        alert(message);
      }
      
      return false;
    }
  }, [isFullscreenSupported_, fullscreenRetryCount, startComprehensiveMonitoring, isInFullscreen]);

  // **IMPROVED: Better exit fullscreen with cross-platform support**
  const exitFullScreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      console.log('Fullscreen exited successfully');
      stopComprehensiveMonitoring();
    } catch (error) {
      console.warn('Could not exit fullscreen mode:', error.message);
    }
  }, [stopComprehensiveMonitoring]);

  // **ENHANCED: Comprehensive event listeners for better tab/window switching detection**
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = isInFullscreen();
      console.log('Fullscreen change detected:', isCurrentlyFullscreen);
      
      if (isActive && !isQuizCompleted && !showSubmissionModal && !isCurrentlyFullscreen) {
        setShowFullscreenModal(true);
      }
    };

    const handleVisibilityChange = () => {
      if (isActive && !isQuizCompleted && !showSubmissionModal) {
        if (document.hidden) {
          setTabSwitchCount(prev => prev + 1);
          console.warn('Tab hidden - possible switch detected');
          setShowFullscreenModal(true);
        } else if (!isInFullscreen()) {
          console.warn('Tab visible but not fullscreen');
          setShowFullscreenModal(true);
        }
      }
    };

    const handleWindowBlur = () => {
      if (isActive && !isQuizCompleted && !showSubmissionModal) {
        setTabSwitchCount(prev => prev + 1);
        console.warn('Window blur - switch detected');
        setShowFullscreenModal(true);
      }
    };

    const handleWindowFocus = () => {
      if (isActive && !isQuizCompleted && !showSubmissionModal && !isInFullscreen()) {
        console.warn('Window focused but not fullscreen');
        setTimeout(() => {
          if (!isInFullscreen()) {
            setShowFullscreenModal(true);
          }
        }, 100);
      }
    };

    const handleResize = () => {
      if (isActive && !isQuizCompleted && !showSubmissionModal) {
        setTimeout(() => {
          if (!isInFullscreen()) {
            setShowFullscreenModal(true);
          }
        }, 150);
      }
    };

    const handleKeydown = (e) => {
      if (isActive && !isQuizCompleted) {
        // Prevent F11 and other fullscreen exit keys
        if (e.key === 'F11' || e.keyCode === 122) {
          e.preventDefault();
          if (!isInFullscreen()) {
            setShowFullscreenModal(true);
          }
        }
        // Prevent Alt+Tab (Windows), Cmd+Tab (Mac)
        if ((e.altKey && e.key === 'Tab') || (e.metaKey && e.key === 'Tab')) {
          e.preventDefault();
          setTabSwitchCount(prev => prev + 1);
          setShowFullscreenModal(true);
        }
        // Prevent Alt+F4, Ctrl+W, Ctrl+T, etc.
        if (e.altKey && e.key === 'F4') e.preventDefault();
        if (e.ctrlKey && (e.key === 'w' || e.key === 't' || e.key === 'n')) e.preventDefault();
        if (e.ctrlKey && e.shiftKey && e.key === 'I') e.preventDefault();
        if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
      }
    };

    const handleContextMenu = (e) => {
      if (isActive && !isQuizCompleted) {
        e.preventDefault();
      }
    };

    // Page Visibility API events
    const handleBeforeUnload = (e) => {
      if (isActive && !isQuizCompleted) {
        e.preventDefault();
        e.returnValue = 'Quiz in progress';
        return e.returnValue;
      }
    };

    // Add all event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, isQuizCompleted, showSubmissionModal, isInFullscreen]);

  // Check fullscreen on page load/refresh
  useEffect(() => {
    const checkFullscreenOnLoad = () => {
      const savedProgress = localStorage.getItem('quiz-progress');
      if (savedProgress) {
        try {
          const data = JSON.parse(savedProgress);
          if (data.isActive && !isInFullscreen()) {
            setTimeout(() => {
              setShowFullscreenModal(true);
            }, 1000);
          }
        } catch (error) {
          console.error('Error checking saved progress:', error);
        }
      }
    };

    if (isAuthenticated && user) {
      checkFullscreenOnLoad();
    }
  }, [isAuthenticated, user, isInFullscreen]);

  // Format time utility
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Grade utility function
  const getGrade = useCallback((percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 75) return 'B';
    if (percentage >= 70) return 'C+';
    if (percentage >= 65) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }, []);

  // Enhanced results calculation
  const calculateResults = useCallback(() => {
    if (!questions.length || !quizData) return null;
    
    let correctAnswers = 0;
    let totalScore = 0;
    let maxScore = 0;
    
    questions.forEach(question => {
      const difficulty = quizData.difficulties?.find(d => d.id === question.difficulty);
      const points = difficulty?.points || 1;
      maxScore += points;
      
      const userAnswer = selectedAnswers[question.id];
      const correctOption = question.options.find(opt => opt.correct);
      
      if (userAnswer === correctOption?.id) {
        correctAnswers++;
        totalScore += points;
      }
    });
    
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= (quizData.config?.passingScore || 70);
    
    return {
      correctAnswers,
      totalQuestions: questions.length,
      answeredQuestions: Object.keys(selectedAnswers).length,
      skippedQuestions: questions.length - Object.keys(selectedAnswers).length,
      totalScore,
      maxScore,
      percentage,
      passed,
      grade: getGrade(percentage)
    };
  }, [questions, quizData, selectedAnswers, getGrade]);

  // Calculate comprehensive quiz analytics
  const calculateQuizAnalytics = useCallback(() => {
    const answeredCount = Object.keys(selectedAnswers).length;
    const skippedCount = questions.length - answeredCount;
    const reviewedCount = Object.values(reviewFlags).filter(flag => flag).length;
    const visitedCount = visitedQuestions.size;
    
    const difficultyStats = {};
    if (quizData?.difficulties) {
      quizData.difficulties.forEach(diff => {
        const questionsOfDifficulty = questions.filter(q => q.difficulty === diff.id);
        const correctOfDifficulty = questionsOfDifficulty.filter(q => {
          const userAnswer = selectedAnswers[q.id];
          const correctOption = q.options.find(opt => opt.correct);
          return userAnswer === correctOption?.id;
        });
        
        difficultyStats[diff.name] = {
          total: questionsOfDifficulty.length,
          attempted: questionsOfDifficulty.filter(q => selectedAnswers[q.id]).length,
          correct: correctOfDifficulty.length,
          percentage: questionsOfDifficulty.length > 0 
            ? Math.round((correctOfDifficulty.length / questionsOfDifficulty.length) * 100) 
            : 0
        };
      });
    }
    
    const categoryStats = {};
    const categories = [...new Set(questions.map(q => q.category).filter(Boolean))];
    categories.forEach(category => {
      const questionsOfCategory = questions.filter(q => q.category === category);
      const correctOfCategory = questionsOfCategory.filter(q => {
        const userAnswer = selectedAnswers[q.id];
        const correctOption = q.options.find(opt => opt.correct);
        return userAnswer === correctOption?.id;
      });
      
      categoryStats[category] = {
        total: questionsOfCategory.length,
        attempted: questionsOfCategory.filter(q => selectedAnswers[q.id]).length,
        correct: correctOfCategory.length,
        percentage: questionsOfCategory.length > 0 
          ? Math.round((correctOfCategory.length / questionsOfCategory.length) * 100) 
          : 0
      };
    });
    
    return {
      summary: {
        totalQuestions: questions.length,
        answeredQuestions: answeredCount,
        skippedQuestions: skippedCount,
        reviewedQuestions: reviewedCount,
        visitedQuestions: visitedCount,
        completionRate: Math.round((answeredCount / questions.length) * 100),
        reviewRate: Math.round((reviewedCount / questions.length) * 100),
        tabSwitchCount
      },
      difficultyBreakdown: difficultyStats,
      categoryBreakdown: categoryStats,
      timeAnalysis: {
        totalQuestions: questions.length,
        questionsWithTimeData: Object.keys(timeSpentPerQuestion).length,
        averageTimePerQuestion: Object.keys(timeSpentPerQuestion).length > 0 
          ? Math.round(Object.values(timeSpentPerQuestion).reduce((a, b) => a + b, 0) / Object.keys(timeSpentPerQuestion).length)
          : 0,
        fastestQuestion: Object.keys(timeSpentPerQuestion).length > 0 
          ? Math.min(...Object.values(timeSpentPerQuestion)) 
          : 0,
        slowestQuestion: Object.keys(timeSpentPerQuestion).length > 0 
          ? Math.max(...Object.values(timeSpentPerQuestion)) 
          : 0
      }
    };
  }, [questions, selectedAnswers, reviewFlags, visitedQuestions, timeSpentPerQuestion, quizData, tabSwitchCount]);

  // Generate detailed question results
  const generateQuestionResults = useCallback(() => {
    return questions.map((question, index) => {
      const userAnswer = selectedAnswers[question.id];
      const correctOption = question.options.find(opt => opt.correct);
      const isCorrect = userAnswer === correctOption?.id;
      const wasReviewed = reviewFlags[question.id] || false;
      const wasVisited = visitedQuestions.has(index);
      const timeSpent = timeSpentPerQuestion[question.id] || 0;
      
      return {
        questionNumber: index + 1,
        questionId: question.id,
        questionText: question.text,
        difficulty: question.difficulty,
        category: question.category,
        userAnswerId: userAnswer,
        userAnswerText: userAnswer ? question.options.find(opt => opt.id === userAnswer)?.text : null,
        correctAnswerId: correctOption?.id,
        correctAnswerText: correctOption?.text,
        isCorrect,
        isAnswered: !!userAnswer,
        wasReviewed,
        wasVisited,
        timeSpent,
        status: !userAnswer ? 'skipped' : isCorrect ? 'correct' : 'incorrect',
        points: isCorrect ? (quizData?.difficulties?.find(d => d.id === question.difficulty)?.points || 1) : 0
      };
    });
  }, [questions, selectedAnswers, reviewFlags, visitedQuestions, timeSpentPerQuestion, quizData]);

  const handleSubmitQuiz = useCallback(async () => {
    if (isQuizCompleted) return;
    
    setIsActive(false);
    setIsQuizCompleted(true);
    setShowSubmissionModal(false);
    stopComprehensiveMonitoring();
    
    await exitFullScreen();
    
    const results = calculateResults();
    const submissionTime = Date.now();
    const totalTimeSpent = startTime ? submissionTime - startTime : 0;
    
    const quizAnalytics = calculateQuizAnalytics();
    
    const resultsData = {
      ...results,
      student: {
        name: user?.name || user?.firstName || 'Unknown',
        email: user?.email || 'unknown@email.com',
        id: user?.id || user?.userId || 'unknown'
      },
      quizConfig: {
        title: quizData?.config?.title || 'Quiz',
        description: quizData?.config?.description || '',
        timeLimit: quizData?.config?.timeLimit || 1800,
        passingScore: quizData?.config?.passingScore || 70,
        totalQuestions: questions.length,
        shuffleQuestions: quizData?.config?.shuffleQuestions || false,
        shuffleOptions: quizData?.config?.shuffleOptions || false
      },
      timing: {
        startTime: new Date(startTime).toISOString(),
        submitTime: new Date(submissionTime).toISOString(),
        totalTimeSpent: totalTimeSpent,
        totalTimeSpentFormatted: formatTime(Math.floor(totalTimeSpent / 1000)),
        timeSpentPerQuestion: timeSpentPerQuestion,
        averageTimePerQuestion: Math.floor(totalTimeSpent / questions.length / 1000)
      },
      analytics: quizAnalytics,
      submission: {
        reason: submissionReason,
        timestamp: new Date(submissionTime).toISOString(),
        userAgent: navigator.userAgent,
        completionRate: Math.round((Object.keys(selectedAnswers).length / questions.length) * 100),
        tabSwitchViolations: tabSwitchCount
      },
      questionResults: generateQuestionResults(),
      rawData: {
        selectedAnswers,
        reviewFlags,
        visitedQuestions: Array.from(visitedQuestions),
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          difficulty: q.difficulty,
          category: q.category,
          options: q.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            correct: opt.correct
          }))
        }))
      }
    };
    
    try {
      localStorage.setItem('quiz-results', JSON.stringify(resultsData));
    } catch (error) {
      console.error('Failed to save results:', error);
    }
    
    localStorage.removeItem('quiz-progress');
    
    setTimeout(() => {
      navigate('/results', { 
        state: { 
          results: resultsData,
          fromQuiz: true 
        },
        replace: true 
      });
    }, 300);
    
  }, [isQuizCompleted, startTime, submissionReason, user, quizData, questions, selectedAnswers, reviewFlags, visitedQuestions, timeSpentPerQuestion, calculateResults, calculateQuizAnalytics, generateQuestionResults, formatTime, navigate, stopComprehensiveMonitoring, exitFullScreen, tabSwitchCount]);

  // Check authentication status and get user data
  useEffect(() => {
    const checkAuthentication = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          navigate('/', { replace: true });
        }
      } catch (error) {
        navigate('/', { replace: true });
      }
    };

    checkAuthentication();
  }, [navigate]);

  // Shuffle array utility
  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Auto-save functionality
  const saveProgress = useCallback(() => {
    if (!quizData && !isActive) return;
    
    const progressData = {
      currentQuestionIndex,
      selectedAnswers,
      reviewFlags,
      visitedQuestions: Array.from(visitedQuestions),
      timeSpentPerQuestion,
      timeLeft,
      startTime,
      quizData,
      questions,
      user,
      isActive,
      submissionReason,
      tabSwitchCount,
      timestamp: Date.now(),
      lastSaved: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem('quiz-progress', JSON.stringify(progressData));
    } catch (error) {
      console.error('Failed to save quiz progress:', error);
    }
  }, [currentQuestionIndex, selectedAnswers, reviewFlags, visitedQuestions, timeSpentPerQuestion, 
      timeLeft, startTime, isActive, quizData, questions, user, submissionReason, tabSwitchCount]);

  // Load saved progress
  const loadSavedProgress = useCallback(() => {
    try {
      const saved = localStorage.getItem('quiz-progress');
      if (saved) {
        const data = JSON.parse(saved);
        
        const timeDiff = Date.now() - data.timestamp;
        const isRecentSession = timeDiff < 24 * 60 * 60 * 1000;
        
        if (isRecentSession && data.user?.email === user?.email) {
          const shouldRestore = window.confirm(
            `Resume previous quiz session?\n\n` +
            `Progress: ${Object.keys(data.selectedAnswers || {}).length} of ${data.questions?.length || 0} questions answered\n` +
            `Time remaining: ${Math.floor((data.timeLeft || 0) / 60)}:${((data.timeLeft || 0) % 60).toString().padStart(2, '0')}\n` +
            `Tab switch violations: ${data.tabSwitchCount || 0}`
          );
          
          if (shouldRestore) {
            setQuizData(data.quizData);
            setQuestions(data.questions || []);
            setCurrentQuestionIndex(data.currentQuestionIndex || 0);
            setSelectedAnswers(data.selectedAnswers || {});
            setReviewFlags(data.reviewFlags || {});
            setVisitedQuestions(new Set(data.visitedQuestions || []));
            setTimeSpentPerQuestion(data.timeSpentPerQuestion || {});
            setTimeLeft(data.timeLeft || 0);
            setStartTime(data.startTime);
            setTabSwitchCount(data.tabSwitchCount || 0);
            
            if (data.isActive && data.timeLeft > 0) {
              setIsActive(true);
              setQuestionStartTime(Date.now());
              
              setTimeout(() => {
                if (!isInFullscreen()) {
                  setShowFullscreenModal(true);
                }
              }, 500);
            }
            
            return true;
          }
        }
      }
    } catch (error) {
      localStorage.removeItem('quiz-progress');
    }
    return false;
  }, [user, isInFullscreen]);

  // Load and initialize quiz data
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadQuizData = async () => {
      try {
        const restored = loadSavedProgress();
        if (restored) {
          setLoading(false);
          return;
        }

        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/data/quiz-data.json`);

        
        if (!response.ok) throw new Error(`Failed to load quiz data: ${response.status}`);
        
        const data = await response.json();
        
        if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error('Invalid quiz data: No questions found');
        }

        let shuffledQuestions = data.config?.shuffleQuestions 
          ? shuffleArray(data.questions) 
          : data.questions;
        
        if (data.config?.shuffleOptions) {
          shuffledQuestions = shuffledQuestions.map(question => ({
            ...question,
            options: shuffleArray(question.options || [])
          }));
        }
        
        setQuizData(data);
        setQuestions(shuffledQuestions);
        setTimeLeft(data.config?.timeLimit || 1800);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadQuizData();
  }, [shuffleArray, loadSavedProgress, isAuthenticated, user]);

  // Auto-save every 10 seconds when active
  useEffect(() => {
    if (isActive || quizData) {
      autoSaveRef.current = setInterval(saveProgress, 10000);
      return () => clearInterval(autoSaveRef.current);
    }
  }, [isActive, quizData, saveProgress]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isActive) {
        saveProgress();
        e.preventDefault();
        e.returnValue = 'You have an active quiz session.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive, saveProgress]);

  const startQuiz = useCallback(async () => {
    try {
      if (!user || !user.name || !user.email) {
        alert('Authentication error. Please log in again.');
        navigate('/', { replace: true });
        return;
      }

      if (!isFullscreenSupported_()) {
        const proceed = window.confirm(
          'Fullscreen mode is not supported in your browser. ' +
          'This may affect the quiz experience. Do you want to proceed anyway?'
        );
        if (!proceed) return;
      }

      const fullscreenSuccess = await enterFullScreen();
      
      if (!fullscreenSuccess && isFullscreenSupported_()) {
        alert('Failed to enter fullscreen mode. Please allow fullscreen access and try again.');
        return;
      }

      setIsActive(true);
      const now = Date.now();
      setStartTime(now);
      setQuestionStartTime(now);
      setSubmissionReason('completed');
      setVisitedQuestions(new Set([0]));
      setTabSwitchCount(0);
      
      startComprehensiveMonitoring();
      saveProgress();
      
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Failed to start quiz. Please try again.');
    }
  }, [user, saveProgress, navigate, isFullscreenSupported_, enterFullScreen, startComprehensiveMonitoring]);

  // Timer functionality
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setSubmissionReason('time_expired');
            setTimeout(() => handleSubmitQuiz(), 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, timeLeft, handleSubmitQuiz]);

  // Time tracking per question
  useEffect(() => {
    if (questionStartTime && questions.length > 0 && isActive) {
      const questionId = questions[currentQuestionIndex]?.id;
      if (questionId) {
        const timeSpent = Date.now() - questionStartTime;
        setTimeSpentPerQuestion(prev => ({
          ...prev,
          [questionId]: (prev[questionId] || 0) + Math.floor(timeSpent / 1000)
        }));
      }
    }
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex, questions, questionStartTime, isActive]);

  // Navigation functions
  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      setVisitedQuestions(prev => new Set([...prev, index]));
      saveProgress();
    }
  }, [questions.length, saveProgress]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, questions.length, goToQuestion]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex, goToQuestion]);

  // Answer selection
  const handleOptionSelect = useCallback((questionId, optionId) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
    
    setVisitedQuestions(prev => new Set([...prev, currentQuestionIndex]));
    setTimeout(saveProgress, 100);
  }, [currentQuestionIndex, saveProgress]);

  // Clear selection
  const clearSelection = useCallback(() => {
    const currentQuestionId = questions[currentQuestionIndex]?.id;
    if (currentQuestionId) {
      setSelectedAnswers(prev => {
        const updated = { ...prev };
        delete updated[currentQuestionId];
        return updated;
      });
      saveProgress();
    }
  }, [questions, currentQuestionIndex, saveProgress]);

  // Toggle review flag
  const toggleReviewFlag = useCallback(() => {
    const currentQuestionId = questions[currentQuestionIndex]?.id;
    if (currentQuestionId) {
      setReviewFlags(prev => ({
        ...prev,
        [currentQuestionId]: !prev[currentQuestionId]
      }));
      saveProgress();
    }
  }, [questions, currentQuestionIndex, saveProgress]);

  // Submit confirmation
  const confirmSubmitQuiz = useCallback(() => {
    setShowSubmissionModal(true);
  }, []);

  // Handle modal actions
  const handleModalCancel = useCallback(() => {
    setShowSubmissionModal(false);
  }, []);

  const handleModalConfirm = useCallback(() => {
    handleSubmitQuiz();
  }, [handleSubmitQuiz]);

  // Handle fullscreen modal
  const handleFullscreenModalOk = useCallback(async () => {
    const success = await enterFullScreen();
    if (success || !isFullscreenSupported) {
      setShowFullscreenModal(false);
    }
  }, [enterFullScreen, isFullscreenSupported]);

  // Get question status
  const getQuestionStatus = useCallback((index) => {
    const questionId = questions[index]?.id;
    if (!questionId) return 'not-visited';
    
    const isAnswered = selectedAnswers[questionId];
    const isReviewed = reviewFlags[questionId];
    const isVisited = visitedQuestions.has(index);
    
    if (isAnswered && isReviewed) return 'answered-for-review';
    if (isAnswered) return 'answered';
    if (isReviewed) return 'for-review';
    if (isVisited) return 'visited';
    return 'not-visited';
  }, [questions, selectedAnswers, reviewFlags, visitedQuestions]);

  // Calculate counts for sidebar filters
  const answeredCount = Object.keys(selectedAnswers).length;
  const notVisitedCount = questions.length - visitedQuestions.size;
  const reviewedCount = Object.values(reviewFlags).filter(flag => flag).length;
  const unansweredCount = questions.length - answeredCount;

  // Filter questions based on type
  const getQuestionsByType = useCallback((type) => {
    return questions.map((_, index) => {
      const questionId = questions[index]?.id;
      if (!questionId) return false;
      
      const isAnswered = selectedAnswers[questionId];
      const isReviewed = reviewFlags[questionId];
      const isVisited = visitedQuestions.has(index);
      
      switch (type) {
        case 'answered':
          return isAnswered;
        case 'not-visited':
          return !isVisited;
        case 'reviewed':
          return isReviewed;
        default:
          return false;
      }
    }).map((match, index) => match ? index : -1).filter(index => index !== -1);
  }, [questions, selectedAnswers, reviewFlags, visitedQuestions]);

  // Navigate to first question of specific type
  const goToQuestionType = useCallback((type) => {
    const questionsByType = getQuestionsByType(type);
    if (questionsByType.length > 0) {
      goToQuestion(questionsByType[0]);
    }
  }, [getQuestionsByType, goToQuestion]);

  useEffect(() => {
    if (!isActive || showSubmissionModal || showFullscreenModal) return;

    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          previousQuestion();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextQuestion();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          const optionIndex = parseInt(e.key, 10) - 1;
          const currentQuestion = questions[currentQuestionIndex];
          if (currentQuestion?.options[optionIndex]) {
            e.preventDefault();
            handleOptionSelect(currentQuestion.id, currentQuestion.options[optionIndex].id);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isActive, showSubmissionModal, showFullscreenModal, previousQuestion, nextQuestion, questions, currentQuestionIndex, handleOptionSelect]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      stopComprehensiveMonitoring();
    };
  }, [stopComprehensiveMonitoring]);

  if (!isAuthenticated || !user) {
    return (
      <div className="quiz-loading">
        <div className="loading-spinner"></div>
        <h2>Checking Authentication...</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="quiz-loading">
        <div className="loading-spinner"></div>
        <h2>Loading Quiz...</h2>
        <p>Please wait while we prepare your examination.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-error">
        <h2>Error Loading Quiz</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Retry
        </button>
        <button onClick={() => navigate('/')} className="home-btn">
          Go Home
        </button>
      </div>
    );
  }

  if (!quizData || !questions.length) {
    return (
      <div className="quiz-error">
        <h2>No Quiz Data Available</h2>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Retry
        </button>
        <button onClick={() => navigate('/')} className="home-btn">
          Go Home
        </button>
      </div>
    );
  }

  if (!isActive && !isQuizCompleted) {
    return (
      <div className="quiz-start-screen">
        <div className="quiz-intro">
          <h1>Online Quiz - {quizData.config?.title || 'Assessment'}</h1>
          <p>{quizData.config?.description || 'Complete the quiz within the time limit.'}</p>
          
          <div className="student-info">
            <h3>Student Information</h3>
            <p><strong>Name:</strong> {user?.name || user?.firstName || 'Unknown'}</p>
            <p><strong>Email:</strong> {user?.email || 'unknown@email.com'}</p>
          </div>
          
          <div className="quiz-info">
            <div className="info-item">
              <span>Questions: {questions.length}</span>
            </div>
            <div className="info-item">
              <span>Time Limit: {formatTime(timeLeft)}</span>
            </div>
            <div className="info-item">
              <span>Passing Score: {quizData.config?.passingScore || 70}%</span>
            </div>
          </div>
          
          <div className="quiz-instructions">
            <h3>Instructions</h3>
            <ul>
              <li>Answer all questions within the time limit</li>
              <li>You can navigate between questions using arrow keys</li>
              <li>Use number keys 1-4 to quickly select options</li>
              <li>Mark questions for review if needed</li>
              <li>Your progress is automatically saved</li>
              <li><strong>The quiz will enter fullscreen mode automatically</strong></li>
              <li><strong>You must remain in fullscreen mode throughout the exam</strong></li>
              <li><strong>Tab switching and window switching are monitored</strong></li>
            </ul>
          </div>
          
          <button className="start-quiz-btn" onClick={startQuiz}>
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = selectedAnswers[currentQuestion?.id];
  const isMarkedForReview = reviewFlags[currentQuestion?.id];

  return (
    <div 
      className="quiz-container" 
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    >
      {/* Enhanced Fullscreen Warning Modal */}
      {showFullscreenModal && (
        <div className="fullscreen-modal-overlay mandatory-modal">
          <div className="fullscreen-modal enhanced-modal">
            <div className="fullscreen-modal-header">
              <h2>Fullscreen Mode Required</h2>
              <div className="security-badge">
                <span>SECURITY REQUIREMENT</span>
              </div>
            </div>
            
            <div className="fullscreen-modal-content">
              <div className="fullscreen-warning-icon pulsing">
                <span>⚠️</span>
              </div>
              <div className="warning-text">
                <h3>Examination Security Protocol</h3>
                <p>To maintain the integrity of this examination, you must remain in fullscreen mode.</p>
                <p>This is a mandatory requirement and cannot be bypassed.</p>
                
                <div className="security-notice">
                  <h4>Security Notice:</h4>
                  <ul>
                    <li>Switching windows or tabs is not allowed</li>
                    <li>Developer tools are disabled</li>
                    <li>Right-click is disabled</li>
                    <li>All navigation must be done within the quiz interface</li>
                    {tabSwitchCount > 0 && (
                      <li className="violation-notice">
                        <strong>Violations detected: {tabSwitchCount}</strong>
                      </li>
                    )}
                  </ul>
                </div>
                
                {!isFullscreenSupported && (
                  <div className="browser-warning">
                    <p><strong>Warning:</strong> Your browser may not fully support fullscreen mode. Please use a modern browser like Chrome, Firefox, or Safari for the best experience.</p>
                    <p>Try pressing <strong>F11</strong> to enter fullscreen mode manually.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="fullscreen-modal-footer">
              <button 
                className="fullscreen-modal-btn primary-btn pulse-btn" 
                onClick={handleFullscreenModalOk}
              >
                Enter Fullscreen Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {showSubmissionModal && (
        <div className="submission-modal-overlay">
          <div className="submission-modal">
            <div className="modal-header">
              <h2>Submit Quiz Confirmation</h2>
              <div className="modal-warning">
                <span>This action cannot be undone!</span>
              </div>
            </div>
            
            <div className="modal-content">
              <div className="quiz-summary">
                <h3>Quiz Summary</h3>
                
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-icon">📝</span>
                    <div className="summary-details">
                      <span className="summary-label">Total Questions</span>
                      <span className="summary-value">{questions.length}</span>
                    </div>
                  </div>
                  
                  <div className="summary-item answered">
                    <span className="summary-icon">✓</span>
                    <div className="summary-details">
                      <span className="summary-label">Answered</span>
                      <span className="summary-value">{answeredCount}</span>
                    </div>
                  </div>
                  
                  {unansweredCount > 0 && (
                    <div className="summary-item unanswered">
                      <span className="summary-icon">✗</span>
                      <div className="summary-details">
                        <span className="summary-label">Unanswered</span>
                        <span className="summary-value">{unansweredCount}</span>
                      </div>
                    </div>
                  )}
                  
                  {reviewedCount > 0 && (
                    <div className="summary-item reviewed">
                      <span className="summary-icon">🚩</span>
                      <div className="summary-details">
                        <span className="summary-label">Marked for Review</span>
                        <span className="summary-value">{reviewedCount}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="summary-item time">
                    <span className="summary-icon">⏰</span>
                    <div className="summary-details">
                      <span className="summary-label">Time Remaining</span>
                      <span className="summary-value">{formatTime(timeLeft)}</span>
                    </div>
                  </div>

                  {tabSwitchCount > 0 && (
                    <div className="summary-item violations">
                      <span className="summary-icon">⚠️</span>
                      <div className="summary-details">
                        <span className="summary-label">Tab Switch Violations</span>
                        <span className="summary-value">{tabSwitchCount}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {unansweredCount > 0 && (
                  <div className="warning-message">
                    <p>
                      You have <strong>{unansweredCount}</strong> unanswered question{unansweredCount > 1 ? 's' : ''}. 
                      These will be marked as incorrect.
                    </p>
                  </div>
                )}
                
                <div className="completion-rate">
                  <span className="completion-label">Completion Rate:</span>
                  <div className="completion-bar">
                    <div 
                      className="completion-fill" 
                      style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="completion-percentage">
                    {Math.round((answeredCount / questions.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-btn cancel-btn" 
                onClick={handleModalCancel}
              >
                Continue Quiz
              </button>
              
              <button 
                className="modal-btn confirm-btn" 
                onClick={handleModalConfirm}
              >
                Submit Final Answers
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="quiz-sidebar">
        <div className="sidebar-header">
          <h3>Questions</h3>
          <p>{currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        
        <div className="sidebar-filters">
          <button 
            className="filter-btn answered" 
            onClick={() => goToQuestionType('answered')}
            disabled={answeredCount === 0}
          >
            Answered: {answeredCount}
          </button>
          <button 
            className="filter-btn not-visited" 
            onClick={() => goToQuestionType('not-visited')}
            disabled={notVisitedCount === 0}
          >
            Not Visited: {notVisitedCount}
          </button>
          <button 
            className="filter-btn reviewed" 
            onClick={() => goToQuestionType('reviewed')}
            disabled={reviewedCount === 0}
          >
            Reviewed: {reviewedCount}
          </button>
        </div>
        
        <div className="questions-grid">
          {questions.map((_, index) => {
            const status = getQuestionStatus(index);
            const isCurrent = index === currentQuestionIndex;
            
            return (
              <button
                key={index}
                className={`question-btn ${status} ${isCurrent ? 'current' : ''}`}
                onClick={() => goToQuestion(index)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        <div className="progress-summary">
          <p>Answered: {Object.keys(selectedAnswers).length}</p>
          <p>Remaining: {questions.length - Object.keys(selectedAnswers).length}</p>
          {tabSwitchCount > 0 && (
            <p className="violations-count">Violations: {tabSwitchCount}</p>
          )}
        </div>

        <button className="submit-quiz-btn" onClick={confirmSubmitQuiz}>
          Submit Quiz
        </button>
      </div>

      <div className="quiz-main">
        <div className="quiz-header">
          <div className="user-info-header">
            <div className="user-name">
              <span className="user-icon">👤</span>
              <span className="name-text">{user?.name || user?.firstName || 'Student'}</span>
            </div>
            {/* **IMPROVED: Minimal fullscreen button with symbol** */}
            <button 
              className="fullscreen-toggle-btn minimal"
              onClick={enterFullScreen}
              title="Enter Fullscreen Mode"
              aria-label="Enter Fullscreen Mode"
            >
              ⛶
            </button>
          </div>
          
          <div className="question-progress">
            <h2>Question {currentQuestionIndex + 1} of {questions.length}</h2>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="timer-display">
            <span className="timer-text">{formatTime(timeLeft)}</span>
            <span className="timer-label">Time Remaining</span>
          </div>
        </div>

        <div className="question-content">
          <div className="question-text">
            <h3>{currentQuestion?.text}</h3>
          </div>

          <div className="options-container">
            {currentQuestion?.options?.map((option, index) => {
              const isSelected = selectedAnswer === option.id;
              const prefix = String.fromCharCode(65 + index);
              
              return (
                <div
                  key={option.id}
                  className={`option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
                >
                  <div className="option-prefix">
                    <span className="option-letter">{prefix}</span>
                    <span className="option-key">{index + 1}</span>
                  </div>
                  <div className="option-content">
                    <span className="option-text">{option.text}</span>
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option.id}
                      checked={isSelected}
                      onChange={() => handleOptionSelect(currentQuestion.id, option.id)}
                      className="option-radio"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="quiz-navigation">
          <div className="nav-left">
            <button 
              className="nav-btn"
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              ← Previous
            </button>
          </div>

          <div className="nav-center">
            <button 
              className="nav-btn clear-btn"
              onClick={clearSelection}
              disabled={!selectedAnswer}
            >
              Clear
            </button>
            
            <button 
              className={`nav-btn ${isMarkedForReview ? 'review-active' : ''}`}
              onClick={toggleReviewFlag}
            >
              {isMarkedForReview ? 'Marked' : 'Mark for Review'}
            </button>
          </div>

          <div className="nav-right">
            <button 
              className="nav-btn"
              onClick={nextQuestion}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizDisplay;
