const { pool } = require("../config/database");
const { successResponse, errorResponse } = require("../utils/response");

const ensureSupportTables = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS medical_history (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      allergies TEXT,
      chronic_diseases TEXT,
      surgeries TEXT,
      medications TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_medical_history_patient_id (patient_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      contact_name VARCHAR(100) NOT NULL,
      relation VARCHAR(50),
      phone VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_emergency_contacts_patient_id (patient_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS patient_documents (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100),
      file_size INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_patient_documents_patient_id (patient_id)
    )
  `);
};

const resolvePatient = async (user) => {
  const [rows] = await pool.execute(
    `
      SELECT id, first_name, last_name, email, phone, gender, date_of_birth, blood_group, address,
             emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
             allergies, chronic_conditions, hospital_id
      FROM patients
      WHERE hospital_id = ? AND LOWER(email) = LOWER(?)
      LIMIT 1
    `,
    [user.hospital_id, user.email]
  );

  return rows[0] || null;
};

const mapProfile = (patient, profileImage = "") => ({
  id: patient.id,
  name: `${patient.first_name || ""} ${patient.last_name || ""}`.trim(),
  email: patient.email || "",
  phone: patient.phone || "",
  gender: patient.gender || "",
  dob: patient.date_of_birth || null,
  blood_group: patient.blood_group || "",
  height: "",
  weight: "",
  address: patient.address || "",
  profile_image: profileImage || "",
});

const getProfile = async (req, res) => {
  try {
    const patient = await resolvePatient(req.user);
    if (!patient) return errorResponse(res, "Patient profile not found", 404);

    return successResponse(res, mapProfile(patient, req.user.profile_image || ""));
  } catch (error) {
    return errorResponse(res, "Failed to fetch patient profile: " + error.message);
  }
};

const updateProfile = async (req, res) => {
  try {
    const patient = await resolvePatient(req.user);
    if (!patient) return errorResponse(res, "Patient profile not found", 404);

    const fullName = String(req.body.name || "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstName = parts.shift() || patient.first_name;
    const lastName = parts.join(" ") || patient.last_name;

    await pool.execute(
      `
        UPDATE patients
        SET first_name = ?, last_name = ?, phone = ?, gender = ?, date_of_birth = ?,
            blood_group = ?, address = ?
        WHERE id = ?
      `,
      [
        firstName,
        lastName,
        req.body.phone || null,
        req.body.gender || null,
        req.body.dob || null,
        req.body.blood_group || null,
        req.body.address || null,
        patient.id,
      ]
    );

    const refreshed = await resolvePatient(req.user);
    return successResponse(res, mapProfile(refreshed, req.user.profile_image || ""), "Profile updated successfully");
  } catch (error) {
    return errorResponse(res, "Failed to update patient profile: " + error.message);
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, "Image file is required", 400);

    return successResponse(
      res,
      {
        profile_image: req.file.filename,
        profile_image_url: `/uploads/patients/${req.file.filename}`,
      },
      "Profile image uploaded successfully"
    );
  } catch (error) {
    return errorResponse(res, "Failed to upload profile image: " + error.message);
  }
};

const getMedicalHistory = async (req, res) => {
  try {
    await ensureSupportTables();
    const patient = await resolvePatient(req.user);
    if (!patient) return errorResponse(res, "Patient profile not found", 404);

    const [rows] = await pool.execute(
      `
        SELECT allergies, chronic_diseases, surgeries, medications, notes
        FROM medical_history
        WHERE patient_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [patient.id]
    );

    return successResponse(
      res,
      rows[0] || {
        allergies: "",
        chronic_diseases: "",
        surgeries: "",
        medications: "",
        notes: "",
      }
    );
  } catch (error) {
    return errorResponse(res, "Failed to fetch medical history: " + error.message);
  }
};

