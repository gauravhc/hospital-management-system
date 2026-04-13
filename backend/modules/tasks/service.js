const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

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

  const safeTests = Array.isArray(tests) ? tests.map((t) => String(t || "").trim()).filter(Boolean) : [];
  const testsPayload = safeTests.length ? JSON.stringify(safeTests) : null;

  const normalizedTreatment = String(treatment || "").trim();
  const normalizedDescription = String(description || "").trim();
  const combinedDescription = (() => {
    if (!normalizedTreatment && !testsPayload) return normalizedDescription || null;
    const lines = [];
    if (normalizedTreatment) lines.push(`Treatment: ${normalizedTreatment}`);
    if (safeTests.length) lines.push(`Tests: ${safeTests.join(", ")}`);
    if (normalizedDescription) lines.push(`Notes: ${normalizedDescription}`);
    return lines.join("\n");
  })();

  const record = {
    hospital_id: hospitalId ?? null,
    nurse_id: nurseId ?? null,
    patient_id: patientId,
    task_title: taskTitle,
    title: taskTitle,
    treatment: normalizedTreatment || null,
    tests: testsPayload,
    description: combinedDescription,
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

  return rows.map((row) => {
    let parsedTests = [];
    try {
      if (row?.tests) {
        const raw = String(row.tests);
        const asJson = JSON.parse(raw);
        if (Array.isArray(asJson)) parsedTests = asJson.map(String).filter(Boolean);
      }
    } catch {
      // ignore
    }

    return {
      ...row,
      tests: parsedTests.length ? parsedTests : row?.tests || null,
    };
  });
}

module.exports = {
  pickDefaultAssigneeId,
  resolveHospitalIdForRow,
  assignTask,
  listPlansByPatient,
};
