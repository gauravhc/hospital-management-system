const { pool } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/response');
const { auditLog } = require('../utils/auditLog');

// GET /api/patients
const getAllPatients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', blood_group, status } = req.query;
    const offset = (page - 1) * limit;
    const hospitalId = req.user.hospital_id;

    let where = 'WHERE p.hospital_id = ?';
    const params = [hospitalId];

    if (search) {
      where += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone LIKE ? OR p.patient_id_no LIKE ? OR p.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (blood_group) { where += ' AND p.blood_group = ?'; params.push(blood_group); }
    if (status) { where += ' AND p.status = ?'; params.push(status); }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM patients p ${where}`, params
    );

    const [patients] = await pool.execute(
      `SELECT p.id, p.patient_id_no, p.first_name, p.last_name, p.email, p.phone,
              p.gender, p.date_of_birth, p.blood_group, p.status, p.registration_date,
              p.emergency_contact_name, p.emergency_contact_phone,
              TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS age,
              (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) AS total_visits
       FROM patients p ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return paginatedResponse(res, patients, buildPagination(total, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to fetch patients: ' + error.message);
  }
};

// GET /api/patients/:id
const getPatientById = async (req, res) => {
  try {
    const [patients] = await pool.execute(
      `SELECT p.*,
              TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS age
       FROM patients p
       WHERE p.id = ? AND p.hospital_id = ?`,
      [req.params.id, req.user.hospital_id]
    );

    if (!patients.length) return errorResponse(res, 'Patient not found', 404);

    // Get appointment history
    const [appointments] = await pool.execute(
      `SELECT a.id, a.appointment_date, a.appointment_time, a.type, a.status, a.chief_complaint,
              CONCAT(u.first_name, ' ', u.last_name) AS doctor_name, doc.specialization
       FROM appointments a
       JOIN doctors doc ON a.doctor_id = doc.id
       JOIN users u ON doc.user_id = u.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC
       LIMIT 10`,
      [req.params.id]
    );

    return successResponse(res, { ...patients[0], recent_appointments: appointments });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch patient: ' + error.message);
  }
};

// POST /api/patients
const createPatient = async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, gender, date_of_birth, blood_group, address,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      allergies, chronic_conditions, insurance_provider, insurance_policy_no
    } = req.body;

    const hospitalId = req.user.hospital_id;

    // Generate patient ID
    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM patients WHERE hospital_id = ?`, [hospitalId]
    );
    const patientIdNo = `PAT-${String(countRow.cnt + 1).padStart(6, '0')}`;

    await pool.execute(
      `INSERT INTO patients (hospital_id, patient_id_no, first_name, last_name, email, phone, gender, date_of_birth,
        blood_group, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        allergies, chronic_conditions, insurance_provider, insurance_policy_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hospitalId, patientIdNo, first_name, last_name, email, phone, gender, date_of_birth,
       blood_group, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
       allergies, chronic_conditions, insurance_provider, insurance_policy_no]
    );

    await auditLog({
      hospitalId,
      userId: req.user.id,
      action: 'CREATE_PATIENT',
      entity: 'patients',
      newValues: { first_name, last_name, phone, patientIdNo },
      req,
    });

    return successResponse(res, { patientIdNo }, 'Patient registered successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to register patient: ' + error.message);
  }
};

// PUT /api/patients/:id
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      `SELECT id FROM patients WHERE id = ? AND hospital_id = ?`,
      [id, req.user.hospital_id]
    );
    if (!existing.length) return errorResponse(res, 'Patient not found', 404);

    const {
      first_name, last_name, email, phone, gender, date_of_birth, blood_group, address,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      allergies, chronic_conditions, insurance_provider, insurance_policy_no, status
    } = req.body;

    await pool.execute(
      `UPDATE patients SET first_name=?, last_name=?, email=?, phone=?, gender=?, date_of_birth=?,
        blood_group=?, address=?, emergency_contact_name=?, emergency_contact_phone=?,
        emergency_contact_relation=?, allergies=?, chronic_conditions=?,
        insurance_provider=?, insurance_policy_no=?, status=?
       WHERE id=?`,
      [first_name, last_name, email, phone, gender, date_of_birth, blood_group, address,
       emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
       allergies, chronic_conditions, insurance_provider, insurance_policy_no, status, id]
    );

    return successResponse(res, {}, 'Patient updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update patient: ' + error.message);
  }
};

// DELETE /api/patients/:id (soft delete)
const deletePatient = async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE patients SET status = 'inactive' WHERE id = ? AND hospital_id = ?`,
      [req.params.id, req.user.hospital_id]
    );
    if (!result.affectedRows) return errorResponse(res, 'Patient not found', 404);

    return successResponse(res, {}, 'Patient deactivated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete patient: ' + error.message);
  }
};

// GET /api/patients/search  — quick search (for appointment booking)
const searchPatients = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return errorResponse(res, 'Search query too short', 400);

    const [patients] = await pool.execute(
      `SELECT id, patient_id_no, first_name, last_name, phone, gender, date_of_birth
       FROM patients
       WHERE hospital_id = ? AND status = 'active'
         AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR patient_id_no LIKE ?)
       LIMIT 10`,
      [req.user.hospital_id, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
    );

    return successResponse(res, patients);
  } catch (error) {
    return errorResponse(res, 'Search failed: ' + error.message);
  }
};

module.exports = { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient, searchPatients };
