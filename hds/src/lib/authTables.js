import db from "@/lib/db";

const ROLE_TO_TABLE = {
  super_admin: "super_admins",
  hospital_admin: "hospital_admins",
  doctor: "doctors",
  nurse: "nurses",
  patient: "patients",
};

const TABLE_TO_ROLE = {
  super_admins: "super_admin",
  hospital_admins: "hospital_admin",
  doctors: "doctor",
  nurses: "nurse",
  patients: "patient",
};

const CACHED_COLUMNS = new Map();
export const clearTableColumnsCache = (table) => {
  if (!table) {
    CACHED_COLUMNS.clear();
    return;
  }
  CACHED_COLUMNS.delete(table);
};

const normalizeRole = (role) => {
  const raw = String(role || "").toLowerCase().trim();
  if (raw === "admin" || raw === "administrator") return "hospital_admin";
  if (raw === "superadmin" || raw === "super-admin") return "super_admin";
  return raw;
};

const getTableForRole = (role) => ROLE_TO_TABLE[normalizeRole(role)] || null;
export const resolveTargetTableForRole = async (role) => {
  const normalizedRole = normalizeRole(role);
  const preferredTable = getTableForRole(normalizedRole);
  if (!preferredTable) return null;
  const exists = await getTableColumns(preferredTable);
  return exists ? preferredTable : null;
};

const inferRoleFromTable = (table, rowRole) => {
  return TABLE_TO_ROLE[table] || normalizeRole(rowRole);
};

export const getTableColumns = async (table) => {
  if (CACHED_COLUMNS.has(table)) return CACHED_COLUMNS.get(table);

  try {
    const [rows] = await db.query(`DESCRIBE \`${table}\``);
    const set = new Set(rows.map((r) => r.Field));
    CACHED_COLUMNS.set(table, set);
    return set;
  } catch {
    return null;
  }
};

export const ensureStatusColumn = async (table) => {
  const cols = await getTableColumns(table);
  if (!cols) return null;
  if (cols.has("status")) return cols;

  await db.query(
    `ALTER TABLE \`${table}\` ADD COLUMN \`status\` VARCHAR(20) NOT NULL DEFAULT 'active'`
  );
  clearTableColumnsCache(table);
  return getTableColumns(table);
};

const firstExistingColumn = (columns, candidates) =>
  candidates.find((c) => columns?.has(c)) || null;

export const findUserByEmail = async (email) => {
  const safeEmail = String(email || "").trim();
  if (!safeEmail) return null;

  const orderedTables = ["super_admins", "hospital_admins", "doctors", "nurses", "patients"];

  for (const table of orderedTables) {
    const cols = await getTableColumns(table);
    if (!cols || !cols.has("email") || !cols.has("password")) continue;

    const idCol = firstExistingColumn(cols, ["id", "user_id"]);
    const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
    const statusCol = firstExistingColumn(cols, ["status"]);
    const roleCol = firstExistingColumn(cols, ["role"]);

    if (!idCol) continue;

    const select = [
      `\`${idCol}\` AS id`,
      "`email` AS email",
      "`password` AS password",
      nameCol ? `\`${nameCol}\` AS full_name` : "NULL AS full_name",
      roleCol ? `\`${roleCol}\` AS role` : "NULL AS role",
      statusCol ? `\`${statusCol}\` AS status` : "NULL AS status",
      cols.has("hospital_id") ? "`hospital_id` AS hospital_id" : "NULL AS hospital_id",
    ];

    const [rows] = await db.query(
      `SELECT ${select.join(", ")}
       FROM \`${table}\`
       WHERE email = ?
       ORDER BY (password IS NOT NULL) DESC, \`${idCol}\` DESC
       LIMIT 1`,
      [safeEmail]
    );

    if (!rows.length) continue;

    const user = rows[0];
    if (statusCol && user.status && String(user.status).toLowerCase() !== "active") {
      continue;
    }

    return {
      ...user,
      role: inferRoleFromTable(table, user.role),
      table,
    };
  }

  return null;
};

