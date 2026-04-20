const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");
const usersService = require("../users/service");

const columnTypeCache = new Map();

async function getColumnType(table, column) {
  if (!table || !column) return "";
  const key = `${table}.${column}`;
  if (columnTypeCache.has(key)) return columnTypeCache.get(key);

  try {
    const rows = await query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    const type = String(rows?.[0]?.Type || "");
    if (type) {
      columnTypeCache.set(key, type);
    }
    return type;
  } catch {
    return "";
  }
}

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
  const externalPatientIdCol = firstExistingColumn(patientCols, ["patient_id", "patient_id_no"]);
  const patientHospitalCol = firstExistingColumn(patientCols, ["hospital_id"]);
  const nameCol = firstExistingColumn(patientCols, ["full_name", "name"]);
  const firstNameCol = firstExistingColumn(patientCols, ["first_name", "firstname", "given_name"]);
  const lastNameCol = firstExistingColumn(patientCols, ["last_name", "lastname", "surname", "family_name"]);
  const phoneCol = firstExistingColumn(patientCols, ["phone", "mobile"]);
  const emailCol = firstExistingColumn(patientCols, ["email"]);
  const createdAtCol = firstExistingColumn(patientCols, ["created_at"]);

  const nameExpr = nameCol
    ? `p.\`${nameCol}\``
    : firstNameCol || lastNameCol
    ? `CONCAT_WS(' ', ${firstNameCol ? `p.\`${firstNameCol}\`` : "NULL"}, ${lastNameCol ? `p.\`${lastNameCol}\`` : "NULL"})`
    : "NULL";

  const select = [
    patientIdCol ? `p.\`${patientIdCol}\` AS id` : "p.id AS id",
    externalPatientIdCol ? `p.\`${externalPatientIdCol}\` AS patient_id` : `p.\`${patientIdCol || "id"}\` AS patient_id`,
    nameCol
      ? `p.\`${nameCol}\` AS name`
      : firstNameCol || lastNameCol
        ? `TRIM(CONCAT_WS(' ', ${firstNameCol ? `p.\`${firstNameCol}\`` : "''"}, ${lastNameCol ? `p.\`${lastNameCol}\`` : "''"})) AS name`
        : "NULL AS name",
    `${nameExpr} AS full_name`,
    phoneCol ? `p.\`${phoneCol}\` AS phone` : "NULL AS phone",
    phoneCol ? `p.\`${phoneCol}\` AS mobile` : "NULL AS mobile",
    emailCol ? `p.\`${emailCol}\` AS email` : "NULL AS email",
    patientHospitalCol ? `p.\`${patientHospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
  ];

  let sql = `SELECT ${select.join(", ")} FROM patients p`;

  const whereParts = [];
  const params = [];
  if (hospitalId !== null && hospitalId !== undefined) {
    if (patientHospitalCol) {
      // Legacy records can exist without a hospital mapping; include them for admin selection flows.
      whereParts.push(`(p.\`${patientHospitalCol}\` = ? OR p.\`${patientHospitalCol}\` IS NULL)`);
      params.push(hospitalId);
    }
  }

  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(" AND ")}`;
  }
  sql += createdAtCol ? ` ORDER BY p.\`${createdAtCol}\` DESC, p.\`${patientIdCol || "id"}\` DESC` : ` ORDER BY p.\`${patientIdCol || "id"}\` DESC`;

  return query(sql, params);
}

