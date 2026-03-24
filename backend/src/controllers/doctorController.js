const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/response');
const { auditLog } = require('../utils/auditLog');

// GET /api/doctors  —  list doctors (public + hospital filtered)
const getAllDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', department_id, specialization, is_available } = req.query;
    const offset = (page - 1) * limit;

    // Hospital admins see only their hospital's doctors
    const hospitalId = req.user?.role === 'super_admin' ? req.query.hospital_id : req.user?.hospital_id;

    let where = 'WHERE 1=1';
    const params = [];

    if (hospitalId) { where += ' AND d.hospital_id = ?'; params.push(hospitalId); }
    if (department_id) { where += ' AND d.department_id = ?'; params.push(department_id); }
    if (specialization) { where += ' AND d.specialization LIKE ?'; params.push(`%${specialization}%`); }
    if (is_available !== undefined) { where += ' AND d.is_available = ?'; params.push(is_available === 'true' ? 1 : 0); }
    if (search) {
      where += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR d.specialization LIKE ? OR u.employee_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM doctors d JOIN users u ON d.user_id = u.id ${where}`,
      params
    );

    const [doctors] = await pool.execute(
      `SELECT d.id, d.specialization, d.qualification, d.experience_years, d.consultation_fee,
              d.available_days, d.available_time_from, d.available_time_to, d.max_patients_per_day,
              d.is_available, d.rating, d.total_reviews, d.license_number,
              u.id AS user_id, u.employee_id, u.first_name, u.last_name, u.email, u.phone,
              u.gender, u.profile_image, u.status,
              dept.name AS department_name, dept.id AS department_id
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dept ON d.department_id = dept.id
       ${where}
       ORDER BY u.first_name ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Parse JSON fields
    const formatted = doctors.map(doc => ({
      ...doc,
      available_days: doc.available_days ? JSON.parse(doc.available_days) : [],
    }));

    return paginatedResponse(res, formatted, buildPagination(total, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to fetch doctors: ' + error.message);
  }
};

// GET /api/doctors/:id
const getDoctorById = async (req, res) => {
  try {
    const [doctors] = await pool.execute(
      `SELECT d.*, u.employee_id, u.first_name, u.last_name, u.email, u.phone,
              u.gender, u.profile_image, u.status, u.date_of_birth,
              dept.name AS department_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dept ON d.department_id = dept.id
       WHERE d.id = ?`,
      [req.params.id]
    );

    if (!doctors.length) return errorResponse(res, 'Doctor not found', 404);

    const doctor = doctors[0];
    doctor.available_days = doctor.available_days ? JSON.parse(doctor.available_days) : [];

    return successResponse(res, doctor);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch doctor: ' + error.message);
  }
};

// POST /api/doctors  — create doctor + user account
const createDoctor = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      first_name, last_name, email, phone, password, gender, date_of_birth,
      department_id, specialization, qualification, experience_years,
      consultation_fee, available_days, available_time_from, available_time_to,
      max_patients_per_day, license_number, bio
    } = req.body;

    const hospitalId = req.user.hospital_id;

    // Get doctor role
    const [[role]] = await connection.execute(`SELECT id FROM roles WHERE name = 'doctor'`);
    const passwordHash = await bcrypt.hash(password || 'Doctor@123', 12);
    const employeeId = `DOC-${Date.now()}`;

    // Create user
    const [userResult] = await connection.execute(
      `INSERT INTO users (hospital_id, role_id, employee_id, first_name, last_name, email, password_hash, phone, gender, date_of_birth, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [hospitalId, role.id, employeeId, first_name, last_name, email.toLowerCase(), passwordHash, phone, gender, date_of_birth]
    );

    // Get inserted user ID
    const [[newUser]] = await connection.execute(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);

    // Create doctor profile
    await connection.execute(
      `INSERT INTO doctors (user_id, hospital_id, department_id, specialization, qualification,
        experience_years, consultation_fee, available_days, available_time_from, available_time_to,
        max_patients_per_day, license_number, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newUser.id, hospitalId, department_id || null, specialization, qualification,
       experience_years || 0, consultation_fee || 0,
       available_days ? JSON.stringify(available_days) : null,
       available_time_from, available_time_to, max_patients_per_day || 20,
       license_number, bio]
    );

    await connection.commit();

    await auditLog({
      hospitalId,
      userId: req.user.id,
      action: 'CREATE_DOCTOR',
      entity: 'doctors',
      newValues: { email, specialization },
      req,
    });

    return successResponse(res, { email, employeeId }, 'Doctor created successfully', 201);
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 'Failed to create doctor: ' + error.message);
  } finally {
    connection.release();
  }
};