export const findUserByIdAndRole = async ({ id, role }) => {
  const normalizedRole = normalizeRole(role);
  if (!id || !normalizedRole) return null;

  const preferredTable = getTableForRole(normalizedRole);
  const orderedTables = preferredTable ? [preferredTable] : [];

  for (const table of orderedTables) {
    const cols = await getTableColumns(table);
    if (!cols) continue;

    const idCol = firstExistingColumn(cols, ["id", "user_id"]);
    if (!idCol) continue;

    const roleCol = firstExistingColumn(cols, ["role"]);
    const statusCol = firstExistingColumn(cols, ["status"]);
    const nameCol = firstExistingColumn(cols, ["full_name", "name"]);

    const select = [
      `\`${idCol}\` AS id`,
      cols.has("email") ? "`email` AS email" : "NULL AS email",
      cols.has("password") ? "`password` AS password" : "NULL AS password",
      nameCol ? `\`${nameCol}\` AS full_name` : "NULL AS full_name",
      roleCol ? `\`${roleCol}\` AS role` : "NULL AS role",
      statusCol ? `\`${statusCol}\` AS status` : "NULL AS status",
      cols.has("hospital_id") ? "`hospital_id` AS hospital_id" : "NULL AS hospital_id",
    ];

    const [rows] = await db.query(
      `SELECT ${select.join(", ")} FROM \`${table}\` WHERE \`${idCol}\` = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) continue;

    const user = rows[0];
    if (statusCol && user.status && String(user.status).toLowerCase() !== "active") {
      return null;
    }

    const resolvedRole = inferRoleFromTable(table, user.role);
    if (resolvedRole !== normalizedRole) {
      return null;
    }

    return {
      ...user,
      role: resolvedRole,
      table,
    };
  }

  return null;
};

export const emailExists = async (email) => {
  const safeEmail = String(email || "").trim();
  if (!safeEmail) return false;

  const orderedTables = ["super_admins", "hospital_admins", "doctors", "nurses", "patients"];
  for (const table of orderedTables) {
    const cols = await getTableColumns(table);
    if (!cols || !cols.has("email")) continue;
    const [rows] = await db.query(`SELECT 1 AS ok FROM \`${table}\` WHERE email = ? LIMIT 1`, [safeEmail]);
    if (rows.length) return true;
  }
  return false;
};

export const insertRoleUser = async ({
  role,
  name,
  email,
  passwordHash,
  phone,
  hospitalId,
  department,
  specialization,
  joinDate,
}) => {
  const normalizedRole = normalizeRole(role);
  const targetTable = await resolveTargetTableForRole(normalizedRole);
  if (!targetTable) {
    throw new Error(`Unsupported role "${normalizedRole}". Configure a dedicated table for this role.`);
  }
  const cols = await getTableColumns(targetTable);
  if (!cols) throw new Error(`Target table "${targetTable}" does not exist`);

  const values = {};

  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  if (nameCol) values[nameCol] = name;
  if (cols.has("email")) values.email = email;
  if (cols.has("password")) values.password = passwordHash;

  const phoneCol = firstExistingColumn(cols, [
    "mobile",
    "phone",
    "contact_number",
    "contact_no",
    "contact",
    "phone_number",
  ]);
  if (phoneCol && phone !== undefined) values[phoneCol] = phone || null;

  if (cols.has("role")) values.role = normalizedRole;
  if (cols.has("status")) values.status = "active";

  if (hospitalId !== undefined && hospitalId !== null && cols.has("hospital_id")) {
    values.hospital_id = hospitalId;
  }

  if (department && cols.has("department")) values.department = department;
  if (specialization && cols.has("specialization")) values.specialization = specialization;
  if (joinDate && cols.has("date_of_joining")) values.date_of_joining = joinDate;

  if (cols.has("created_at")) values.created_at = new Date();

  const insertCols = Object.keys(values);
  if (!insertCols.length) throw new Error(`No compatible columns found in "${targetTable}"`);

  const placeholders = insertCols.map(() => "?").join(", ");
  const sql = `INSERT INTO \`${targetTable}\` (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`;
  const [result] = await db.query(sql, insertCols.map((c) => values[c]));

  return { id: result.insertId, table: targetTable, role: normalizedRole };
};

export const updateRoleUser = async ({ table, id, name, email, phone }) => {
  const cols = await getTableColumns(table);
  if (!cols) return { affectedRows: 0 };

  const updates = [];
  const params = [];

  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  const phoneCol = firstExistingColumn(cols, [
    "mobile",
    "phone",
    "contact_number",
    "contact_no",
    "contact",
    "phone_number",
  ]);
  const idCol = firstExistingColumn(cols, ["id", "user_id"]);

  if (!idCol) return { affectedRows: 0 };
  if (nameCol) {
    updates.push(`\`${nameCol}\` = ?`);
    params.push(name);
  }
  if (cols.has("email")) {
    updates.push("`email` = ?");
    params.push(email);
  }
  if (phoneCol) {
    updates.push(`\`${phoneCol}\` = ?`);
    params.push(phone || null);
  }

  if (!updates.length) return { affectedRows: 0 };

  params.push(id);
  const [result] = await db.query(
    `UPDATE \`${table}\` SET ${updates.join(", ")} WHERE \`${idCol}\` = ?`,
    params
  );
  return result;
};

export const deleteRoleUser = async ({ table, id }) => {
  const cols = await getTableColumns(table);
  if (!cols) return { affectedRows: 0 };

  const idCol = firstExistingColumn(cols, ["id", "user_id"]);
  if (!idCol) return { affectedRows: 0 };

  try {
    const [result] = await db.query(`DELETE FROM \`${table}\` WHERE \`${idCol}\` = ?`, [id]);
    return result;
  } catch (err) {
    if ((err?.code === "ER_ROW_IS_REFERENCED_2" || err?.code === "ER_ROW_IS_REFERENCED") && cols.has("status")) {
      const [result] = await db.query(
        `UPDATE \`${table}\` SET \`status\` = 'inactive' WHERE \`${idCol}\` = ?`,
        [id]
      );
      return result;
    }
    throw err;
  }
};
