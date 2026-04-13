const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

function coalesce(...values) {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

async function getNurseProfile(nurseId) {
  const cols = await getTableColumns("nurses");
  if (!cols) return null;

  const idCol = firstExistingColumn(cols, ["id", "nurse_id", "user_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
  const emailCol = firstExistingColumn(cols, ["email"]);
  const fullNameCol = firstExistingColumn(cols, ["full_name", "name"]);
  const firstNameCol = firstExistingColumn(cols, ["first_name"]);
  const lastNameCol = firstExistingColumn(cols, ["last_name"]);
  const imageCol = firstExistingColumn(cols, ["profile_image_url", "profile_image", "avatar_url", "photo_url"]);

  if (!idCol) return null;

  const select = [
    `\`${idCol}\` AS id`,
    hospitalCol ? `\`${hospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
    emailCol ? `\`${emailCol}\` AS email` : "NULL AS email",
    fullNameCol ? `\`${fullNameCol}\` AS full_name` : "NULL AS full_name",
    firstNameCol ? `\`${firstNameCol}\` AS first_name` : "NULL AS first_name",
    lastNameCol ? `\`${lastNameCol}\` AS last_name` : "NULL AS last_name",
    imageCol ? `\`${imageCol}\` AS profile_image` : "NULL AS profile_image",
  ];

  const rows = await query(`SELECT ${select.join(", ")} FROM nurses WHERE \`${idCol}\` = ? LIMIT 1`, [nurseId]);
  const row = rows[0] || null;
  if (!row) return null;

  const resolvedName = coalesce(
    row.full_name,
    [row.first_name, row.last_name].filter(Boolean).join(" "),
    row.email
  );

  return {
    id: row.id,
    hospital_id: row.hospital_id ?? null,
    email: row.email || "",
    full_name: resolvedName || "",
    profile_image: row.profile_image || "",
  };
}

async function buildTasksQuery({ nurseId, hospitalId }) {
  const taskCols = await getTableColumns("nurse_tasks");
  if (!taskCols) return null;

  const taskIdCol = firstExistingColumn(taskCols, ["id", "task_id"]);
  const taskHospitalCol = firstExistingColumn(taskCols, ["hospital_id"]);
  const taskNurseCol = firstExistingColumn(taskCols, ["assigned_nurse_id", "nurse_id"]);
  const taskPatientCol = firstExistingColumn(taskCols, ["patient_id"]);
  const titleCol = firstExistingColumn(taskCols, ["task_title", "title"]);
  const descriptionCol = firstExistingColumn(taskCols, ["description"]);
  const treatmentCol = firstExistingColumn(taskCols, ["treatment"]);
  const testsCol = firstExistingColumn(taskCols, ["tests"]);
  const statusCol = firstExistingColumn(taskCols, ["status"]);
  const priorityCol = firstExistingColumn(taskCols, ["priority"]);
  const assignedByCol = firstExistingColumn(taskCols, ["assigned_by"]);
  const createdAtCol = firstExistingColumn(taskCols, ["created_at"]);

  if (!taskIdCol || !taskNurseCol) return null;

  // Patient join (best-effort across schemas)
  const patientCols = await getTableColumns("patients");
  const patientIdCol = patientCols ? firstExistingColumn(patientCols, ["id", "patient_id", "user_id"]) : null;
  const patientFullNameCol = patientCols ? firstExistingColumn(patientCols, ["full_name", "name"]) : null;
  const patientFirstNameCol = patientCols ? firstExistingColumn(patientCols, ["first_name"]) : null;
  const patientLastNameCol = patientCols ? firstExistingColumn(patientCols, ["last_name"]) : null;
  const patientPhoneCol = patientCols ? firstExistingColumn(patientCols, ["phone", "mobile"]) : null;

  const patientNameExpr = patientFullNameCol
    ? `p.\`${patientFullNameCol}\``
    : patientFirstNameCol || patientLastNameCol
    ? `CONCAT_WS(' ', ${patientFirstNameCol ? `p.\`${patientFirstNameCol}\`` : "NULL"}, ${patientLastNameCol ? `p.\`${patientLastNameCol}\`` : "NULL"})`
    : "NULL";

  const select = [
    `t.\`${taskIdCol}\` AS id`,
    taskHospitalCol ? `t.\`${taskHospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
    `t.\`${taskNurseCol}\` AS nurse_id`,
    taskPatientCol ? `t.\`${taskPatientCol}\` AS patient_id` : "NULL AS patient_id",
    titleCol ? `t.\`${titleCol}\` AS task_title` : "NULL AS task_title",
    treatmentCol ? `t.\`${treatmentCol}\` AS treatment` : "NULL AS treatment",
    testsCol ? `t.\`${testsCol}\` AS tests` : "NULL AS tests",
    descriptionCol ? `t.\`${descriptionCol}\` AS description` : "NULL AS description",
    statusCol ? `t.\`${statusCol}\` AS status` : "'pending' AS status",
    priorityCol ? `t.\`${priorityCol}\` AS priority` : "'medium' AS priority",
    assignedByCol ? `t.\`${assignedByCol}\` AS assigned_by` : "NULL AS assigned_by",
    createdAtCol ? `t.\`${createdAtCol}\` AS created_at` : "NULL AS created_at",
  ];

  const joins = [];
  if (patientCols && taskPatientCol && patientIdCol) {
    joins.push(`LEFT JOIN patients p ON p.\`${patientIdCol}\` = t.\`${taskPatientCol}\``);
    select.push(`${patientNameExpr} AS patient_name`);
    select.push(patientPhoneCol ? `p.\`${patientPhoneCol}\` AS patient_phone` : "NULL AS patient_phone");
  } else {
    select.push("NULL AS patient_name");
    select.push("NULL AS patient_phone");
  }

  const where = [];
  const params = [];

  if (taskHospitalCol && hospitalId) {
    where.push(`t.\`${taskHospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  // Nurses should see:
  // - unassigned tasks for their hospital (pending)
  // - tasks accepted/started by themselves
  where.push(`(t.\`${taskNurseCol}\` IS NULL OR t.\`${taskNurseCol}\` = ?)`);
  params.push(nurseId);

  const sql = `SELECT ${select.join(", ")}
    FROM nurse_tasks t
    ${joins.join("\n")}
    WHERE ${where.join(" AND ")}
    ORDER BY ${createdAtCol ? `t.\`${createdAtCol}\`` : `t.\`${taskIdCol}\``} DESC`;

  return { sql, params };
}

async function listTasks({ nurseId, hospitalId }) {
  const built = await buildTasksQuery({ nurseId, hospitalId });
  if (!built) return [];
  const rows = await query(built.sql, built.params);

  const normalizeTests = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    const raw = String(value || "").trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v || "").trim()).filter(Boolean);
    } catch {
      // ignore
    }
    return raw
      .split(/[\n,]+/g)
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  };

  return rows.map((row) => ({
    ...row,
    tests: normalizeTests(row?.tests),
  }));
}

async function updateTaskStatus({ taskId, nurseId, hospitalId, status }) {
  const taskCols = await getTableColumns("nurse_tasks");
  if (!taskCols) return { updated: false };

  const taskIdCol = firstExistingColumn(taskCols, ["id", "task_id"]);
  const taskNurseCol = firstExistingColumn(taskCols, ["nurse_id"]);
  const taskHospitalCol = firstExistingColumn(taskCols, ["hospital_id"]);
  const statusCol = firstExistingColumn(taskCols, ["status"]);
  if (!taskIdCol || !taskNurseCol || !statusCol) return { updated: false };

  const where = [`\`${taskIdCol}\` = ?`, `\`${taskNurseCol}\` = ?`];
  const params = [taskId, nurseId];
  if (taskHospitalCol && hospitalId) {
    where.push(`\`${taskHospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  const result = await query(
    `UPDATE nurse_tasks SET \`${statusCol}\` = ? WHERE ${where.join(" AND ")}`,
    [status, ...params]
  );

  return { updated: Boolean(result?.affectedRows) };
}

async function ensurePatientInHospital({ patientId, hospitalId }) {
  if (!hospitalId) return true;
  const patientCols = await getTableColumns("patients");
  if (!patientCols) return false;

  const patientIdCol = firstExistingColumn(patientCols, ["id", "patient_id", "user_id"]);
  const patientHospitalCol = firstExistingColumn(patientCols, ["hospital_id"]);
  if (!patientIdCol) return false;
  if (!patientHospitalCol) return true;

  const rows = await query(
    `SELECT \`${patientHospitalCol}\` AS hospital_id FROM patients WHERE \`${patientIdCol}\` = ? LIMIT 1`,
    [patientId]
  );
  if (!rows.length) return false;
  if (!rows[0]?.hospital_id) return true;
  return String(rows[0].hospital_id) === String(hospitalId);
}

async function addVitals({ nurseId, hospitalId, payload }) {
  const cols = await getTableColumns("patient_vitals");
  if (!cols) throw new Error("patient_vitals table not found");

  const patientId = payload.patient_id;
  if (!patientId) throw new Error("patient_id is required");

  const allowed = await ensurePatientInHospital({ patientId, hospitalId });
  if (!allowed) throw new Error("Patient not found for your hospital");

  const insert = {
    patient_id: patientId,
    nurse_id: nurseId,
    blood_pressure: payload.blood_pressure || null,
    heart_rate: payload.heart_rate ?? null,
    temperature: payload.temperature ?? null,
    spo2: payload.spo2 ?? null,
    weight: payload.weight ?? null,
  };

  const insertCols = Object.keys(insert).filter((key) => cols.has(key));
  const placeholders = insertCols.map(() => "?").join(", ");

  const result = await query(
    `INSERT INTO patient_vitals (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    insertCols.map((c) => insert[c])
  );

  return { id: result?.insertId || result?.insertId === 0 ? result.insertId : result?.insertId || null };
}

async function listVitals({ nurseId, hospitalId, patientId }) {
  const cols = await getTableColumns("patient_vitals");
  if (!cols) return [];

  const allowed = await ensurePatientInHospital({ patientId, hospitalId });
  if (!allowed) return [];

  const nurseCol = cols.has("nurse_id") ? "nurse_id" : null;
  const patientCol = cols.has("patient_id") ? "patient_id" : null;
  const recordedAtCol = cols.has("recorded_at") ? "recorded_at" : null;
  if (!patientCol) return [];

  const where = [`\`${patientCol}\` = ?`];
  const params = [patientId];
  if (nurseCol) {
    where.push(`\`${nurseCol}\` = ?`);
    params.push(nurseId);
  }

  const order = recordedAtCol ? `ORDER BY \`${recordedAtCol}\` DESC` : "ORDER BY id DESC";
  return query(`SELECT * FROM patient_vitals WHERE ${where.join(" AND ")} ${order}`, params);
}

module.exports = {
  getNurseProfile,
  listTasks,
  updateTaskStatus,
  addVitals,
  listVitals,
};
