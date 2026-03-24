const { verifyAccessToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const { pool } = require('../config/database');

/**
 * Verify JWT and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Fetch fresh user from DB to check status
    const [rows] = await pool.execute(
      `SELECT u.id, u.hospital_id, u.role_id, u.email, u.status, u.first_name, u.last_name,
              r.name AS role, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (!rows.length) {
      return errorResponse(res, 'User not found', 401);
    }

    const user = rows[0];
    if (user.status !== 'active') {
      return errorResponse(res, 'Account is inactive or suspended', 403);
    }

    // Parse permissions
    user.permissions = JSON.parse(user.permissions || '[]');
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token', 401);
    }
    return errorResponse(res, 'Authentication failed', 401);
  }
};

/**
 * Role-based access control
 * Usage: authorize('super_admin', 'hospital_admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

/**
 * Permission-based access control
 * Usage: hasPermission('manage_users')
 */
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }
    const perms = req.user.permissions;
    if (perms.includes('*') || perms.includes(permission)) {
      return next();
    }
    return errorResponse(res, `Permission denied: ${permission} required`, 403);
  };
};

/**
 * Ensure user belongs to same hospital (or is super admin)
 */
const sameHospital = (req, res, next) => {
  if (req.user.role === 'super_admin') return next();

  const hospitalId = req.params.hospitalId || req.body.hospitalId || req.query.hospitalId;
  if (hospitalId && hospitalId !== req.user.hospital_id) {
    return errorResponse(res, 'Access denied to this hospital', 403);
  }
  // Auto-inject hospital_id for non-super admins
  req.hospitalId = req.user.hospital_id;
  next();
};

module.exports = { authenticate, authorize, hasPermission, sameHospital };