const saveMedicalHistory = async (req, res) => {
  try {
    await ensureSupportTables();
    const patient = await resolvePatient(req.user);
    if (!patient) return errorResponse(res, "Patient profile not found", 404);

    const [rows] = await pool.execute(
      "SELECT id FROM medical_history WHERE patient_id = ? ORDER BY id DESC LIMIT 1",
      [patient.id]
    );

    const values = [
      req.body.allergies || "",
      req.body.chronic_diseases || "",
      req.body.surgeries || "",
      req.body.medications || "",
      req.body.notes || "",
    ];

    if (rows[0]?.id) {
      await pool.execute(
        `
          UPDATE medical_history
          SET allergies = ?, chronic_diseases = ?, surgeries = ?, medications = ?, notes = ?
          WHERE id = ?
        `,
        [...values, rows[0].id]
      );
    } else {
      await pool.execute(
        `
          INSERT INTO medical_history (patient_id, allergies, chronic_diseases, surgeries, medications, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [patient.id, ...values]
      );
    }

    return successResponse(res, {}, "Medical history saved successfully");
  } catch (error) {
    return errorResponse(res, "Failed to save medical history: " + error.message);
  }
};

const getEmergencyContact = async (req, res) => {
  try {
    await ensureSupportTables();
    const patient = await resolvePatient(req.user);
    if (!patient) return errorResponse(res, "Patient profile not found", 404);

    const [rows] = await pool.execute(
      `
        SELECT contact_name, relation, phone
        FROM emergency_contacts
        WHERE patient_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [patient.id]
    );

    return successResponse(
      res,
      rows[0] || {
        contact_name: patient.emergency_contact_name || "",
        relation: patient.emergency_contact_relation || "",
        phone: patient.emergency_contact_phone || "",
      }
    );
  } catch (error) {
    return errorResponse(res, "Failed to fetch emergency contact: " + error.message);
  }
};

const saveEmergencyContact = async (req, res) => {
  try {
    await ensureSupportTables();
    const patient = await resolvePatient(req.user);
    if (!patient) return errorResponse(res, "Patient profile not found", 404);

    const [rows] = await pool.execute(
      "SELECT id FROM emergency_contacts WHERE patient_id = ? ORDER BY id DESC LIMIT 1",
      [patient.id]
    );

    const values = [
      req.body.contact_name || "",
      req.body.relation || "",
      req.body.phone || "",
    ];

    if (rows[0]?.id) {
      await pool.execute(
        "UPDATE emergency_contacts SET contact_name = ?, relation = ?, phone = ? WHERE id = ?",
        [...values, rows[0].id]
      );
    } else {
      await pool.execute(
        "INSERT INTO emergency_contacts (patient_id, contact_name, relation, phone) VALUES (?, ?, ?, ?)",
        [patient.id, ...values]
      );
    }

    await pool.execute(
      `
        UPDATE patients
        SET emergency_contact_name = ?, emergency_contact_relation = ?, emergency_contact_phone = ?
        WHERE id = ?
      `,
      [values[0], values[1], values[2], patient.id]
    );

    return successResponse(res, {}, "Emergency contact saved successfully");
  } catch (error) {
    return errorResponse(res, "Failed to save emergency contact: " + error.message);
  }
};

const getDocuments = async (req, res) => {
  try {
    await ensureSupportTables();
    const patient = await resolvePatient(req.user);
    if (!patient) return errorResponse(res, "Patient profile not found", 404);

    const [rows] = await pool.execute(
      `
        SELECT id, file_name, original_name, file_path, mime_type, file_size, created_at
        FROM patient_documents
        WHERE patient_id = ?
        ORDER BY created_at DESC, id DESC
      `,
      [patient.id]
    );

    return successResponse(res, rows);
  } catch (error) {
    return errorResponse(res, "Failed to fetch documents: " + error.message);
  }
};

const uploadDocument = async (req, res) => {
  try {
    await ensureSupportTables();
    const patient = await resolvePatient(req.user);
    if (!patient) return errorResponse(res, "Patient profile not found", 404);
    if (!req.file) return errorResponse(res, "Document file is required", 400);

    await pool.execute(
      `
        INSERT INTO patient_documents (patient_id, file_name, original_name, file_path, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        patient.id,
        req.file.filename,
        req.file.originalname,
        `/uploads/documents/${req.file.filename}`,
        req.file.mimetype,
        req.file.size,
      ]
    );

    return successResponse(
      res,
      {
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_path: `/uploads/documents/${req.file.filename}`,
      },
      "Document uploaded successfully"
    );
  } catch (error) {
    return errorResponse(res, "Failed to upload document: " + error.message);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImage,
  getMedicalHistory,
  saveMedicalHistory,
  getEmergencyContact,
  saveEmergencyContact,
  getDocuments,
  uploadDocument,
};