// PUT /api/doctors/:id
const updateDoctor = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [existing] = await connection.execute(
      `SELECT d.*, u.id AS user_id FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ? AND d.hospital_id = ?`,
      [id, req.user.hospital_id]
    );
    if (!existing.length) return errorResponse(res, 'Doctor not found', 404);

    const {
      first_name, last_name, phone, gender, date_of_birth,
      department_id, specialization, qualification, experience_years,
      consultation_fee, available_days, available_time_from, available_time_to,
      max_patients_per_day, license_number, bio, is_available
    } = req.body;

    await connection.execute(
      `UPDATE users SET first_name=?, last_name=?, phone=?, gender=?, date_of_birth=? WHERE id=?`,
      [first_name, last_name, phone, gender, date_of_birth, existing[0].user_id]
    );

    await connection.execute(
      `UPDATE doctors SET department_id=?, specialization=?, qualification=?, experience_years=?,
        consultation_fee=?, available_days=?, available_time_from=?, available_time_to=?,
        max_patients_per_day=?, license_number=?, bio=?, is_available=?
       WHERE id=?`,
      [department_id, specialization, qualification, experience_years, consultation_fee,
       available_days ? JSON.stringify(available_days) : null,
       available_time_from, available_time_to, max_patients_per_day,
       license_number, bio, is_available, id]
    );

    await connection.commit();
    return successResponse(res, {}, 'Doctor updated successfully');
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 'Failed to update doctor: ' + error.message);
  } finally {
    connection.release();
  }
};

// DELETE /api/doctors/:id (soft delete)
const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const [doctor] = await pool.execute(
      `SELECT user_id FROM doctors WHERE id = ? AND hospital_id = ?`,
      [id, req.user.hospital_id]
    );
    if (!doctor.length) return errorResponse(res, 'Doctor not found', 404);

    await pool.execute(`UPDATE users SET status = 'inactive' WHERE id = ?`, [doctor[0].user_id]);

    await auditLog({
      hospitalId: req.user.hospital_id,
      userId: req.user.id,
      action: 'DELETE_DOCTOR',
      entity: 'doctors',
      entityId: id,
      req,
    });

    return successResponse(res, {}, 'Doctor deactivated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete doctor: ' + error.message);
  }
};

// GET /api/doctors/:id/schedule  — doctor's availability slots for a date
const getDoctorSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) return errorResponse(res, 'Date is required', 400);

    const [[doctor]] = await pool.execute(
      `SELECT available_time_from, available_time_to, max_patients_per_day FROM doctors WHERE id = ?`,
      [id]
    );
    if (!doctor) return errorResponse(res, 'Doctor not found', 404);

    // Get booked slots
    const [booked] = await pool.execute(
      `SELECT appointment_time, token_number, status
       FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('cancelled', 'no_show')`,
      [id, date]
    );

    return successResponse(res, {
      available_from: doctor.available_time_from,
      available_to: doctor.available_time_to,
      max_patients: doctor.max_patients_per_day,
      booked_slots: booked,
      available_slots: doctor.max_patients_per_day - booked.length,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to get schedule: ' + error.message);
  }
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorSchedule,
};
