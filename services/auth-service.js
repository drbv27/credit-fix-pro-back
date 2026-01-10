const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(userId) {
    const payload = { userId };
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Register new user
   */
  async register({ email, password, smartcreditEmail, smartcreditPassword }) {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create new user
    const user = new User({
      email,
      password, // Will be hashed by pre-save hook
      smartcreditCredentials: {
        email: smartcreditEmail,
        password: smartcreditPassword,
      },
    });

    await user.save();

    // Generate token
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
        hasSmartcreditCredentials: true,
      },
      token,
    };
  }

  /**
   * Login existing user
   */
  async login({ email, password }) {
    // Find user with password field included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
        hasSmartcreditCredentials: !!user.smartcreditCredentials?.email,
      },
      token,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Update SmartCredit credentials
   */
  async updateSmartcreditCredentials(userId, { email, password }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.smartcreditCredentials = {
      email,
      password,
    };

    await user.save();
    return user;
  }
}

module.exports = new AuthService();
