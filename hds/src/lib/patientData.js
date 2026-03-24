import db from "@/lib/db";

const DEFAULT_MEDICAL_HISTORY = {
  allergies: "",
  chronic_diseases: "",
  surgeries: "",
  medications: "",
  notes: "",
};

const DEFAULT_EMERGENCY = {
  contact_name: "",
  relation: "",
  phone: "",
};

const normalizeDate = (value) => {
  if (!value) return null;
  const raw = String(value);
  return raw.includes("T") ? raw.split("T")[0] : raw;
};

export const ensurePatientSupportTables = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS patient_documents (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100) NULL,
      file_size INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_patient_documents_patient_id (patient_id)
    )
  `);
};

export const resolvePatientForUser = async (user) => {
  if (!user?.id && !user?.email) return null;

  const params = [];
  const conditions = [];

  if (user?.id) {
    conditions.push("id = ?");
    params.push(user.id);
  }
  if (user?.email) {
    conditions.push("LOWER(email) = LOWER(?)");
    params.push(user.email);
  }

  if (!conditions.length) return null;

  const [rows] = await db.query(
    `
      SELECT id, hospital_id, full_name, email, phone, gender, dob, blood_group, height, weight,
             address, profile_image, emergency_contact, emergency_name, status
      FROM patients
      WHERE ${conditions.join(" OR ")}
      ORDER BY id DESC
      LIMIT 1
    `,
    params
  );

  return rows[0] || null;
};

export const getPatientProfileBundle = async (user) => {
  await ensurePatientSupportTables();

  const patient = await resolvePatientForUser(user);
  if (!patient) return null;

  const [[medicalRow = DEFAULT_MEDICAL_HISTORY]] = await db.query(
    `
      SELECT allergies, chronic_diseases, surgeries, medications, notes
      FROM medical_history
      WHERE patient_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [patient.id]
  );

  const [[emergencyRow = DEFAULT_EMERGENCY]] = await db.query(
    `
      SELECT contact_name, relation, phone
      FROM emergency_contacts
      WHERE patient_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [patient.id]
  );

  const [documents] = await db.query(
    `
      SELECT id, file_name, original_name, file_path, mime_type, file_size, created_at
      FROM patient_documents
      WHERE patient_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [patient.id]
  );

  return {
    patient,
    medical_history: {
      allergies: medicalRow?.allergies || "",
      chronic_diseases: medicalRow?.chronic_diseases || "",
      surgeries: medicalRow?.surgeries || "",
      medications: medicalRow?.medications || "",
      notes: medicalRow?.notes || "",
    },
    emergency_contact: {
      contact_name: emergencyRow?.contact_name || patient.emergency_name || "",
      relation: emergencyRow?.relation || "",
      phone: emergencyRow?.phone || patient.emergency_contact || "",
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      file_name: doc.file_name,
      original_name: doc.original_name,
      file_path: doc.file_path,
      mime_type: doc.mime_type,
      file_size: doc.file_size,
      created_at: doc.created_at,
      url: doc.file_path,
    })),
  };
};

export const updatePatientProfile = async (user, payload) => {
  const patient = await resolvePatientForUser(user);
  if (!patient) {
    throw new Error("Patient record not found");
  }

  const values = {
    full_name: String(payload?.name || patient.full_name || "").trim(),
    phone: String(payload?.phone || patient.phone || "").trim(),
    gender: payload?.gender || null,
    dob: normalizeDate(payload?.dob),
    blood_group: payload?.blood_group || null,
    height: payload?.height || null,
    weight: payload?.weight || null,
    address: payload?.address || null,
  };

  await db.query(
    `
      UPDATE patients
      SET full_name = ?, phone = ?, gender = ?, dob = ?, blood_group = ?, height = ?, weight = ?, address = ?
      WHERE id = ?
    `,
    [
      values.full_name || null,
      values.phone || null,
      values.gender,
      values.dob,
      values.blood_group,
      values.height,
      values.weight,
      values.address,
      patient.id,
    ]
  );

  return resolvePatientForUser(user);
};

export const savePatientProfileImage = async (user, filename) => {
  const patient = await resolvePatientForUser(user);
  if (!patient) {
    throw new Error("Patient record not found");
  }

  await db.query("UPDATE patients SET profile_image = ? WHERE id = ?", [filename, patient.id]);
  return filename;
};

