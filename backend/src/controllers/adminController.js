const { pool } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/response');
const { auditLog } = require('../utils/auditLog');

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id;

    // Staff counts by department
    const [deptOverview] = await pool.execute(
      `SELECT d.name AS department, d.code,
              COUNT(DISTINCT u.id) AS total_staff,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent
       FROM departments d
       LEFT JOIN users u ON u.hospital_id = d.hospital_id
       LEFT JOIN attendance a ON a.user_id = u.id AND a.date = CURDATE()
       WHERE d.hospital_id = ?
       GROUP BY d.id, d.name, d.code`,
      [hospitalId]
    );

    // Today's appointments
    const [[apptStats]] = await pool.execute(
      `SELECT 
         COUNT(*) AS total,
         SUM(status = 'scheduled') AS scheduled,
         SUM(status = 'completed') AS completed,
         SUM(status = 'cancelled') AS cancelled
       FROM appointments
       WHERE hospital_id = ? AND appointment_date = CURDATE()`,
      [hospitalId]
    );

    // Total patients
    const [[patientStats]] = await pool.execute(
      `SELECT COUNT(*) AS total,
              SUM(DATE(created_at) = CURDATE()) AS new_today
       FROM patients WHERE hospital_id = ?`,
      [hospitalId]
    );

    // Total staff
    const [[staffStats]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users WHERE hospital_id = ? AND status = 'active'`,
      [hospitalId]
    );

    // Available ambulances
    const [[ambulanceStats]] = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(status = 'available') AS available
       FROM ambulances WHERE hospital_id = ?`,
      [hospitalId]
    );

    return successResponse(res, {
      departmentOverview: deptOverview,
      appointments: apptStats,
      patients: patientStats,
      staff: staffStats,
      ambulances: ambulanceStats,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to load dashboard: ' + error.message);
  }
};

// GET /api/admin/staff  — all staff for this hospital
const getAllStaff = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role, department_id, status } = req.query;
    const offset = (page - 1) * limit;
    const hospitalId = req.user.hospital_id;

    let where = `WHERE u.hospital_id = ?`;
    const params = [hospitalId];

    if (search) {
      where += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role) { where += ` AND r.name = ?`; params.push(role); }
    if (status) { where += ` AND u.status = ?`; params.push(status); }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users u JOIN roles r ON u.role_id = r.id ${where}`,
      params
    );

    const [staff] = await pool.execute(
      `SELECT u.id, u.employee_id, u.first_name, u.last_name, u.email, u.phone,
              u.gender, u.profile_image, u.status, u.last_login, u.created_at,
              r.name AS role, r.display_name AS role_display
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return paginatedResponse(res, staff, buildPagination(total, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to fetch staff: ' + error.message);
  }
};

// PUT /api/admin/staff/:userId/status
const updateStaffStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const hospitalId = req.user.hospital_id;

    const [user] = await pool.execute(
      `SELECT id, status FROM users WHERE id = ? AND hospital_id = ?`,
      [userId, hospitalId]
    );
    if (!user.length) return errorResponse(res, 'Staff not found', 404);

    await pool.execute(`UPDATE users SET status = ? WHERE id = ?`, [status, userId]);

    await auditLog({
      hospitalId,
      userId: req.user.id,
      action: 'UPDATE_STAFF_STATUS',
      entity: 'users',
      entityId: userId,
      oldValues: { status: user[0].status },
      newValues: { status },
      req,
    });

    return successResponse(res, {}, `Staff status updated to ${status}`);
  } catch (error) {
    return errorResponse(res, 'Failed to update status: ' + error.message);
  }
};

// GET /api/admin/departments
const getDepartments = async (req, res) => {
  try {
    const [depts] = await pool.execute(
      `SELECT d.*,
              COUNT(DISTINCT u.id) AS staff_count
       FROM departments d
       LEFT JOIN users u ON u.hospital_id = d.hospital_id
       WHERE d.hospital_id = ?
       GROUP BY d.id`,
      [req.user.hospital_id]
    );
    return successResponse(res, depts);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch departments: ' + error.message);
  }
};

// POST /api/admin/departments
const createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const hospitalId = req.user.hospital_id;

    await pool.execute(
      `INSERT INTO departments (hospital_id, name, code, description) VALUES (?, ?, ?, ?)`,
      [hospitalId, name, code, description]
    );

    return successResponse(res, {}, 'Department created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create department: ' + error.message);
  }
};

// GET /api/admin/hospital-settings
const getHospitalSettings = async (req, res) => {
  try {
    const [hospital] = await pool.execute(
      `SELECT id, name, address, phone, email, website, logo_url, bed_capacity, settings
       FROM hospitals WHERE id = ?`,
      [req.user.hospital_id]
    );
    if (!hospital.length) return errorResponse(res, 'Hospital not found', 404);

    return successResponse(res, hospital[0]);
  } catch (error) {
    return errorResponse(res, 'Failed to get settings: ' + error.message);
  }
};

// PUT /api/admin/hospital-settings
const updateHospitalSettings = async (req, res) => {
  try {
    const { name, address, phone, email, website, settings } = req.body;
    const hospitalId = req.user.hospital_id;

    await pool.execute(
      `UPDATE hospitals SET name=?, address=?, phone=?, email=?, website=?, settings=?
       WHERE id = ?`,
      [name, address, phone, email, website, JSON.stringify(settings), hospitalId]
    );

    await auditLog({
      hospitalId,
      userId: req.user.id,
      action: 'UPDATE_HOSPITAL_SETTINGS',
      entity: 'hospitals',
      entityId: hospitalId,
      newValues: req.body,
      req,
    });

    return successResponse(res, {}, 'Hospital settings updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update settings: ' + error.message);
  }
};

module.exports = {
  getDashboard,
  getAllStaff,
  updateStaffStatus,
  getDepartments,
  createDepartment,
  getHospitalSettings,
  updateHospitalSettings,
};
