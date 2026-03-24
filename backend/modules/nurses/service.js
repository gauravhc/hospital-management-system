const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");
const usersService = require("../users/service");

async function list(hospitalId) {
  const nurseCols = await getTableColumns("nurses");
  if (!nurseCols) return [];

  const nurseIdCol = firstExistingColumn(nurseCols, ["id", "nurse_id"]);
  const nurseHospitalCol = firstExistingColumn(nurseCols, ["hospital_id"]);
  const deptCol = firstExistingColumn(nurseCols, ["department_id", "department"]);
  const nameCol = firstExistingColumn(nurseCols, ["full_name", "name"]);
  const emailCol = firstExistingColumn(nurseCols, ["email"]);
  const phoneCol = firstExistingColumn(nurseCols, ["phone", "mobile"]);

  const select = [
    nurseIdCol ? `n.\`${nurseIdCol}\` AS id` : "n.id AS id",
    nameCol ? `n.\`${nameCol}\` AS name` : "NULL AS name",
    emailCol ? `n.\`${emailCol}\` AS email` : "NULL AS email",
    phoneCol ? `n.\`${phoneCol}\` AS phone` : "NULL AS phone",
    deptCol ? `n.\`${deptCol}\` AS department` : "NULL AS department",
    nurseHospitalCol ? `n.\`${nurseHospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
  ];

  let sql = `SELECT ${select.join(", ")} FROM nurses n`;

  const whereParts = [];
  const params = [];
  if (hospitalId !== null && hospitalId !== undefined) {
    if (nurseHospitalCol) {
      whereParts.push(`n.\`${nurseHospitalCol}\` = ?`);
      params.push(hospitalId);
    }
  }

  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(" AND ")}`;
  }
  sql += ` ORDER BY n.id DESC`;

  return query(sql, params);
}

async function create(payload, hospitalId) {
  return usersService.create(
    {
      ...payload,
      role: "nurse",
    },
    hospitalId
  );
}

async function update(id, payload) {
  const nurseCols = await getTableColumns("nurses");
  if (!nurseCols) return;

  const updates = [];
  const params = [];
  const hospitalCol = firstExistingColumn(nurseCols, ["hospital_id"]);
  const deptCol = firstExistingColumn(nurseCols, ["department_id", "department"]);

  if (hospitalCol && payload.hospital_id !== undefined) {
    updates.push(`\`${hospitalCol}\` = ?`);
    params.push(payload.hospital_id ?? null);
  }
  if (deptCol && (payload.department_id !== undefined || payload.department !== undefined)) {
    updates.push(`\`${deptCol}\` = ?`);
    params.push(payload.department_id || payload.department || null);
  }

  if (!updates.length) return;
  params.push(id);
  await query(`UPDATE nurses SET ${updates.join(", ")} WHERE id = ?`, params);
}

function remove(id) { return query(`DELETE FROM nurses WHERE id = ?`, [id]); }
function tasks(id) { return query(`SELECT * FROM nurse_tasks WHERE nurse_id = ? ORDER BY created_at DESC`, [id]); }
async function createTask(nurseId, payload, hospitalId, assignedBy) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) return null;

  const resolvedTitle = payload.task_title || payload.title || payload.taskTitle || "";
  const resolvedDescription = payload.description || null;
  const resolvedStatus = payload.status || "pending";
  const resolvedPriority = payload.priority || "medium";
  const resolvedPatientId = payload.patient_id || payload.patientId || null;

  const record = {
    nurse_id: nurseId,
    hospital_id: hospitalId || payload.hospital_id || payload.hospitalId || null,
    patient_id: resolvedPatientId,
    task_title: resolvedTitle,
    title: resolvedTitle,
    description: resolvedDescription,
    status: resolvedStatus,
    priority: resolvedPriority,
    assigned_by: assignedBy || payload.assigned_by || payload.assignedBy || null,
    due_at: payload.due_at || payload.dueAt || null,
  };

  const insertCols = Object.keys(record).filter((key) => cols.has(key));
  const placeholders = insertCols.map(() => "?").join(", ");

  if (!insertCols.length) return null;

  return query(
    `INSERT INTO nurse_tasks (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    insertCols.map((c) => record[c])
  );
}

module.exports = { list, create, update, remove, tasks, createTask };
