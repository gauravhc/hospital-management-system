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

function normalizeNote(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.length > 5000 ? trimmed.slice(0, 5000) : trimmed;
}

async function updateNurseNotesIfProvided({ cols, taskId, hospitalId, nurseId, notes }) {
  const notesCol = firstExistingColumn(cols, ["nurse_notes"]);
  if (!notesCol) return;

  const safeNotes = normalizeNote(notes);
  if (!safeNotes) return;

  const idCol = firstExistingColumn(cols, ["id", "task_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  const nurseCol = firstExistingColumn(cols, ["assigned_nurse_id", "nurse_id"]);
  if (!idCol || !nurseCol) return;

  const where = [`\`${idCol}\` = ?`, `\`${nurseCol}\` = ?`];
  const params = [taskId, nurseId];
  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  await query(
    `UPDATE nurse_tasks SET \`${notesCol}\` = ? WHERE ${where.join(" AND ")}`,
    [safeNotes, ...params]
  );
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
    doctor_id: assignedBy ?? null,
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

async function acceptTask({ taskId, hospitalId, nurseId, notes = null }) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const idCol = firstExistingColumn(cols, ["id", "task_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const assignedNurseCol = firstExistingColumn(cols, ["assigned_nurse_id"]);
  const nurseCol = firstExistingColumn(cols, ["nurse_id"]);
  const effectiveNurseCol = assignedNurseCol || nurseCol;

  if (!idCol || !statusCol || !effectiveNurseCol) throw new Error("nurse_tasks schema missing required columns");

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
  const existingNurseId = task[effectiveNurseCol];

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

  const updateParts = [];
  const updateParams = [];

  // Keep both columns in sync when both exist.
  if (assignedNurseCol) {
    updateParts.push(`\`${assignedNurseCol}\` = ?`);
    updateParams.push(nurseId);
  }
  if (nurseCol) {
    updateParts.push(`\`${nurseCol}\` = ?`);
    updateParams.push(nurseId);
  }
  updateParts.push(`\`${statusCol}\` = 'accepted'`);

  const acceptWhere = [...where, `\`${statusCol}\` = 'pending'`, `(\`${effectiveNurseCol}\` IS NULL OR \`${effectiveNurseCol}\` = ?)`];
  const acceptParams = [...updateParams, ...params, nurseId];

  const result = await query(
    `UPDATE nurse_tasks SET ${updateParts.join(", ")} WHERE ${acceptWhere.join(" AND ")}`,
    acceptParams
  );

  if (!result?.affectedRows) {
    const latest = await getTaskById(taskId, hospitalId);
    const err = new Error("Task already taken");
    err.statusCode = 409;
    err.data = latest;
    throw err;
  }

  await updateNurseNotesIfProvided({ cols, taskId, hospitalId, nurseId, notes });
  return getTaskById(taskId, hospitalId);
}

async function startTask({ taskId, hospitalId, nurseId, notes = null }) {
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

  await updateNurseNotesIfProvided({ cols, taskId, hospitalId, nurseId, notes });
  return getTaskById(taskId, hospitalId);
}

async function completeTask({ taskId, hospitalId, nurseId, notes = null }) {
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

  await updateNurseNotesIfProvided({ cols, taskId, hospitalId, nurseId, notes });
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
  const descriptionCol = firstExistingColumn(cols, ["description"]);
  const nurseNotesCol = firstExistingColumn(cols, ["nurse_notes"]);
  const treatmentCol = firstExistingColumn(cols, ["treatment"]);
  const testsCol = firstExistingColumn(cols, ["tests"]);
  const priorityCol = firstExistingColumn(cols, ["priority"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const assignedByCol = firstExistingColumn(cols, ["assigned_by", "assignedBy"]);
  const nurseIdCol = firstExistingColumn(cols, ["assigned_nurse_id", "nurse_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);

  const nursesCols = await getTableColumns("nurses");
  const nurseIdJoinCol = nursesCols ? firstExistingColumn(nursesCols, ["id", "nurse_id", "user_id"]) : null;
  const nurseUserIdCol = nursesCols ? firstExistingColumn(nursesCols, ["user_id"]) : null;
  const nurseNameCol = nursesCols ? firstExistingColumn(nursesCols, ["full_name", "name"]) : null;
  const nurseFirstNameCol = nursesCols ? firstExistingColumn(nursesCols, ["first_name"]) : null;
  const nurseLastNameCol = nursesCols ? firstExistingColumn(nursesCols, ["last_name"]) : null;
  const nurseEmailCol = nursesCols ? firstExistingColumn(nursesCols, ["email"]) : null;

  const usersCols = nurseUserIdCol ? await getTableColumns("users") : null;
  const userIdCol = usersCols ? firstExistingColumn(usersCols, ["id", "user_id"]) : null;
  const userNameCol = usersCols ? firstExistingColumn(usersCols, ["full_name", "name"]) : null;
  const userFirstNameCol = usersCols ? firstExistingColumn(usersCols, ["first_name"]) : null;
  const userLastNameCol = usersCols ? firstExistingColumn(usersCols, ["last_name"]) : null;
  const userEmailCol = usersCols ? firstExistingColumn(usersCols, ["email", "username"]) : null;

  let nurseNameExpr = "NULL";
  let nurseEmailExpr = "NULL";

  const joins = [];
  if (nurseIdCol && nursesCols && nurseIdJoinCol) {
    joins.push(`LEFT JOIN nurses n ON n.\`${nurseIdJoinCol}\` = t.\`${nurseIdCol}\``);

    if (nurseNameCol) {
      nurseNameExpr = `n.\`${nurseNameCol}\``;
    } else if (nurseFirstNameCol || nurseLastNameCol) {
      nurseNameExpr = `CONCAT_WS(' ', ${nurseFirstNameCol ? `n.\`${nurseFirstNameCol}\`` : "NULL"}, ${nurseLastNameCol ? `n.\`${nurseLastNameCol}\`` : "NULL"})`;
    }

    if (nurseEmailCol) {
      nurseEmailExpr = `n.\`${nurseEmailCol}\``;
    }

    if (usersCols && userIdCol && nurseUserIdCol) {
      joins.push(`LEFT JOIN users u ON u.\`${userIdCol}\` = n.\`${nurseUserIdCol}\``);
      if (nurseNameExpr === "NULL") {
        if (userNameCol) {
          nurseNameExpr = `u.\`${userNameCol}\``;
        } else if (userFirstNameCol || userLastNameCol) {
          nurseNameExpr = `CONCAT_WS(' ', ${userFirstNameCol ? `u.\`${userFirstNameCol}\`` : "NULL"}, ${userLastNameCol ? `u.\`${userLastNameCol}\`` : "NULL"})`;
        }
      }
      if (nurseEmailExpr === "NULL" && userEmailCol) {
        nurseEmailExpr = `u.\`${userEmailCol}\``;
      }
    }
  }

  const select = [
    idCol ? `t.\`${idCol}\` AS id` : "NULL AS id",
    `t.\`${patientCol}\` AS patient_id`,
    titleCol ? `t.\`${titleCol}\` AS title` : "NULL AS title",
    treatmentCol ? `t.\`${treatmentCol}\` AS treatment` : "NULL AS treatment",
    testsCol ? `t.\`${testsCol}\` AS tests` : "NULL AS tests",
    descriptionCol ? `t.\`${descriptionCol}\` AS description` : "NULL AS description",
    nurseNotesCol ? `t.\`${nurseNotesCol}\` AS nurse_notes` : "NULL AS nurse_notes",
    priorityCol ? `t.\`${priorityCol}\` AS priority` : "'medium' AS priority",
    statusCol ? `t.\`${statusCol}\` AS status` : "'pending' AS status",
    assignedByCol ? `t.\`${assignedByCol}\` AS assigned_by` : "NULL AS assigned_by",
    nurseIdCol ? `t.\`${nurseIdCol}\` AS nurse_id` : "NULL AS nurse_id",
    `${nurseNameExpr} AS nurse_name`,
    `${nurseEmailExpr} AS nurse_email`,
    createdAtCol ? `t.\`${createdAtCol}\` AS created_at` : "NULL AS created_at",
  ];

  const whereParts = [`t.\`${patientCol}\` = ?`];
  const params = [patientId];

  if (hospitalId && hospitalCol) {
    whereParts.push(`t.\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  if (assignedBy && assignedByCol) {
    whereParts.push(`t.\`${assignedByCol}\` = ?`);
    params.push(assignedBy);
  }

  const orderParts = [];
  if (createdAtCol) orderParts.push(`t.\`${createdAtCol}\` DESC`);
  if (idCol) orderParts.push(`t.\`${idCol}\` DESC`);
  const orderSql = orderParts.length ? ` ORDER BY ${orderParts.join(", ")}` : "";

  const rows = await query(
    `SELECT ${select.join(", ")} FROM nurse_tasks t
     ${joins.join("\n")}
     WHERE ${whereParts.join(" AND ")}${orderSql}`,
    params
  );

  return rows.map((row) => ({
    ...row,
    tests: normalizeTests(row?.tests),
  }));
}

async function listTasksByDoctor({ hospitalId, doctorId }) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const idCol = firstExistingColumn(cols, ["id", "task_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  const patientCol = firstExistingColumn(cols, ["patient_id"]);
  const titleCol = firstExistingColumn(cols, ["task_title", "title"]);
  const descriptionCol = firstExistingColumn(cols, ["description"]);
  const nurseNotesCol = firstExistingColumn(cols, ["nurse_notes"]);
  const treatmentCol = firstExistingColumn(cols, ["treatment"]);
  const testsCol = firstExistingColumn(cols, ["tests"]);
  const priorityCol = firstExistingColumn(cols, ["priority"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const doctorCol = firstExistingColumn(cols, ["doctor_id", "assigned_by"]);
  const nurseIdCol = firstExistingColumn(cols, ["assigned_nurse_id", "nurse_id"]);
  const createdAtCol = firstExistingColumn(cols, ["created_at"]);

  if (!patientCol) throw new Error("nurse_tasks schema missing patient_id");

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

  const joins = [];
  if (patientCols && patientIdCol) {
    joins.push(`LEFT JOIN patients p ON p.\`${patientIdCol}\` = t.\`${patientCol}\``);
  }

  // Nurse identity (best-effort across schema modes)
  const nursesCols = await getTableColumns("nurses");
  const nurseIdJoinCol = nursesCols ? firstExistingColumn(nursesCols, ["id", "nurse_id", "user_id"]) : null;
  const nurseUserIdCol = nursesCols ? firstExistingColumn(nursesCols, ["user_id"]) : null;
  const nurseNameCol = nursesCols ? firstExistingColumn(nursesCols, ["full_name", "name"]) : null;
  const nurseFirstNameCol = nursesCols ? firstExistingColumn(nursesCols, ["first_name"]) : null;
  const nurseLastNameCol = nursesCols ? firstExistingColumn(nursesCols, ["last_name"]) : null;
  const nurseEmailCol = nursesCols ? firstExistingColumn(nursesCols, ["email"]) : null;

  const usersCols = nurseUserIdCol ? await getTableColumns("users") : null;
  const userIdCol = usersCols ? firstExistingColumn(usersCols, ["id", "user_id"]) : null;
  const userNameCol = usersCols ? firstExistingColumn(usersCols, ["full_name", "name"]) : null;
  const userFirstNameCol = usersCols ? firstExistingColumn(usersCols, ["first_name"]) : null;
  const userLastNameCol = usersCols ? firstExistingColumn(usersCols, ["last_name"]) : null;
  const userEmailCol = usersCols ? firstExistingColumn(usersCols, ["email", "username"]) : null;

  const select = [
    idCol ? `t.\`${idCol}\` AS id` : "NULL AS id",
    `t.\`${patientCol}\` AS patient_id`,
    titleCol ? `t.\`${titleCol}\` AS title` : "NULL AS title",
    treatmentCol ? `t.\`${treatmentCol}\` AS treatment` : "NULL AS treatment",
    testsCol ? `t.\`${testsCol}\` AS tests` : "NULL AS tests",
    descriptionCol ? `t.\`${descriptionCol}\` AS description` : "NULL AS description",
    nurseNotesCol ? `t.\`${nurseNotesCol}\` AS nurse_notes` : "NULL AS nurse_notes",
    priorityCol ? `t.\`${priorityCol}\` AS priority` : "'medium' AS priority",
    statusCol ? `t.\`${statusCol}\` AS status` : "'pending' AS status",
    nurseIdCol ? `t.\`${nurseIdCol}\` AS nurse_id` : "NULL AS nurse_id",
    createdAtCol ? `t.\`${createdAtCol}\` AS created_at` : "NULL AS created_at",
    patientCols && patientIdCol ? `${patientNameExpr} AS patient_name` : "NULL AS patient_name",
    patientCols && patientPhoneCol ? `p.\`${patientPhoneCol}\` AS patient_phone` : "NULL AS patient_phone",
  ];

  let nurseNameExpr = "NULL";
  let nurseEmailExpr = "NULL";

  if (nursesCols && nurseIdJoinCol && nurseIdCol) {
    joins.push(`LEFT JOIN nurses n ON n.\`${nurseIdJoinCol}\` = t.\`${nurseIdCol}\``);

    if (nurseNameCol) {
      nurseNameExpr = `n.\`${nurseNameCol}\``;
    } else if (nurseFirstNameCol || nurseLastNameCol) {
      nurseNameExpr = `CONCAT_WS(' ', ${nurseFirstNameCol ? `n.\`${nurseFirstNameCol}\`` : "NULL"}, ${nurseLastNameCol ? `n.\`${nurseLastNameCol}\`` : "NULL"})`;
    }

    if (nurseEmailCol) {
      nurseEmailExpr = `n.\`${nurseEmailCol}\``;
    }

    if (usersCols && userIdCol && nurseUserIdCol) {
      joins.push(`LEFT JOIN users u ON u.\`${userIdCol}\` = n.\`${nurseUserIdCol}\``);

      if (nurseNameExpr === "NULL") {
        if (userNameCol) {
          nurseNameExpr = `u.\`${userNameCol}\``;
        } else if (userFirstNameCol || userLastNameCol) {
          nurseNameExpr = `CONCAT_WS(' ', ${userFirstNameCol ? `u.\`${userFirstNameCol}\`` : "NULL"}, ${userLastNameCol ? `u.\`${userLastNameCol}\`` : "NULL"})`;
        }
      }

      if (nurseEmailExpr === "NULL" && userEmailCol) {
        nurseEmailExpr = `u.\`${userEmailCol}\``;
      }
    }
  }

  select.push(`${nurseNameExpr} AS nurse_name`);
  select.push(`${nurseEmailExpr} AS nurse_email`);

  const where = [];
  const params = [];

  if (hospitalId && hospitalCol) {
    where.push(`t.\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  if (doctorId && doctorCol) {
    where.push(`t.\`${doctorCol}\` = ?`);
    params.push(doctorId);
  }

  const orderParts = [];
  if (createdAtCol) orderParts.push(`t.\`${createdAtCol}\` DESC`);
  if (idCol) orderParts.push(`t.\`${idCol}\` DESC`);

  const sql = `SELECT ${select.join(", ")}
    FROM nurse_tasks t
    ${joins.join("\n")}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ${orderParts.length ? `ORDER BY ${orderParts.join(", ")}` : ""}
    LIMIT 100`;

  const rows = await query(sql, params);
  return rows.map((row) => ({
    ...row,
    tests: normalizeTests(row?.tests),
  }));
}

async function updateTaskNotes({ taskId, hospitalId, nurseId, notes }) {
  const cols = await getTableColumns("nurse_tasks");
  if (!cols) throw new Error("nurse_tasks table not found");

  const notesCol = firstExistingColumn(cols, ["nurse_notes"]);
  if (!notesCol) {
    const err = new Error("Notes not supported by current database schema");
    err.statusCode = 400;
    throw err;
  }

  const idCol = firstExistingColumn(cols, ["id", "task_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  const nurseCol = firstExistingColumn(cols, ["assigned_nurse_id", "nurse_id"]);
  if (!idCol || !nurseCol) throw new Error("nurse_tasks schema missing required columns");

  const safeNotes = normalizeNote(notes);

  const where = [`\`${idCol}\` = ?`, `\`${nurseCol}\` = ?`];
  const params = [taskId, nurseId];
  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  const result = await query(
    `UPDATE nurse_tasks SET \`${notesCol}\` = ? WHERE ${where.join(" AND ")}`,
    [safeNotes, ...params]
  );

  if (!result?.affectedRows) {
    const err = new Error("Only the assigned nurse can update notes");
    err.statusCode = 403;
    throw err;
  }

  return getTaskById(taskId, hospitalId);
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
  listTasksByDoctor,
  updateTaskNotes,
};
