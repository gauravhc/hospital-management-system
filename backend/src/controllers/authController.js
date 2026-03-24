const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');
const { auditLog } = require('../utils/auditLog');

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.execute(
      `SELECT u.id, u.hospital_id, u.role_id, u.email, u.password_hash, u.status,
              u.first_name, u.last_name, u.profile_image,
              r.name AS role, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const user = rows[0];

    if (user.status !== 'active') {
      return errorResponse(res, 'Your account is inactive. Contact administrator.', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospital_id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token
    await pool.execute(`UPDATE users SET refresh_token = ?, last_login = NOW() WHERE id = ?`, [
      refreshToken,
      user.id,
    ]);

    await auditLog({
      hospitalId: user.hospital_id,
      userId: user.id,
      action: 'LOGIN',
      entity: 'users',
      entityId: user.id,
      req,
    });

    const { password_hash, refresh_token, ...safeUser } = user;
    safeUser.permissions = JSON.parse(user.permissions || '[]');

    return successResponse(
      res,
      { accessToken, refreshToken, user: safeUser },
      'Login successful'
    );
  } catch (error) {
    return errorResponse(res, 'Login failed: ' + error.message);
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return errorResponse(res, 'Refresh token required', 400);

    const decoded = verifyRefreshToken(token);

    // Verify token matches DB
    const [rows] = await pool.execute(
      `SELECT id, email, hospital_id, role_id, status, refresh_token,
              r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (!rows.length || rows[0].refresh_token !== token) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    const user = rows[0];
    if (user.status !== 'active') {
      return errorResponse(res, 'Account is inactive', 403);
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospital_id,
    });

    return successResponse(res, { accessToken: newAccessToken }, 'Token refreshed');
  } catch (error) {
    return errorResponse(res, 'Token refresh failed', 401);
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await pool.execute(`UPDATE users SET refresh_token = NULL WHERE id = ?`, [req.user.id]);

    await auditLog({
      hospitalId: req.user.hospital_id,
      userId: req.user.id,
      action: 'LOGOUT',
      entity: 'users',
      entityId: req.user.id,
      req,
    });

    return successResponse(res, {}, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, 'Logout failed: ' + error.message);
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [rows] = await pool.execute(`SELECT password_hash FROM users WHERE id = ?`, [
      req.user.id,
    ]);

    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) return errorResponse(res, 'Current password is incorrect', 400);

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, req.user.id]);

    await auditLog({
      hospitalId: req.user.hospital_id,
      userId: req.user.id,
      action: 'CHANGE_PASSWORD',
      entity: 'users',
      entityId: req.user.id,
      req,
    });

    return successResponse(res, {}, 'Password changed successfully');
  } catch (error) {
    return errorResponse(res, 'Password change failed: ' + error.message);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.hospital_id, u.employee_id, u.first_name, u.last_name, u.email,
              u.phone, u.gender, u.profile_image, u.status, u.last_login, u.created_at,
              r.name AS role, r.display_name AS role_display, r.permissions,
              h.name AS hospital_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN hospitals h ON u.hospital_id = h.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!rows.length) return errorResponse(res, 'User not found', 404);

    const user = rows[0];
    user.permissions = JSON.parse(user.permissions || '[]');

    return successResponse(res, user, 'Profile fetched');
  } catch (error) {
    return errorResponse(res, 'Failed to get profile: ' + error.message);
  }
};

module.exports = { login, refreshToken, logout, changePassword, getMe };
