const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

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

async function assignTask({ hospitalId, assignedBy, nurseId, patientId, taskTitle, description, priority }) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const record = {
    hospital_id: hospitalId ?? null,
    nurse_id: nurseId,
    patient_id: patientId,
    task_title: taskTitle,
    title: taskTitle,
    description: description || null,
    priority: priority || "medium",
    assigned_by: assignedBy ?? null,
    status: "pending",
  };

  const insertCols = Object.keys(record).filter((key) => cols.has(key));
  const placeholders = insertCols.map(() => "?").join(", ");

  if (!insertCols.includes("nurse_id") || !insertCols.includes("patient_id")) {
    throw new Error("nurse_tasks schema missing required columns");
  }

  const result = await query(
    `INSERT INTO nurse_tasks (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    insertCols.map((c) => record[c])
  );

  return { id: result?.insertId || null };
}

module.exports = {
  resolveHospitalIdForRow,
  assignTask,
};

