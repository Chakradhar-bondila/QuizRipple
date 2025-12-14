const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50 
  },
  email: { 
    type: String, 
    unique: true, 
    required: true,
    lowercase: true,
    trim: true 
  },
  
  password: { 
    type: String, 
    required: true,
    minlength: 6 
  },
  mobile: { 
    type: String,
    trim: true 
  },
  dob: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  // Additional profile fields
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  location: {
    type: String,
    maxlength: 100,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  // User stats
  totalQuizzes: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  bestScore: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  rank: {
    type: String,
    default: 'Beginner'
  },
  // Preferences
  emailNotifications: {
    type: Boolean,
    default: true
  },
  pushNotifications: {
    type: Boolean,
    default: false
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'light'
  },
  language: {
    type: String,
    default: 'en'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
