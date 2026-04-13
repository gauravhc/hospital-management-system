const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "");
}

function normalizeTests(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v || "").trim()).filter(Boolean);
  }

  const raw = String(value || "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v || "").trim()).filter(Boolean);
    }
  } catch {
    // ignore
  }

  // Legacy fallbacks: comma/newline separated strings like "ECG, Blood Test"
  return raw
    .split(/[\n,]+/g)
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

async function pickDefaultAssigneeId(hospitalId) {
  if (!hospitalId) return null;
  const cols = await getTableColumns("nurses");
  if (!cols) return null;

  const idCol = firstExistingColumn(cols, ["id", "nurse_id", "user_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
  if (!idCol || !hospitalCol) return null;

  const rows = await query(
    `SELECT \`${idCol}\` AS id FROM nurses WHERE \`${hospitalCol}\` = ? ORDER BY \`${idCol}\` DESC LIMIT 1`,
    [hospitalId]
  );
  return rows[0]?.id ?? null;
}

async function resolveHospitalIdForRow(table, id, roleHint = "") {
  const cols = await getTableColumns(table);
  if (!cols) return null;

  const idCandidates =
    roleHint === "nurse"
      ? ["id", "nurse_id", "user_id"]
      : roleHint === "patient"
      ? ["id", "patient_id", "user_id"]
      : ["id"];

  const idCol = firstExistingColumn(cols, idCandidates);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  if (!idCol) return null;
  if (!hospitalCol) return null;

  const rows = await query(
    `SELECT \`${hospitalCol}\` AS hospital_id FROM \`${table}\` WHERE \`${idCol}\` = ? LIMIT 1`,
    [id]
  );
  return rows[0]?.hospital_id ?? null;
}

async function assignTask({ hospitalId, assignedBy, nurseId, patientId, taskTitle, description, treatment, tests, priority }) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const safeTests = normalizeTests(tests);
  const testsPayload = JSON.stringify(safeTests);

  const normalizedTreatment = String(treatment || "").trim();
  const normalizedDescription = String(description || "").trim();

  const record = {
    hospital_id: hospitalId ?? null,
    // nurse assignment is optional; nurses can accept later.
    nurse_id: nurseId ?? null,
    assigned_nurse_id: nurseId ?? null,
    patient_id: patientId,
    task_title: taskTitle,
    title: taskTitle,
    treatment: normalizedTreatment || null,
    // Always store structured JSON string.
    tests: testsPayload,
    // Keep notes separate: do NOT mix treatment/tests into description.
    description: normalizedDescription || null,
    priority: priority || "medium",
    assigned_by: assignedBy ?? null,
    status: "pending",
  };

  const insertCols = Object.keys(record).filter((key) => cols.has(key));
  const placeholders = insertCols.map(() => "?").join(", ");

  if (!insertCols.includes("patient_id")) {
    throw new Error("nurse_tasks schema missing required columns");
  }

  const result = await query(
    `INSERT INTO nurse_tasks (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    insertCols.map((c) => record[c])
  );

  return { id: result?.insertId || null };
}

async function getTaskById(taskId, hospitalId) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const idCol = firstExistingColumn(cols, ["id", "task_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  if (!idCol) throw new Error("nurse_tasks schema missing id");

  const where = [`\`${idCol}\` = ?`];
  const params = [taskId];
  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  const rows = await query(`SELECT * FROM nurse_tasks WHERE ${where.join(" AND ")} LIMIT 1`, params);
  return rows[0] || null;
}

async function acceptTask({ taskId, hospitalId, nurseId }) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const idCol = firstExistingColumn(cols, ["id", "task_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const nurseCol = firstExistingColumn(cols, ["assigned_nurse_id", "nurse_id"]);

  if (!idCol || !statusCol || !nurseCol) throw new Error("nurse_tasks schema missing required columns");

  const where = [`\`${idCol}\` = ?`];
  const params = [taskId];
  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  const task = await getTaskById(taskId, hospitalId);
  if (!task) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeStatus(task[statusCol] || "pending");
  const existingNurseId = task[nurseCol];

  if (current !== "pending") {
    const err = new Error(`Only pending tasks can be accepted (current: ${current || "unknown"})`);
    err.statusCode = 400;
    throw err;
  }

  if (existingNurseId && String(existingNurseId) !== String(nurseId)) {
    const err = new Error("Task already assigned to another nurse");
    err.statusCode = 409;
    throw err;
  }

  await query(
    `UPDATE nurse_tasks SET \`${nurseCol}\` = ?, \`${statusCol}\` = 'accepted' WHERE ${where.join(" AND ")}`,
    [nurseId, ...params]
  );

  return getTaskById(taskId, hospitalId);
}

async function startTask({ taskId, hospitalId, nurseId }) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const idCol = firstExistingColumn(cols, ["id", "task_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const nurseCol = firstExistingColumn(cols, ["assigned_nurse_id", "nurse_id"]);

  if (!idCol || !statusCol || !nurseCol) throw new Error("nurse_tasks schema missing required columns");

  const where = [`\`${idCol}\` = ?`];
  const params = [taskId];
  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  const task = await getTaskById(taskId, hospitalId);
  if (!task) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeStatus(task[statusCol] || "pending");
  if (current !== "accepted") {
    const err = new Error(`Invalid status transition: ${current} -> in_progress`);
    err.statusCode = 400;
    throw err;
  }
  if (!task[nurseCol] || String(task[nurseCol]) !== String(nurseId)) {
    const err = new Error("Only the assigned nurse can start this task");
    err.statusCode = 403;
    throw err;
  }

  await query(
    `UPDATE nurse_tasks SET \`${statusCol}\` = 'in_progress' WHERE ${where.join(" AND ")}`,
    params
  );

  return getTaskById(taskId, hospitalId);
}

async function completeTask({ taskId, hospitalId, nurseId }) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const idCol = firstExistingColumn(cols, ["id", "task_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const nurseCol = firstExistingColumn(cols, ["assigned_nurse_id", "nurse_id"]);

  if (!idCol || !statusCol || !nurseCol) throw new Error("nurse_tasks schema missing required columns");

  const where = [`\`${idCol}\` = ?`];
  const params = [taskId];
  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  const task = await getTaskById(taskId, hospitalId);
  if (!task) {
    const err = new Error("Task not found");
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeStatus(task[statusCol] || "pending");
  if (current !== "inprogress") {
    const err = new Error(`Invalid status transition: ${current} -> completed`);
    err.statusCode = 400;
    throw err;
  }
  if (!task[nurseCol] || String(task[nurseCol]) !== String(nurseId)) {
    const err = new Error("Only the assigned nurse can complete this task");
    err.statusCode = 403;
    throw err;
  }

  await query(
    `UPDATE nurse_tasks SET \`${statusCol}\` = 'completed' WHERE ${where.join(" AND ")}`,
    params
  );

  return getTaskById(taskId, hospitalId);
}

async function listPlansByPatient({ hospitalId, patientId, assignedBy = null } = {}) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const idCol = firstExistingColumn(cols, ["id"]);
  const patientCol = firstExistingColumn(cols, ["patient_id", "patientId"]);
  if (!patientCol) throw new Error("nurse_tasks schema missing patient_id");

  const createdAtCol = firstExistingColumn(cols, ["created_at", "createdAt"]);
  const titleCol = firstExistingColumn(cols, ["task_title", "title"]);
  const descriptionCol = firstExistingColumn(cols, ["description", "notes"]);
  const treatmentCol = firstExistingColumn(cols, ["treatment"]);
  const testsCol = firstExistingColumn(cols, ["tests"]);
  const priorityCol = firstExistingColumn(cols, ["priority"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const assignedByCol = firstExistingColumn(cols, ["assigned_by", "assignedBy"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);

  const select = [
    idCol ? `\`${idCol}\` AS id` : "NULL AS id",
    `\`${patientCol}\` AS patient_id`,
    titleCol ? `\`${titleCol}\` AS title` : "NULL AS title",
    treatmentCol ? `\`${treatmentCol}\` AS treatment` : "NULL AS treatment",
    testsCol ? `\`${testsCol}\` AS tests` : "NULL AS tests",
    descriptionCol ? `\`${descriptionCol}\` AS description` : "NULL AS description",
    priorityCol ? `\`${priorityCol}\` AS priority` : "'medium' AS priority",
    statusCol ? `\`${statusCol}\` AS status` : "'pending' AS status",
    assignedByCol ? `\`${assignedByCol}\` AS assigned_by` : "NULL AS assigned_by",
    createdAtCol ? `\`${createdAtCol}\` AS created_at` : "NULL AS created_at",
  ];

  const whereParts = [`\`${patientCol}\` = ?`];
  const params = [patientId];

  if (hospitalId && hospitalCol) {
    whereParts.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  if (assignedBy && assignedByCol) {
    whereParts.push(`\`${assignedByCol}\` = ?`);
    params.push(assignedBy);
  }

  const orderParts = [];
  if (createdAtCol) orderParts.push(`\`${createdAtCol}\` DESC`);
  if (idCol) orderParts.push(`\`${idCol}\` DESC`);
  const orderSql = orderParts.length ? ` ORDER BY ${orderParts.join(", ")}` : "";

  const rows = await query(
    `SELECT ${select.join(", ")} FROM nurse_tasks WHERE ${whereParts.join(" AND ")}${orderSql}`,
    params
  );

  return rows.map((row) => ({
    ...row,
    tests: normalizeTests(row?.tests),
  }));
}

module.exports = {
  pickDefaultAssigneeId,
  resolveHospitalIdForRow,
  assignTask,
  normalizeTests,
  acceptTask,
  startTask,
  completeTask,
  listPlansByPatient,
};
