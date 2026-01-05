/**
 * Authentication Middleware
 * Verifica el token JWT en las requests
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware para verificar JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Token no proporcionado'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Token inválido',
        message: 'El token proporcionado no es válido o ha expirado'
      });
    }

    req.user = user;
    next();
  });
}

/**
 * Genera un token JWT para un usuario
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

module.exports = {
  authenticateToken,
  generateToken,
  JWT_SECRET,
};
