const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/response');
const { auditLog } = require('../utils/auditLog');

// GET /api/nurses
const getAllNurses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', department_id, shift } = req.query;
    const offset = (page - 1) * limit;
    const hospitalId = req.user.hospital_id;

    let where = 'WHERE n.hospital_id = ?';
    const params = [hospitalId];

    if (department_id) { where += ' AND n.department_id = ?'; params.push(department_id); }
    if (shift) { where += ' AND n.shift = ?'; params.push(shift); }
    if (search) {
      where += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.employee_id LIKE ? OR n.ward_assigned LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM nurses n JOIN users u ON n.user_id = u.id ${where}`,
      params
    );

    const [nurses] = await pool.execute(
      `SELECT n.id, n.qualification, n.license_number, n.shift, n.ward_assigned,
              n.experience_years, n.is_head_nurse,
              u.id AS user_id, u.employee_id, u.first_name, u.last_name, u.email,
              u.phone, u.gender, u.profile_image, u.status,
              dept.name AS department_name
       FROM nurses n
       JOIN users u ON n.user_id = u.id
       LEFT JOIN departments dept ON n.department_id = dept.id
       ${where}
       ORDER BY n.is_head_nurse DESC, u.first_name ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return paginatedResponse(res, nurses, buildPagination(total, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to fetch nurses: ' + error.message);
  }
};

// GET /api/nurses/:id
const getNurseById = async (req, res) => {
  try {
    const [nurses] = await pool.execute(
      `SELECT n.*, u.employee_id, u.first_name, u.last_name, u.email, u.phone,
              u.gender, u.profile_image, u.status, u.date_of_birth,
              dept.name AS department_name
       FROM nurses n
       JOIN users u ON n.user_id = u.id
       LEFT JOIN departments dept ON n.department_id = dept.id
       WHERE n.id = ? AND n.hospital_id = ?`,
      [req.params.id, req.user.hospital_id]
    );

    if (!nurses.length) return errorResponse(res, 'Nurse not found', 404);
    return successResponse(res, nurses[0]);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch nurse: ' + error.message);
  }
};

// POST /api/nurses
const createNurse = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      first_name, last_name, email, phone, password, gender, date_of_birth,
      department_id, qualification, license_number, shift, ward_assigned,
      experience_years, is_head_nurse
    } = req.body;

    const hospitalId = req.user.hospital_id;
    const [[role]] = await connection.execute(`SELECT id FROM roles WHERE name = 'nurse'`);
    const passwordHash = await bcrypt.hash(password || 'Nurse@123', 12);
    const employeeId = `NRS-${Date.now()}`;

    await connection.execute(
      `INSERT INTO users (hospital_id, role_id, employee_id, first_name, last_name, email, password_hash, phone, gender, date_of_birth, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [hospitalId, role.id, employeeId, first_name, last_name, email.toLowerCase(), passwordHash, phone, gender, date_of_birth]
    );

    const [[newUser]] = await connection.execute(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);

    await connection.execute(
      `INSERT INTO nurses (user_id, hospital_id, department_id, qualification, license_number, shift, ward_assigned, experience_years, is_head_nurse)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newUser.id, hospitalId, department_id || null, qualification, license_number, shift || 'morning', ward_assigned, experience_years || 0, is_head_nurse || false]
    );

    await connection.commit();

    await auditLog({ hospitalId, userId: req.user.id, action: 'CREATE_NURSE', entity: 'nurses', newValues: { email }, req });

    return successResponse(res, { email, employeeId }, 'Nurse created successfully', 201);
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 'Failed to create nurse: ' + error.message);
  } finally {
    connection.release();
  }
};

// PUT /api/nurses/:id
const updateNurse = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [existing] = await connection.execute(
      `SELECT n.*, u.id AS user_id FROM nurses n JOIN users u ON n.user_id = u.id WHERE n.id = ? AND n.hospital_id = ?`,
      [id, req.user.hospital_id]
    );
    if (!existing.length) return errorResponse(res, 'Nurse not found', 404);

    const { first_name, last_name, phone, gender, date_of_birth,
            department_id, qualification, license_number, shift, ward_assigned,
            experience_years, is_head_nurse } = req.body;

    await connection.execute(
      `UPDATE users SET first_name=?, last_name=?, phone=?, gender=?, date_of_birth=? WHERE id=?`,
      [first_name, last_name, phone, gender, date_of_birth, existing[0].user_id]
    );

    await connection.execute(
      `UPDATE nurses SET department_id=?, qualification=?, license_number=?, shift=?, ward_assigned=?, experience_years=?, is_head_nurse=?
       WHERE id=?`,
      [department_id, qualification, license_number, shift, ward_assigned, experience_years, is_head_nurse, id]
    );

    await connection.commit();
    return successResponse(res, {}, 'Nurse updated successfully');
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 'Failed to update nurse: ' + error.message);
  } finally {
    connection.release();
  }
};

// DELETE /api/nurses/:id (soft delete)
const deleteNurse = async (req, res) => {
  try {
    const [nurse] = await pool.execute(
      `SELECT user_id FROM nurses WHERE id = ? AND hospital_id = ?`,
      [req.params.id, req.user.hospital_id]
    );
    if (!nurse.length) return errorResponse(res, 'Nurse not found', 404);

    await pool.execute(`UPDATE users SET status = 'inactive' WHERE id = ?`, [nurse[0].user_id]);
    return successResponse(res, {}, 'Nurse deactivated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete nurse: ' + error.message);
  }
};

// GET /api/nurses/shift-schedule  — nurses grouped by shift for today
const getShiftSchedule = async (req, res) => {
  try {
    const [nurses] = await pool.execute(
      `SELECT n.shift, n.ward_assigned,
              u.first_name, u.last_name, u.employee_id, u.profile_image,
              dept.name AS department_name
       FROM nurses n
       JOIN users u ON n.user_id = u.id AND u.status = 'active'
       LEFT JOIN departments dept ON n.department_id = dept.id
       WHERE n.hospital_id = ?
       ORDER BY n.shift, dept.name`,
      [req.user.hospital_id]
    );

    const grouped = nurses.reduce((acc, nurse) => {
      if (!acc[nurse.shift]) acc[nurse.shift] = [];
      acc[nurse.shift].push(nurse);
      return acc;
    }, {});

    return successResponse(res, grouped);
  } catch (error) {
    return errorResponse(res, 'Failed to get shift schedule: ' + error.message);
  }
};

module.exports = { getAllNurses, getNurseById, createNurse, updateNurse, deleteNurse, getShiftSchedule };
