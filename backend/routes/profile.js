const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Get user profile with basic stats
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add basic calculated stats
    const profileData = {
      ...user,
      stats: {
        totalQuizzes: user.totalQuizzes || 0,
        averageScore: user.averageScore || 0,
        bestScore: user.bestScore || 0,
        streak: user.streak || 0,
        rank: calculateRank(user.averageScore || 0, user.totalQuizzes || 0),
        totalTime: 0,
        passRate: 0,
        improvementTrend: 'stable',
        achievements: calculateBasicAchievements(user),
        recentQuizzes: []
      }
    };

    res.json(profileData);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Calculate rank helper
function calculateRank(averageScore, totalQuizzes) {
  const score = averageScore || 0;
  const quizzes = totalQuizzes || 0;
  
  if (score >= 95 && quizzes >= 20) return 'Master';
  if (score >= 90 && quizzes >= 15) return 'Expert';
  if (score >= 85 && quizzes >= 10) return 'Advanced+';
  if (score >= 80 && quizzes >= 7) return 'Advanced';
  if (score >= 75 && quizzes >= 5) return 'Intermediate+';
  if (score >= 70 && quizzes >= 3) return 'Intermediate';
  if (quizzes >= 1) return 'Novice';
  return 'Beginner';
}

// Calculate achievements helper
function calculateBasicAchievements(user) {
  const achievements = [];
  const totalQuizzes = user.totalQuizzes || 0;
  const bestScore = user.bestScore || 0;
  const averageScore = user.averageScore || 0;
  const streak = user.streak || 0;
  
  if (totalQuizzes >= 1) {
    achievements.push({ id: 'first_quiz', name: 'First Quiz', earned: true });
  }
  if (streak >= 5) {
    achievements.push({ id: 'streak_5', name: '5 Day Streak', earned: true });
  }
  if (bestScore === 100) {
    achievements.push({ id: 'perfect_score', name: 'Perfect Score', earned: true });
  }
  if (averageScore >= 90) {
    achievements.push({ id: 'high_achiever', name: 'High Achiever', earned: true });
  }
  if (totalQuizzes >= 10) {
    achievements.push({ id: 'dedicated', name: 'Dedicated Learner', earned: true });
  }
  
  return achievements;
}

// Token verification
router.get('/verify-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) {
      return res.status(401).json({ valid: false, message: 'User not found' });
    }
    
    res.json({ valid: true, user });
  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

// Password verification (for account deletion)
router.post('/verify-password', auth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const user = await User.findById(req.user.id).select('password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    res.json({ valid: true, message: 'Password verified' });
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/', auth, async (req, res) => {
  try {
    const { name, email, mobile, dob, gender, bio, location, website } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        error: 'validation',
        message: 'Name and email are required'
      });
    }

    // Validate email uniqueness if changing
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: req.user.id }
      }).select('_id').lean();

      if (existingUser) {
        return res.status(400).json({
          error: 'validation',
          field: 'email',
          message: 'Email already exists'
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name: name?.trim(),
          email: email?.toLowerCase()?.trim(),
          mobile: mobile?.trim() || undefined,
          dob: dob || undefined,
          gender: gender || undefined,
          bio: bio?.trim() || undefined,
          location: location?.trim() || undefined,
          website: website?.trim() || undefined,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true, lean: true }
    );

    delete updatedUser.password;

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: 'validation',
        field: 'email',
        message: 'Email already exists'
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'validation',
        message: validationErrors.join(', ')
      });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const preferences = req.body;
    const allowedPreferences = [
      'emailNotifications', 'pushNotifications', 'weeklyReport',
      'achievementAlerts', 'theme', 'language', 'timezone', 'difficultyPreference'
    ];

    const updateData = {};
    Object.keys(preferences).forEach(key => {
      if (allowedPreferences.includes(key)) {
        updateData[key] = preferences[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { ...updateData, updatedAt: new Date() } },
      { new: true, lean: true }
    ).select('-password');

    res.json({
      message: 'Preferences updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user stats (legacy endpoint)
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'totalQuizzes averageScore bestScore streak rank'
    ).lean();

    const stats = {
      totalQuizzes: user.totalQuizzes || 0,
      averageScore: user.averageScore || 0,
      bestScore: user.bestScore || 0,
      streak: user.streak || 0,
      rank: user.rank || 'Beginner',
      quizzesThisWeek: 0,
      totalTime: 0,
      achievements: calculateBasicAchievements(user),
      recentQuizzes: [],
      subjectStats: {}
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete account
router.delete('/', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
