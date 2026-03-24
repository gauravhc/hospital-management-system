const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/response');
const { auditLog } = require('../utils/auditLog');

// ── HOSPITAL MANAGEMENT ──────────────────────────────────

// GET /api/super-admin/hospitals
const getAllHospitals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', is_active } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (h.name LIKE ? OR h.email LIKE ? OR h.license_no LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (is_active !== undefined) {
      where += ' AND h.is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM hospitals h ${where}`,
      params
    );

    const [hospitals] = await pool.execute(
      `SELECT h.*,
              (SELECT COUNT(*) FROM users u WHERE u.hospital_id = h.id) AS total_staff,
              (SELECT COUNT(*) FROM patients p WHERE p.hospital_id = h.id) AS total_patients
       FROM hospitals h ${where}
       ORDER BY h.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return paginatedResponse(res, hospitals, buildPagination(total, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to fetch hospitals: ' + error.message);
  }
};

// POST /api/super-admin/hospitals
const createHospital = async (req, res) => {
  try {
    const { name, address, phone, email, license_no, bed_capacity, website, settings } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO hospitals (name, address, phone, email, license_no, bed_capacity, website, settings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, address, phone, email, license_no, bed_capacity || 0, website, 
       settings ? JSON.stringify(settings) : null]
    );

    await auditLog({
      userId: req.user.id,
      action: 'CREATE_HOSPITAL',
      entity: 'hospitals',
      newValues: { name, email, license_no },
      req,
    });

    const [newHospital] = await pool.execute(`SELECT * FROM hospitals WHERE id = LAST_INSERT_ID()`);

    return successResponse(res, newHospital[0], 'Hospital created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create hospital: ' + error.message);
  }
};

// PUT /api/super-admin/hospitals/:id
const updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, bed_capacity, website, is_active, settings } = req.body;

    const [existing] = await pool.execute(`SELECT * FROM hospitals WHERE id = ?`, [id]);
    if (!existing.length) return errorResponse(res, 'Hospital not found', 404);

    await pool.execute(
      `UPDATE hospitals SET name=?, address=?, phone=?, email=?, bed_capacity=?,
       website=?, is_active=?, settings=?, updated_at=NOW()
       WHERE id = ?`,
      [name, address, phone, email, bed_capacity, website, is_active,
       settings ? JSON.stringify(settings) : existing[0].settings, id]
    );

    await auditLog({
      userId: req.user.id,
      action: 'UPDATE_HOSPITAL',
      entity: 'hospitals',
      entityId: id,
      oldValues: existing[0],
      newValues: req.body,
      req,
    });

    const [updated] = await pool.execute(`SELECT * FROM hospitals WHERE id = ?`, [id]);
    return successResponse(res, updated[0], 'Hospital updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update hospital: ' + error.message);
  }
};

// DELETE /api/super-admin/hospitals/:id (soft delete = deactivate)
const deactivateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(`UPDATE hospitals SET is_active = FALSE WHERE id = ?`, [id]);

    await auditLog({
      userId: req.user.id,
      action: 'DEACTIVATE_HOSPITAL',
      entity: 'hospitals',
      entityId: id,
      req,
    });

    return successResponse(res, {}, 'Hospital deactivated');
  } catch (error) {
    return errorResponse(res, 'Failed to deactivate: ' + error.message);
  }
};

// ── HOSPITAL ADMIN MANAGEMENT ───────────────────────────

// POST /api/super-admin/hospitals/:hospitalId/admins
const createHospitalAdmin = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { first_name, last_name, email, password, phone, gender } = req.body;

    // Verify hospital exists
    const [hospital] = await pool.execute(`SELECT id FROM hospitals WHERE id = ? AND is_active = TRUE`, [hospitalId]);
    if (!hospital.length) return errorResponse(res, 'Hospital not found or inactive', 404);

    // Get hospital_admin role
    const [[role]] = await pool.execute(`SELECT id FROM roles WHERE name = 'hospital_admin'`);

    const passwordHash = await bcrypt.hash(password, 12);
    const employeeId = `ADM-${Date.now()}`;

    await pool.execute(
      `INSERT INTO users (hospital_id, role_id, employee_id, first_name, last_name, email, password_hash, phone, gender, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [hospitalId, role.id, employeeId, first_name, last_name, email.toLowerCase(), passwordHash, phone, gender]
    );

    await auditLog({
      userId: req.user.id,
      action: 'CREATE_HOSPITAL_ADMIN',
      entity: 'users',
      newValues: { email, hospitalId },
      req,
    });

    return successResponse(res, { email, employeeId }, 'Hospital Admin created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create admin: ' + error.message);
  }
};

// ── SYSTEM STATS ─────────────────────────────────────────

// GET /api/super-admin/stats
const getSystemStats = async (req, res) => {
  try {
    const [[hospitals]] = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(is_active) AS active FROM hospitals`
    );
    const [[users]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users WHERE hospital_id IS NOT NULL`
    );
    const [[patients]] = await pool.execute(`SELECT COUNT(*) AS total FROM patients`);
    const [[appointments]] = await pool.execute(
      `SELECT COUNT(*) AS total, 
              SUM(status = 'completed') AS completed,
              SUM(status = 'scheduled') AS scheduled
       FROM appointments WHERE DATE(appointment_date) = CURDATE()`
    );

    return successResponse(res, {
      hospitals: { total: hospitals.total, active: hospitals.active },
      staff: { total: users.total },
      patients: { total: patients.total },
      todayAppointments: appointments,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to get stats: ' + error.message);
  }
};

// GET /api/super-admin/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, hospital_id, action } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (hospital_id) { where += ' AND al.hospital_id = ?'; params.push(hospital_id); }
    if (action) { where += ' AND al.action = ?'; params.push(action); }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM audit_logs al ${where}`, params
    );

    const [logs] = await pool.execute(
      `SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return paginatedResponse(res, logs, buildPagination(total, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to fetch audit logs: ' + error.message);
  }
};

module.exports = {
  getAllHospitals,
  createHospital,
  updateHospital,
  deactivateHospital,
  createHospitalAdmin,
  getSystemStats,
  getAuditLogs,
};
