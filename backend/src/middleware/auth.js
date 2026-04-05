const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chaiconnect_dev_secret_change_in_production';

/**
 * requireAuth — verifies JWT from Authorization header.
 * Sets req.user = { userId, role, name, factoryId }
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized — no token provided' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}

/**
 * requireRole(...roles) — restricts route to specific roles.
 * Always call after requireAuth.
 * Example: router.delete('/users/:id', requireAuth, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden — requires role: ${roles.join(' or ')}`,
        yourRole: req.user.role,
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
