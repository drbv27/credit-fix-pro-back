/**
 * Authentication Middleware with MongoDB
 * Verifies JWT token in requests
 */

const authService = require('../services/auth-service');

/**
 * Middleware to verify JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided'
    });
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = {
      id: decoded.userId,
    };
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid token',
      message: error.message
    });
  }
}

module.exports = {
  authenticateToken,
};
