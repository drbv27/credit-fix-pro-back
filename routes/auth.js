/**
 * Authentication Routes with MongoDB
 * Rutas para login y registro de usuarios
 */

const express = require('express');
const authService = require('../services/auth-service');
const User = require('../models/User');
const CreditReport = require('../models/CreditReport');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user with MongoDB
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, smartcreditEmail, smartcreditPassword } = req.body;

    // Validation
    if (!email || !password || !smartcreditEmail || !smartcreditPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, and SmartCredit credentials are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Register user using auth service
    const result = await authService.register({
      email,
      password,
      smartcreditEmail,
      smartcreditPassword,
    });

    res.status(201).json({
      message: 'User registered successfully',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'User already exists',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Error registering user'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with MongoDB
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    // Login using auth service
    const result = await authService.login({ email, password });

    // Get user's last report if exists
    const user = await User.findById(result.user.id).populate('lastReportId');
    let lastReport = null;

    if (user.lastReportId) {
      lastReport = {
        id: user.lastReportId._id,
        scrapedAt: user.lastReportId.createdAt,
        status: user.lastReportId.scrapingStatus,
      };
    }

    res.json({
      message: 'Login successful',
      token: result.token,
      user: result.user,
      lastReport,
    });
  } catch (error) {
    console.error('Login error:', error);

    if (error.message.includes('Invalid') || error.message.includes('deactivated')) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Error authenticating user'
    });
  }
});

/**
 * POST /api/auth/update-credentials
 * Update SmartCredit credentials - Requires authentication
 */
router.post('/update-credentials', authenticateToken, async (req, res) => {
  try {
    const { smartcreditEmail, smartcreditPassword } = req.body;

    if (!smartcreditEmail || !smartcreditPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'SmartCredit email and password are required'
      });
    }

    // Update using auth service
    await authService.updateSmartcreditCredentials(req.user.id, {
      email: smartcreditEmail,
      password: smartcreditPassword,
    });

    res.json({
      message: 'SmartCredit credentials updated successfully',
      user: {
        id: req.user.id,
        email: req.user.email,
        hasSmartcreditCredentials: true,
      },
    });
  } catch (error) {
    console.error('Error updating credentials:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'User not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Error updating credentials'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info - Requires authentication
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        hasSmartcreditCredentials: !!user.smartcreditCredentials?.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Error getting user information'
    });
  }
});

module.exports = router;
