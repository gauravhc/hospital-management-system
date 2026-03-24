const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");
const usersService = require("../users/service");

async function resolveTable(candidates = []) {
  for (const table of candidates) {
    const cols = await getTableColumns(table);
    if (cols) return { table, cols };
  }
  return null;
}

async function list(hospitalId) {
  const patientCols = await getTableColumns("patients");
  if (!patientCols) return [];

  const patientIdCol = firstExistingColumn(patientCols, ["id", "patient_id"]);
  const patientHospitalCol = firstExistingColumn(patientCols, ["hospital_id"]);
  const nameCol = firstExistingColumn(patientCols, ["full_name", "name"]);
  const phoneCol = firstExistingColumn(patientCols, ["phone", "mobile"]);
  const emailCol = firstExistingColumn(patientCols, ["email"]);

  const select = [
    patientIdCol ? `p.\`${patientIdCol}\` AS id` : "p.id AS id",
    nameCol ? `p.\`${nameCol}\` AS name` : "NULL AS name",
    phoneCol ? `p.\`${phoneCol}\` AS phone` : "NULL AS phone",
    emailCol ? `p.\`${emailCol}\` AS email` : "NULL AS email",
    patientHospitalCol ? `p.\`${patientHospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
  ];

  let sql = `SELECT ${select.join(", ")} FROM patients p`;

  const whereParts = [];
  const params = [];
  if (hospitalId !== null && hospitalId !== undefined) {
    if (patientHospitalCol) {
      whereParts.push(`p.\`${patientHospitalCol}\` = ?`);
      params.push(hospitalId);
    }
  }

  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(" AND ")}`;
  }
  sql += ` ORDER BY p.created_at DESC, p.id DESC`;

  return query(sql, params);
}

async function create(payload, hospitalId) {
  return usersService.create(
    {
      ...payload,
      role: "patient",
    },
    hospitalId
  );
}

async function getById(id) {
  const rows = await query(`SELECT * FROM patients WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function update(id, payload) {
  const patientCols = await getTableColumns("patients");
  if (!patientCols) return;

  const updates = [];
  const params = [];

  const nameCol = firstExistingColumn(patientCols, ["full_name", "name"]);
  const emailCol = firstExistingColumn(patientCols, ["email"]);
  const phoneCol = firstExistingColumn(patientCols, ["phone", "mobile"]);
  const dobCol = firstExistingColumn(patientCols, ["dob", "date_of_birth"]);
  const genderCol = firstExistingColumn(patientCols, ["gender"]);

  if (nameCol && payload.name !== undefined) {
    updates.push(`\`${nameCol}\` = ?`);
    params.push(payload.name);
  }
  if (emailCol && payload.email !== undefined) {
    updates.push(`\`${emailCol}\` = ?`);
    params.push(payload.email);
  }
  if (phoneCol && payload.phone !== undefined) {
    updates.push(`\`${phoneCol}\` = ?`);
    params.push(payload.phone);
  }
  if (dobCol && (payload.dob !== undefined || payload.date_of_birth !== undefined)) {
    updates.push(`\`${dobCol}\` = ?`);
    params.push(payload.dob || payload.date_of_birth || null);
  }
  if (genderCol && payload.gender !== undefined) {
    updates.push(`\`${genderCol}\` = ?`);
    params.push(payload.gender);
  }

  if (!updates.length) return;
  params.push(id);
  await query(`UPDATE patients SET ${updates.join(", ")} WHERE id = ?`, params);
}

function remove(id) { return query(`DELETE FROM patients WHERE id = ?`, [id]); }

function appointments(id) {
  return query(
    `SELECT a.*, h.name AS hospital_name, p.full_name AS patient_name, d.full_name AS doctor_name
     FROM appointments a
     LEFT JOIN hospitals h ON h.id = a.hospital_id
     LEFT JOIN patients p ON p.id = a.patient_id
     LEFT JOIN doctors d ON d.id = a.doctor_id
     WHERE a.patient_id = ?
     ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
    [id]
  );
}

function labReports(id) {
  return query(`SELECT * FROM lab_reports WHERE patient_id = ? ORDER BY created_at DESC, id DESC`, [id]);
}

function bills(id) {
  return query(`SELECT * FROM invoices WHERE patient_id = ? ORDER BY created_at DESC, id DESC`, [id]);
}

async function documents(id) {
  const resolved = await resolveTable(["patient_documents", "documents"]);
  if (!resolved) return [];

  if (resolved.table === "patient_documents") {
    return query(`SELECT * FROM patient_documents WHERE patient_id = ? ORDER BY created_at DESC, id DESC`, [id]);
  }

  return query(`SELECT * FROM documents WHERE user_id = ? ORDER BY id DESC`, [id]);
}

async function medicalHistory(id) {
  const resolved = await resolveTable(["medical_history", "patient_medical_history"]);
  if (!resolved) return [];

  const orderCol = resolved.cols.has("created_at") ? "created_at" : resolved.cols.has("id") ? "id" : null;
  const orderSql = orderCol ? ` ORDER BY ${orderCol} DESC` : "";
  return query(`SELECT * FROM \`${resolved.table}\` WHERE patient_id = ?${orderSql}`, [id]);
}

