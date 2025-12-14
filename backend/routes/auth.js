const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// In-memory stores (use Redis in production)
const resetTokens = new Map();
const otpStore = new Map();

// Environment variables validation
const requiredEnvVars = ['JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
  }
});

// UTILITY FUNCTIONS

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Clean expired OTPs (5 minutes expiry)
const cleanExpiredOTPs = () => {
  for (const [key, value] of otpStore.entries()) {
    if (Date.now() - value.timestamp > 300000) { // 5 minutes
      otpStore.delete(key);
    }
  }
};

// Clean expired reset tokens (1 hour expiry)
const cleanExpiredResetTokens = () => {
  for (const [key, value] of resetTokens.entries()) {
    if (Date.now() - value.timestamp > 3600000) { // 1 hour
      resetTokens.delete(key);
    }
  }
};

// EMAIL FUNCTIONS

// Send OTP Email
const sendOTPEmail = async (userName, userEmail, otp) => {
  try {
    console.log(`📧 Sending OTP email to ${userEmail}`);
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const otpEmailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9ff; border-radius: 15px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center; color: white;">
          <div style="background: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">🔐</span>
          </div>
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Email Verification</h1>
          <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">QuizRipple Account Setup</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px; background: white; text-align: center;">
          <h2 style="color: #667eea; margin: 0 0 20px; font-size: 24px;">Hello ${userName}! 👋</h2>
          
          <p style="font-size: 16px; color: #666; margin: 0 0 30px; line-height: 1.6;">
            Please use the verification code below to complete your QuizRipple account setup:
          </p>

          <!-- OTP Display with Copy Feature -->
          <div style="background: linear-gradient(135deg, #f8f9ff, #e8f2ff); border: 2px dashed #667eea; border-radius: 15px; padding: 30px; margin: 30px 0; position: relative;">
            <div style="font-size: 42px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; margin-bottom: 10px; user-select: all; cursor: text;" id="otp-code">
              ${otp}
            </div>
            <p style="margin: 10px 0 0; color: #888; font-size: 14px; font-weight: 500;">Verification Code</p>

          </div>

          <!-- Warning -->
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 25px 0; text-align: left; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⏰ Important:</strong> This code will expire in <strong>5 minutes</strong> for your security. Please enter it on the verification page to complete your account setup.
            </p>
          </div>

          <p style="color: #666; font-size: 14px; margin: 20px 0;">
            If you didn't request this verification, please ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #667eea; padding: 20px; text-align: center; color: white;">
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">
            This is an automated message from QuizRipple
          </p>
          <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.7;">
            © 2025 QuizRipple. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"QuizRipple Team" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🔐 Verify Your Email - QuizRipple Account Setup',
      html: otpEmailTemplate
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${userEmail}`);
    
    return {
      success: true,
      message: 'OTP email sent successfully'
    };

  } catch (error) {
    console.error('❌ OTP email error:', error);
    return {
      success: false,
      message: 'Failed to send OTP email',
      error: error.message
    };
  }
};

// Send Welcome Email
const sendWelcomeEmail = async (userName, userEmail) => {
  try {
    console.log(`📧 Sending welcome email to ${userEmail}`);
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const welcomeEmailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px; overflow: hidden;">
        <!-- Header -->
        <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; text-align: center;">
          <div style="background: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">🎓</span>
          </div>
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Welcome to QuizRipple!</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Your Learning Journey Starts Now</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px; background: white; color: #333;">
          <h2 style="color: #667eea; margin: 0 0 20px; font-size: 24px;">Hello ${userName}! 👋</h2>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
            Thank you for joining <strong>QuizRipple</strong>! We're thrilled to have you as part of our learning community. Your account has been successfully created and verified, and you're ready to start your quiz adventure.
          </p>

          <div style="background: #f8f9ff; border-radius: 10px; padding: 25px; margin: 25px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #667eea; margin: 0 0 15px; font-size: 18px;">🚀 What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">✨ Explore thousands of quizzes across different subjects</li>
              <li style="margin-bottom: 8px;">📊 Track your progress and earn achievements</li>
              <li style="margin-bottom: 8px;">🏆 Compete with other learners on the leaderboard</li>
              <li style="margin-bottom: 8px;">🎯 Get personalized quiz recommendations</li>
            </ul>
          </div>

          <div style="background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0;">
            <h3 style="color: white; margin: 0 0 15px;">Ready to Start Learning?</h3>
            <a href="${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/dashboard" 
               style="background: white; color: #667eea; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin-top: 10px;">
              🎯 Take Your First Quiz
            </a>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <h4 style="color: #667eea; margin: 0 0 15px;">📞 Need Help Getting Started?</h4>
            <div style="background: #f8f9ff; padding: 15px; border-radius: 8px;">
              <p style="margin: 0 0 10px; color: #666;">
                <strong>📧 Support:</strong> <a href="mailto:support@quizripple.com" style="color: #667eea;">support@quizripple.com</a>
              </p>
              <p style="margin: 0; color: #666;">
                <strong>📚 Help Center:</strong> <a href="${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/help" style="color: #667eea;">Visit Help Center</a>
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="margin: 0; color: #888; font-size: 14px;">
              Happy Learning! 🚀<br>
              <strong>The QuizRipple Team</strong>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #667eea; padding: 20px 30px; text-align: center;">
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">
            This email was sent because you created an account on QuizRipple.
          </p>
          <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.7;">
            © 2025 QuizRipple. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"QuizRipple Team" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🎉 Welcome to QuizRipple - Your Learning Journey Begins!',
      html: welcomeEmailTemplate
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent successfully to ${userEmail}`);
    
    return {
      success: true,
      message: 'Welcome email sent successfully'
    };

  } catch (error) {
    console.error('❌ Welcome email error:', error);
    return {
      success: false,
      message: 'Failed to send welcome email',
      error: error.message
    };
  }
};