async function search(hospitalId, q, { limit = 20 } = {}) {
  const patientCols = await getTableColumns("patients");
  if (!patientCols) return [];

  const patientIdCol = firstExistingColumn(patientCols, ["id", "patient_id"]);
  if (!patientIdCol) return [];

  const patientHospitalCol = firstExistingColumn(patientCols, ["hospital_id"]);
  const nameCol = firstExistingColumn(patientCols, ["full_name", "name"]);
  const firstNameCol = firstExistingColumn(patientCols, ["first_name", "firstname", "given_name"]);
  const lastNameCol = firstExistingColumn(patientCols, ["last_name", "lastname", "surname", "family_name"]);
  const phoneCol = firstExistingColumn(patientCols, ["phone", "mobile"]);
  const emailCol = firstExistingColumn(patientCols, ["email"]);
  const patientNoCol = firstExistingColumn(patientCols, ["patient_id_no", "patient_no", "patient_code"]);

  const nameExpr = nameCol
    ? `p.\`${nameCol}\``
    : firstNameCol || lastNameCol
      ? `TRIM(CONCAT_WS(' ', ${firstNameCol ? `p.\`${firstNameCol}\`` : "''"}, ${lastNameCol ? `p.\`${lastNameCol}\`` : "''"}))`
      : "NULL";

  const select = [
    `p.\`${patientIdCol}\` AS id`,
    `${nameExpr} AS name`,
    emailCol ? `p.\`${emailCol}\` AS email` : "NULL AS email",
    phoneCol ? `p.\`${phoneCol}\` AS phone` : "NULL AS phone",
    patientHospitalCol ? `p.\`${patientHospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
  ];

  const whereParts = [];
  const params = [];

  if (hospitalId !== null && hospitalId !== undefined && patientHospitalCol) {
    // Include legacy/unassigned rows when hospital_id is nullable.
    whereParts.push(`(p.\`${patientHospitalCol}\` = ? OR p.\`${patientHospitalCol}\` IS NULL)`);
    params.push(hospitalId);
  }

  const raw = String(q || "").trim();
  if (raw) {
    const searchLike = `%${raw.toLowerCase()}%`;
    const orParts = [];

    // Allow searching by patient primary key (UUID or INT) as text.
    orParts.push(`LOWER(CAST(p.\`${patientIdCol}\` AS CHAR)) LIKE ?`);
    params.push(searchLike);

    if (nameCol || firstNameCol || lastNameCol) {
      orParts.push(`LOWER(${nameExpr}) LIKE ?`);
      params.push(searchLike);
    }

    if (emailCol) {
      orParts.push(`LOWER(p.\`${emailCol}\`) LIKE ?`);
      params.push(searchLike);
    }

    if (phoneCol) {
      orParts.push(`LOWER(CAST(p.\`${phoneCol}\` AS CHAR)) LIKE ?`);
      params.push(searchLike);
    }

    if (patientNoCol) {
      orParts.push(`LOWER(CAST(p.\`${patientNoCol}\` AS CHAR)) LIKE ?`);
      params.push(searchLike);
    }

    // If a purely numeric input, also allow exact id match for INT ids.
    if (/^\\d+$/.test(raw)) {
      orParts.push(`p.\`${patientIdCol}\` = ?`);
      params.push(Number(raw));
    }

    if (orParts.length) {
      whereParts.push(`(${orParts.join(" OR ")})`);
    }
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  // Prefer created_at if available for better UX on legacy/uuid schemas.
  const orderCol = patientCols.has("created_at") ? "created_at" : patientIdCol;
  const sql = `SELECT ${select.join(", ")} FROM patients p ${whereSql} ORDER BY p.\`${orderCol}\` DESC LIMIT ${safeLimit}`;
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
  const patientCols = await getTableColumns("patients");
  if (!patientCols) return null;

  const primaryIdCol = firstExistingColumn(patientCols, ["id"]);
  const externalPatientIdCol = firstExistingColumn(patientCols, ["patient_id", "patient_id_no"]);

  if (primaryIdCol) {
    const rows = await query(`SELECT * FROM patients WHERE \`${primaryIdCol}\` = ? LIMIT 1`, [id]);
    if (rows[0]) return rows[0];
  }

  if (externalPatientIdCol) {
    const rows = await query(`SELECT * FROM patients WHERE \`${externalPatientIdCol}\` = ? LIMIT 1`, [id]);
    if (rows[0]) return rows[0];
  }

  return null;
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

async function appointments(id) {
  const patientCols = (await getTableColumns("patients")) || new Set();
  const doctorCols = (await getTableColumns("doctors")) || new Set();
  const departmentCols = await getTableColumns("departments");

  const patientNameCol = firstExistingColumn(patientCols, ["full_name", "name"]);
  const doctorNameCol = firstExistingColumn(doctorCols, ["full_name", "name"]);
  const doctorDeptCol = firstExistingColumn(doctorCols, ["department"]);
  const doctorDeptIdCol = firstExistingColumn(doctorCols, ["department_id"]);

  const joins = [
    "FROM appointments a",
    "LEFT JOIN hospitals h ON h.id = a.hospital_id",
    "LEFT JOIN patients p ON p.id = a.patient_id",
    "LEFT JOIN doctors d ON d.id = a.doctor_id",
  ];

  if (!doctorDeptCol && doctorDeptIdCol && departmentCols?.has("id") && departmentCols.has("name")) {
    joins.push("LEFT JOIN departments dep ON dep.id = d.department_id");
  }

  const select = [
    "a.*",
    "h.name AS hospital_name",
    patientNameCol ? `p.\`${patientNameCol}\` AS patient_name` : "NULL AS patient_name",
    doctorNameCol ? `d.\`${doctorNameCol}\` AS doctor_name` : "NULL AS doctor_name",
    doctorDeptCol
      ? `d.\`${doctorDeptCol}\` AS doctor_department`
      : doctorDeptIdCol && departmentCols?.has("name")
        ? "dep.name AS doctor_department"
        : "NULL AS doctor_department",
  ];

  return query(
    `SELECT ${select.join(", ")}
     ${joins.join("\n")}
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

  const toBool = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const raw = String(value).trim().toLowerCase();
    if (!raw) return null;
    if (["yes", "y", "true", "1"].includes(raw)) return true;
    if (["no", "n", "false", "0"].includes(raw)) return false;
    return null;
  };

  const coerceYesNoForColumn = (columnType, value) => {
    const bool = toBool(value);
    if (bool === null) return null;

    const type = String(columnType || "").toLowerCase();
    if (!type) {
      // Fallback: numeric works for INT and is accepted by many ENUM setups ("1" => first enum value).
      return bool ? 1 : 0;
    }
    if (type.includes("tinyint") || type.includes("int") || type.includes("bit") || type.includes("boolean")) {
      return bool ? 1 : 0;
    }

    // For enums/varchars store "Yes"/"No" (or lowercase if the enum is lowercase).
    const useLower = type.includes("enum(") && type.includes("'yes'") && type.includes("'no'");
    return useLower ? (bool ? "yes" : "no") : bool ? "Yes" : "No";
  };

  const normalizeConditionType = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const allowed = ["Fever", "Diabetes", "BP", "Heart Disease", "Allergy", "Other"];
    const match = allowed.find((v) => v.toLowerCase() === raw.toLowerCase());
    return match || "Other";
  };

  values.patient_id = id;
  if (cols.has("hospital_id")) values.hospital_id = hospitalId || null;

  if (cols.has("condition_type")) {
    values.condition_type = normalizeConditionType(payload.condition_type ?? payload.conditionType);
  }
  if (cols.has("has_condition")) {
    const colType = await getColumnType(resolved.table, "has_condition");
    values.has_condition = coerceYesNoForColumn(colType, payload.has_condition ?? payload.hasCondition);
  }
  if (cols.has("follow_up")) {
    const colType = await getColumnType(resolved.table, "follow_up");
    values.follow_up = coerceYesNoForColumn(colType, payload.follow_up ?? payload.followUp);
  }
  if (cols.has("emergency_required")) {
    const colType = await getColumnType(resolved.table, "emergency_required");
    values.emergency_required = coerceYesNoForColumn(colType, payload.emergency_required ?? payload.emergencyRequired);
  }

  const conditionCol = firstExistingColumn(cols, ["condition", "diagnosis", "chronic_diseases"]);
  if (conditionCol) {
    values[conditionCol] =
      payload.condition ||
      payload.diagnosis ||
      payload.chronic_diseases ||
      values.condition_type ||
      null;
  }

  const medicationsCol = firstExistingColumn(cols, ["treatment", "medications", "medication"]);
  if (medicationsCol) values[medicationsCol] = payload.treatment || payload.medications || null;

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

async function listLabTests(patientId) {
  const resolved = await resolveTable(["lab_tests"]);
  if (!resolved) return [];
  const cols = resolved.cols;

  const patientCol = firstExistingColumn(cols, ["patient_id", "patientId"]);
  if (!patientCol) return [];

  const orderCol = cols.has("ordered_at")
    ? "ordered_at"
    : cols.has("created_at")
    ? "created_at"
    : cols.has("id")
    ? "id"
    : null;
  const orderSql = orderCol ? ` ORDER BY \`${orderCol}\` DESC` : "";

  return query(`SELECT * FROM \`${resolved.table}\` WHERE \`${patientCol}\` = ?${orderSql}`, [patientId]);
}

async function orderLabTest(patientId, payload = {}) {
  const resolved = await resolveTable(["lab_tests"]);
  if (!resolved) throw new Error("lab_tests table not found");
  const cols = resolved.cols;

  const record = {};
  const patientCol = firstExistingColumn(cols, ["patient_id", "patientId"]);
  if (!patientCol) throw new Error("lab_tests schema missing patient_id");
  record[patientCol] = patientId;

  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  if (hospitalCol) record[hospitalCol] = payload.hospital_id || null;

  const testNameCol = firstExistingColumn(cols, ["test_name", "name", "test"]);
  if (testNameCol) record[testNameCol] = payload.test_name || null;

  const testCodeCol = firstExistingColumn(cols, ["test_code", "code"]);
  if (testCodeCol) record[testCodeCol] = payload.test_code || null;

  const categoryCol = firstExistingColumn(cols, ["category", "department"]);
  if (categoryCol) record[categoryCol] = payload.category || null;

  const priceCol = firstExistingColumn(cols, ["price", "amount"]);
  if (priceCol) record[priceCol] = payload.price ?? 0;

  const notesCol = firstExistingColumn(cols, ["notes", "note", "remarks"]);
  if (notesCol) record[notesCol] = payload.notes || null;

  const statusCol = firstExistingColumn(cols, ["status"]);
  if (statusCol) record[statusCol] = payload.status || "ordered";

  const orderedAtCol = firstExistingColumn(cols, ["ordered_at"]);
  if (orderedAtCol) record[orderedAtCol] = new Date();

  const insertCols = Object.keys(record).filter((k) => cols.has(k));
  const placeholders = insertCols.map(() => "?").join(", ");
  const values = insertCols.map((k) => record[k]);

  const result = await query(
    `INSERT INTO \`${resolved.table}\` (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    values
  );

  return { id: result?.insertId ?? null };
}

module.exports = {
  list,
  search,
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
  listLabTests,
  orderLabTest,
};