async function addMedicalHistory(id, payload = {}, hospitalId = null) {
  const resolved = await resolveTable(["medical_history", "patient_medical_history"]);
  if (!resolved) throw new Error("medical_history table not found");

  const cols = resolved.cols;
  const values = {};

  values.patient_id = id;
  if (cols.has("hospital_id")) values.hospital_id = hospitalId || null;

  const conditionCol = firstExistingColumn(cols, ["condition", "diagnosis", "chronic_diseases"]);
  if (conditionCol) values[conditionCol] = payload.condition || payload.diagnosis || payload.chronic_diseases || null;

  const medicationsCol = firstExistingColumn(cols, ["medications", "treatment", "medication"]);
  if (medicationsCol) values[medicationsCol] = payload.medications || payload.treatment || null;

  const allergiesCol = firstExistingColumn(cols, ["allergies", "allergy"]);
  if (allergiesCol) values[allergiesCol] = payload.allergies || null;

  const notesCol = firstExistingColumn(cols, ["notes", "note"]);
  if (notesCol) values[notesCol] = payload.notes || null;

  const insertCols = Object.keys(values);
  const placeholders = insertCols.map(() => "?").join(", ");
  await query(
    `INSERT INTO \`${resolved.table}\` (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    insertCols.map((c) => values[c])
  );
}

async function addDocument(id, payload = {}, hospitalId = null) {
  const resolved = await resolveTable(["patient_documents", "documents"]);
  if (!resolved) throw new Error("patient_documents table not found");

  const cols = resolved.cols;
  const values = {};

  if (resolved.table === "patient_documents") {
    values.patient_id = id;
    if (cols.has("hospital_id")) values.hospital_id = hospitalId || null;

    // Name/title columns
    const titleCol = firstExistingColumn(cols, ["title", "document_name"]);
    if (titleCol) values[titleCol] = payload.document_name || payload.title || payload.original_name || null;

    // Physical file metadata
    if (cols.has("file_name")) values.file_name = payload.file_name || payload.file || payload.filename || null;
    if (cols.has("file_type")) values.file_type = payload.file_type || payload.mimetype || null;
    if (cols.has("file_size")) values.file_size = payload.file_size || null;

    // Path/url columns
    const pathCol = firstExistingColumn(cols, ["file_path", "file_url", "url", "path"]);
    if (pathCol) values[pathCol] = payload.file_path || payload.file_url || payload.url || null;

    // Some deployments have an `original_name` column (often NOT NULL) even if bootstrap schema doesn't.
    if (cols.has("original_name")) {
      values.original_name =
        payload.original_name ||
        payload.document_name ||
        payload.title ||
        null;
    }
  } else {
    values.user_id = id;
    if (cols.has("file_name")) values.file_name = payload.document_name || payload.title || payload.original_name || null;
    if (cols.has("file_path")) values.file_path = payload.file_path || payload.file_url || payload.url || null;
    if (cols.has("original_name")) {
      values.original_name = payload.original_name || payload.document_name || payload.title || null;
    }
    if (cols.has("file_type")) values.file_type = payload.file_type || payload.mimetype || null;
    if (cols.has("file_size")) values.file_size = payload.file_size || null;
  }

  const insertCols = Object.keys(values);
  if (!insertCols.length) return;
  const placeholders = insertCols.map(() => "?").join(", ");
  await query(
    `INSERT INTO \`${resolved.table}\` (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    insertCols.map((c) => values[c])
  );
}

async function deleteDocument(patientId, documentId) {
  const resolved = await resolveTable(["patient_documents", "documents"]);
  if (!resolved) throw new Error("patient_documents table not found");

  if (resolved.table === "patient_documents") {
    const rows = await query(
      `SELECT * FROM patient_documents WHERE id = ? AND patient_id = ? LIMIT 1`,
      [documentId, patientId]
    );
    if (!rows.length) return { deleted: 0, fileRef: null };
    const row = rows[0];

    const fileRef =
      row.file_path ||
      row.file_url ||
      row.url ||
      row.path ||
      row.document_path ||
      null;

    await query(`DELETE FROM patient_documents WHERE id = ? AND patient_id = ?`, [
      documentId,
      patientId,
    ]);

    return { deleted: 1, fileRef };
  }

  // Fallback legacy table
  const rows = await query(
    `SELECT * FROM documents WHERE id = ? AND user_id = ? LIMIT 1`,
    [documentId, patientId]
  );
  if (!rows.length) return { deleted: 0, fileRef: null };

  const row = rows[0];
  const fileRef = row.file_path || row.file_url || row.url || row.path || null;
  await query(`DELETE FROM documents WHERE id = ? AND user_id = ?`, [documentId, patientId]);
  return { deleted: 1, fileRef };
}

module.exports = {
  list,
  create,
  getById,
  update,
  remove,
  appointments,
  labReports,
  bills,
  documents,
  medicalHistory,
  addMedicalHistory,
  addDocument,
  deleteDocument,
};