// AUTH ROUTES

// NEW: Send OTP for signup verification
router.post('/send-otp', async (req, res) => {
  const { name, email, password, mobile, dob, gender } = req.body;

  try {
    // Clean expired OTPs first
    cleanExpiredOTPs();

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'validation',
        message: 'Name, email and password are required'
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'validation',
        field: 'password',
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'validation',
        field: 'email',
        message: 'User already exists with this email'
      });
    }

    // Check for too many OTP requests from same email
    const otpKey = email.toLowerCase().trim();
    const existingOTP = otpStore.get(otpKey);
    
    if (existingOTP && (Date.now() - existingOTP.timestamp) < 60000) { // 1 minute cooldown
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting a new OTP'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with user data (expires in 5 minutes)
    otpStore.set(otpKey, {
      otp,
      userData: { 
        name: name?.trim(), 
        email: email.toLowerCase().trim(), 
        password, 
        mobile: mobile?.trim(), 
        dob, 
        gender 
      },
      timestamp: Date.now(),
      attempts: 0,
      resendCount: existingOTP ? (existingOTP.resendCount || 0) + 1 : 1
    });

    // Check resend limit
    const currentData = otpStore.get(otpKey);
    if (currentData.resendCount > 3) {
      otpStore.delete(otpKey);
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again later.'
      });
    }

    // Send OTP email
    const emailStatus = await sendOTPEmail(name, email, otp);

    if (!emailStatus.success) {
      // If email fails, remove OTP from store
      otpStore.delete(otpKey);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email',
      email: email.toLowerCase().trim(),
      expiresIn: 300, // 5 minutes
      resendCount: currentData.resendCount,
      otpHint: `Your 6-digit verification code has been sent to ${email}`
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending OTP'
    });
  }
});