export const getPatientMedicalHistory = async (user) => {
  const patient = await resolvePatientForUser(user);
  if (!patient) return null;

  const [[row]] = await db.query(
    `
      SELECT id, allergies, chronic_diseases, surgeries, medications, notes
      FROM medical_history
      WHERE patient_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [patient.id]
  );

  return {
    patient_id: patient.id,
    ...DEFAULT_MEDICAL_HISTORY,
    ...(row || {}),
  };
};

export const savePatientMedicalHistory = async (user, payload) => {
  const patient = await resolvePatientForUser(user);
  if (!patient) {
    throw new Error("Patient record not found");
  }

  const [[existing]] = await db.query(
    "SELECT id FROM medical_history WHERE patient_id = ? ORDER BY id DESC LIMIT 1",
    [patient.id]
  );

  const values = [
    payload?.allergies || "",
    payload?.chronic_diseases || "",
    payload?.surgeries || "",
    payload?.medications || "",
    payload?.notes || "",
  ];

  if (existing?.id) {
    await db.query(
      `
        UPDATE medical_history
        SET allergies = ?, chronic_diseases = ?, surgeries = ?, medications = ?, notes = ?
        WHERE id = ?
      `,
      [...values, existing.id]
    );
  } else {
    await db.query(
      `
        INSERT INTO medical_history (patient_id, allergies, chronic_diseases, surgeries, medications, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [patient.id, ...values]
    );
  }

  return getPatientMedicalHistory(user);
};

export const getPatientEmergencyContact = async (user) => {
  const patient = await resolvePatientForUser(user);
  if (!patient) return null;

  const [[row]] = await db.query(
    `
      SELECT id, contact_name, relation, phone
      FROM emergency_contacts
      WHERE patient_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [patient.id]
  );

  return {
    patient_id: patient.id,
    ...DEFAULT_EMERGENCY,
    ...(row || {
      contact_name: patient.emergency_name || "",
      phone: patient.emergency_contact || "",
    }),
  };
};

export const savePatientEmergencyContact = async (user, payload) => {
  const patient = await resolvePatientForUser(user);
  if (!patient) {
    throw new Error("Patient record not found");
  }

  const [[existing]] = await db.query(
    "SELECT id FROM emergency_contacts WHERE patient_id = ? ORDER BY id DESC LIMIT 1",
    [patient.id]
  );

  const contactName = String(payload?.contact_name || "").trim();
  const relation = String(payload?.relation || "").trim();
  const phone = String(payload?.phone || "").trim();

  if (existing?.id) {
    await db.query(
      `
        UPDATE emergency_contacts
        SET contact_name = ?, relation = ?, phone = ?
        WHERE id = ?
      `,
      [contactName, relation, phone, existing.id]
    );
  } else {
    await db.query(
      `
        INSERT INTO emergency_contacts (patient_id, contact_name, relation, phone)
        VALUES (?, ?, ?, ?)
      `,
      [patient.id, contactName, relation, phone]
    );
  }

  await db.query(
    "UPDATE patients SET emergency_name = ?, emergency_contact = ? WHERE id = ?",
    [contactName || null, phone || null, patient.id]
  );

  return getPatientEmergencyContact(user);
};

export const getPatientDocuments = async (user) => {
  await ensurePatientSupportTables();
  const patient = await resolvePatientForUser(user);
  if (!patient) return [];

  const [rows] = await db.query(
    `
      SELECT id, file_name, original_name, file_path, mime_type, file_size, created_at
      FROM patient_documents
      WHERE patient_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [patient.id]
  );

  return rows.map((row) => ({
    id: row.id,
    file_name: row.file_name,
    original_name: row.original_name,
    file_path: row.file_path,
    mime_type: row.mime_type,
    file_size: row.file_size,
    created_at: row.created_at,
    url: row.file_path,
  }));
};

export const addPatientDocument = async (user, document) => {
  await ensurePatientSupportTables();
  const patient = await resolvePatientForUser(user);
  if (!patient) {
    throw new Error("Patient record not found");
  }

  const [result] = await db.query(
    `
      INSERT INTO patient_documents (patient_id, file_name, original_name, file_path, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      patient.id,
      document.file_name,
      document.original_name,
      document.file_path,
      document.mime_type || null,
      document.file_size || null,
    ]
  );

  return {
    id: result.insertId,
    patient_id: patient.id,
    ...document,
    url: document.file_path,
  };
};
