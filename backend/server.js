const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

// Enhanced CORS configuration for Vercel + Render
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'https://quiz-ripple.vercel.app',
  'https://quiz-ripple-git-main-thoraj-ms-projects.vercel.app',
  'https://quiz-ripple-ec9772emk-thoraj-ms-projects.vercel.app/',
  'http://localhost:3000',
  'http://localhost:3001'
];

// Remove any undefined origins
const validOrigins = allowedOrigins.filter(origin => origin);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (validOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Additional CORS headers for complex requests
app.use((req, res, next) => {
  if (req.headers.origin && validOrigins.includes(req.headers.origin)) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Serve static files from data folder
app.use('/data', express.static(path.join(__dirname, 'data'), {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// CORRECTED MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    });
    
    console.log('✅ MongoDB connected:', conn.connection.host);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Routes with error handling
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
} catch (err) {
  console.warn('⚠️ Auth routes not found:', err.message);
}

try {
  app.use('/api/user', require('./routes/profile'));
  console.log('✅ Profile routes loaded');
} catch (err) {
  console.warn('⚠️ Profile routes not found:', err.message);
}

try {
  app.use('/api/quiz-results', require('./routes/quizResults'));
  console.log('✅ Quiz results routes loaded');
} catch (err) {
  console.warn('⚠️ Quiz results routes not found:', err.message);
}

try {
  app.use('/api/collections', require('./routes/collectionRoutes'));
  console.log('✅ Collection routes loaded');
} catch (err) {
  console.warn('⚠️ Collection routes not found:', err.message);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV || 'development',
    cors_origins: validOrigins
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'API Server is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      user: '/api/user',
      quizResults: '/api/quiz-results',
      collections: '/api/collections'
    }
  });
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ 
      error: 'API route not found',
      path: req.path,
      method: req.method 
    });
  } else {
    res.status(404).json({ 
      error: 'Page not found',
      path: req.path 
    });
  }
});

// Enhanced error handler
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS error',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: err.message
    });
  }

  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(` Static files: ${path.join(__dirname, 'data')}`);
  console.log(` CORS origins: ${validOrigins.join(', ')}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});