// NEW: Verify OTP and create account
router.post('/verify-otp', async (req, res) => {
  const { otp, ...submittedData } = req.body;

  try {
    // Clean expired OTPs
    cleanExpiredOTPs();

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be exactly 6 digits'
      });
    }

    const email = submittedData.email?.toLowerCase()?.trim();
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const otpKey = email;
    const storedData = otpStore.get(otpKey);

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or invalid. Please request a new one.'
      });
    }

    // Check if OTP is expired (5 minutes)
    if (Date.now() - storedData.timestamp > 300000) {
      otpStore.delete(otpKey);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check OTP attempts
    if (storedData.attempts >= 3) {
      otpStore.delete(otpKey);
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts += 1;
      otpStore.set(otpKey, storedData);
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.`
      });
    }

    // OTP is valid, create account
    const { name, email: userEmail, password, mobile, dob, gender } = storedData.userData;

    // Double-check if user was created in the meantime
    const existing = await User.findOne({ email: userEmail });
    if (existing) {
      otpStore.delete(otpKey);
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = new User({
      name,
      email: userEmail,
      password: hashedPassword,
      mobile,
      dob,
      gender,
      isEmailVerified: true // Mark as verified since OTP was successful
    });

    await newUser.save();
    console.log(`✅ User created successfully via OTP: ${newUser.email}`);

    // Generate token
    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const userData = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      mobile: newUser.mobile,
      dob: newUser.dob,
      gender: newUser.gender,
      isEmailVerified: newUser.isEmailVerified
    };

    // Send welcome email (non-blocking)
    const emailStatus = await sendWelcomeEmail(newUser.name, newUser.email);

    // Remove OTP from store
    otpStore.delete(otpKey);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Email verified.',
      token,
      user: userData,
      emailSent: emailStatus.success,
      emailMessage: emailStatus.message,
      welcomeEmailStatus: emailStatus
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: errors.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during account creation'
    });
  }
});

// DEPRECATED: Direct signup (kept for backward compatibility)
router.post('/signup', async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Direct signup is disabled. Please use OTP verification via /send-otp and /verify-otp endpoints.',
    info: 'This enhances security by verifying email addresses.'
  });
});

// Sign In
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'validation',
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      dob: user.dob,
      gender: user.gender,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified || false,
      totalQuizzes: user.totalQuizzes || 0,
      averageScore: user.averageScore || 0,
      bestScore: user.bestScore || 0,
      streak: user.streak || 0,
      rank: user.rank || 'Beginner'
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
});

// Verify token
router.get('/verify-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) {
      return res.status(401).json({ 
        success: false,
        valid: false, 
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      valid: true,
      user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false,
      valid: false, 
      message: 'Invalid token' 
    });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Clean expired tokens
    cleanExpiredResetTokens();

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, {
      email: email.toLowerCase().trim(),
      timestamp: Date.now()
    });

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const resetLink = `${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/reset-password/${token}`;

    const mailOptions = {
      from: `"QuizRipple Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - QuizRipple',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested a password reset for your QuizRipple account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
          <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Best regards,<br>The QuizRipple Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Password reset email sent successfully',
      info: 'Check your email for reset instructions'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Enhanced error handling for email issues
    if (error.code === 'EAUTH') {
      return res.status(500).json({ 
        success: false,
        message: 'Email authentication failed. Please check email credentials.' 
      });
    }
    if (error.code === 'ECONNECTION') {
      return res.status(500).json({ 
        success: false,
        message: 'Email service connection failed. Please try again later.' 
      });
    }
    if (error.responseCode === 535) {
      return res.status(500).json({ 
        success: false,
        message: 'Invalid email credentials. Please check your email configuration.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to send reset email' 
    });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Clean expired tokens
    cleanExpiredResetTokens();

    // Check if token exists and is valid
    const tokenData = resetTokens.get(token);
    if (!tokenData) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token' 
      });
    }

    // Check if token is expired (1 hour)
    if (Date.now() - tokenData.timestamp > 3600000) {
      resetTokens.delete(token);
      return res.status(400).json({ 
        success: false,
        message: 'Reset token has expired' 
      });
    }

    // Find user and update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const user = await User.findOneAndUpdate(
      { email: tokenData.email },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Remove used token
    resetTokens.delete(token);

    res.json({ 
      success: true,
      message: 'Password reset successful' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during password reset' 
    });
  }
});

// Get OTP status (for debugging/admin)
router.get('/otp-status', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  
  try {
    cleanExpiredOTPs();
    
    const activeOTPs = Array.from(otpStore.entries()).map(([email, data]) => ({
      email,
      timestamp: new Date(data.timestamp).toISOString(),
      attempts: data.attempts,
      resendCount: data.resendCount,
      expiresIn: Math.max(0, 300000 - (Date.now() - data.timestamp))
    }));

    res.json({
      success: true,
      activeOTPs: activeOTPs.length,
      data: activeOTPs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout (optional - for token blacklisting)
router.post('/logout', auth, async (req, res) => {
  try {
    // In a real app, you might want to blacklist the token
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during logout' 
    });
  }
});

// Cleanup expired data periodically (run every 5 minutes)
setInterval(() => {
  cleanExpiredOTPs();
  cleanExpiredResetTokens();
  console.log('🧹 Cleaned up expired OTPs and reset tokens');
}, 300000); // 5 minutes

module.exports = router;
