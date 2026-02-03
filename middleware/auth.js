const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'neurosurg-dev-secret-2026';
const TOKEN_EXPIRY = '7d';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch (e) { /* ignore */ }
  }
  next();
}

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, displayName: user.displayName, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

module.exports = { authMiddleware, optionalAuth, generateToken, JWT_SECRET };
