const bcrypt = require("bcryptjs");
const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

const ROLE_TABLE_MAP = {
  super_admin: "super_admins",
  hospital_admin: "hospital_admins",
  doctor: "doctors",
  nurse: "nurses",
  patient: "patients",
  pharmacist: "staff",
  receptionist: "staff",
  labtechnician: "staff",
  inventorymanager: "staff",
  accountant: "staff",
  admin: "staff",
};

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const buildFullName = (payload = {}) =>
  payload.full_name ||
  payload.name ||
  [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim();

const splitName = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
};

async function list(scopedHospitalId, { role, q } = {}) {
  const roles = role && role !== "all" ? [normalizeRole(role)] : Object.keys(ROLE_TABLE_MAP);
  const users = [];

  for (const roleLabel of roles) {
    const table = ROLE_TABLE_MAP[roleLabel];
    if (!table) continue;
    const rows = await listRoleUsers(table, roleLabel, scopedHospitalId, q);
    users.push(...rows);
  }

  return users;
}

async function listRoleUsers(table, roleLabel, scopedHospitalId, q) {
  const cols = await getTableColumns(table);
  if (!cols) return [];

  const idCol = firstExistingColumn(cols, ["id", "user_id", `${roleLabel}_id`]);
  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  const emailCol = firstExistingColumn(cols, ["email"]);
  const phoneCol = firstExistingColumn(cols, ["phone", "mobile"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
  const statusCol = firstExistingColumn(cols, ["status", "is_active"]);
  const roleCol = firstExistingColumn(cols, ["role"]);

  if (!idCol || !emailCol) return [];

  const select = [
    `\`${idCol}\` AS id`,
    nameCol ? `\`${nameCol}\` AS name` : "NULL AS name",
    `\`${emailCol}\` AS email`,
    phoneCol ? `\`${phoneCol}\` AS phone` : "NULL AS phone",
    hospitalCol ? `\`${hospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
    statusCol
      ? statusCol === "is_active"
        ? "CASE WHEN `is_active` = 1 THEN 'active' ELSE 'inactive' END AS status"
        : `\`${statusCol}\` AS status`
      : "'active' AS status",
    `'${roleLabel}' AS role`,
  ];

  const whereParts = [];
  const params = [];

  if (scopedHospitalId !== null && scopedHospitalId !== undefined && hospitalCol) {
    whereParts.push(`\`${hospitalCol}\` = ?`);
    params.push(scopedHospitalId);
  }

  if (table === "staff" && roleCol && roleLabel && roleLabel !== "staff") {
    whereParts.push(`LOWER(\`${roleCol}\`) = ?`);
    params.push(String(roleLabel).toLowerCase());
  }

  if (q) {
    const search = `%${String(q).toLowerCase()}%`;
    if (nameCol) {
      whereParts.push(`LOWER(\`${nameCol}\`) LIKE ?`);
      params.push(search);
    } else {
      whereParts.push(`LOWER(\`${emailCol}\`) LIKE ?`);
      params.push(search);
    }
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const sql = `SELECT ${select.join(", ")} FROM \`${table}\` ${whereSql} ORDER BY \`${idCol}\` DESC`;
  return query(sql, params);
}

async function create(payload, scopedHospitalId) {
  const role = normalizeRole(payload.role);
  const table = ROLE_TABLE_MAP[role];
  if (!table) {
    throw new Error("Unsupported role");
  }

  const cols = await getTableColumns(table);
  if (!cols) throw new Error("Role table not found");

  const values = {};
  const fullName = buildFullName(payload);
  const { firstName, lastName } = splitName(fullName);
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = payload.phone || payload.mobile || null;
  const hospitalId = scopedHospitalId ?? payload.hospital_id ?? payload.hospitalId ?? null;

  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  if (nameCol && fullName) values[nameCol] = fullName;
  if (!nameCol && cols.has("first_name")) values.first_name = firstName;
  if (!nameCol && cols.has("last_name")) values.last_name = lastName;

  if (cols.has("email")) values.email = email;
  if (cols.has("phone")) values.phone = phone;
  if (!cols.has("phone") && cols.has("mobile")) values.mobile = phone;
  if (cols.has("hospital_id")) values.hospital_id = hospitalId;
  if (cols.has("role")) values.role = role;
  if (cols.has("specialization") && payload.specialization !== undefined) {
    values.specialization = payload.specialization || null;
  }
  if (cols.has("department_id") && payload.department_id !== undefined) {
    values.department_id = payload.department_id || null;
  }
  if (cols.has("department") && payload.department !== undefined) {
    values.department = payload.department || null;
  }
  if (cols.has("dob") && payload.dob !== undefined) {
    values.dob = payload.dob || null;
  }
  if (cols.has("date_of_birth") && payload.date_of_birth !== undefined) {
    values.date_of_birth = payload.date_of_birth || null;
  }
  if (cols.has("gender") && payload.gender !== undefined) {
    values.gender = payload.gender || null;
  }
  if (cols.has("blood_group") && payload.blood_group !== undefined) {
    values.blood_group = payload.blood_group || null;
  }
  if (cols.has("age") && payload.age !== undefined) {
    values.age = payload.age || null;
  }
  if (cols.has("state") && payload.state !== undefined) {
    values.state = payload.state || null;
  }
  if (cols.has("country") && payload.country !== undefined) {
    values.country = payload.country || null;
  }
  if (cols.has("pincode") && payload.pincode !== undefined) {
    values.pincode = payload.pincode || null;
  }
  if (cols.has("address") && payload.address !== undefined) {
    values.address = payload.address || null;
  }
  if (payload.profile_image !== undefined) {
    if (cols.has("profile_image")) values.profile_image = payload.profile_image || null;
    if (cols.has("avatar_url")) values.avatar_url = payload.profile_image || null;
    if (cols.has("photo_url")) values.photo_url = payload.profile_image || null;
  }
  if (cols.has("status") && payload.status !== undefined) {
    values.status = payload.status || "active";
  }
  if (!cols.has("status") && cols.has("is_active") && payload.status !== undefined) {
    values.is_active = String(payload.status).toLowerCase() === "active" ? 1 : 0;
  }

  const passwordCol = firstExistingColumn(cols, ["password", "password_hash"]);
  if (passwordCol) {
    const rawPassword = payload.password || payload.passwordHash || payload.password_hash || "123456";
    values[passwordCol] = await bcrypt.hash(String(rawPassword), 10);
  }

  const insertCols = Object.keys(values);
  if (!insertCols.length) {
    throw new Error("No writable columns found for role table");
  }

  const placeholders = insertCols.map(() => "?").join(", ");
  const result = await query(
    `INSERT INTO \`${table}\` (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    insertCols.map((c) => values[c])
  );

  return {
    id: result?.insertId ?? null,
    role,
    hospital_id: hospitalId ?? null,
  };
}

async function getById(id, role) {
  const table = ROLE_TABLE_MAP[normalizeRole(role)];
  if (!table) return null;
  const cols = await getTableColumns(table);
  if (!cols) return null;

  const idCol = firstExistingColumn(cols, ["id", "user_id", `${role}_id`]);
  if (!idCol) return null;
  const rows = await query(`SELECT * FROM \`${table}\` WHERE \`${idCol}\` = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function update(id, payload) {
  const role = normalizeRole(payload.role);
  const table = ROLE_TABLE_MAP[role];
  if (!table) throw new Error("Unsupported role");

  const cols = await getTableColumns(table);
  if (!cols) return;

  const idCol = firstExistingColumn(cols, ["id", "user_id", `${role}_id`]);
  if (!idCol) return;

  const updates = [];
  const params = [];
  const fullName = buildFullName(payload);
  const { firstName, lastName } = splitName(fullName);

  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  if (nameCol && payload.name !== undefined) {
    updates.push(`\`${nameCol}\` = ?`);
    params.push(fullName || null);
  }
  if (!nameCol && cols.has("first_name") && payload.name !== undefined) {
    updates.push("`first_name` = ?");
    params.push(firstName);
  }
  if (!nameCol && cols.has("last_name") && payload.name !== undefined) {
    updates.push("`last_name` = ?");
    params.push(lastName);
  }
  if (cols.has("email") && payload.email !== undefined) {
    updates.push("`email` = ?");
    params.push(payload.email || null);
  }
  if (cols.has("phone") && payload.phone !== undefined) {
    updates.push("`phone` = ?");
    params.push(payload.phone || null);
  }
  if (!cols.has("phone") && cols.has("mobile") && payload.phone !== undefined) {
    updates.push("`mobile` = ?");
    params.push(payload.phone || null);
  }
  if (cols.has("hospital_id") && payload.hospital_id !== undefined) {
    updates.push("`hospital_id` = ?");
    params.push(payload.hospital_id ?? null);
  }
  if (cols.has("role") && payload.role !== undefined) {
    updates.push("`role` = ?");
    params.push(role || null);
  }
  if (cols.has("specialization") && payload.specialization !== undefined) {
    updates.push("`specialization` = ?");
    params.push(payload.specialization || null);
  }
  if (cols.has("department_id") && payload.department_id !== undefined) {
    updates.push("`department_id` = ?");
    params.push(payload.department_id || null);
  }
  if (cols.has("department") && payload.department !== undefined) {
    updates.push("`department` = ?");
    params.push(payload.department || null);
  }
  if (cols.has("dob") && payload.dob !== undefined) {
    updates.push("`dob` = ?");
    params.push(payload.dob || null);
  }
  if (cols.has("date_of_birth") && payload.date_of_birth !== undefined) {
    updates.push("`date_of_birth` = ?");
    params.push(payload.date_of_birth || null);
  }
  if (cols.has("gender") && payload.gender !== undefined) {
    updates.push("`gender` = ?");
    params.push(payload.gender || null);
  }
  if (cols.has("blood_group") && payload.blood_group !== undefined) {
    updates.push("`blood_group` = ?");
    params.push(payload.blood_group || null);
  }
  if (cols.has("age") && payload.age !== undefined) {
    updates.push("`age` = ?");
    params.push(payload.age || null);
  }
  if (cols.has("state") && payload.state !== undefined) {
    updates.push("`state` = ?");
    params.push(payload.state || null);
  }
  if (cols.has("country") && payload.country !== undefined) {
    updates.push("`country` = ?");
    params.push(payload.country || null);
  }
  if (cols.has("pincode") && payload.pincode !== undefined) {
    updates.push("`pincode` = ?");
    params.push(payload.pincode || null);
  }
  if (cols.has("address") && payload.address !== undefined) {
    updates.push("`address` = ?");
    params.push(payload.address || null);
  }
  if (payload.profile_image !== undefined) {
    if (cols.has("profile_image")) {
      updates.push("`profile_image` = ?");
      params.push(payload.profile_image || null);
    }
    if (cols.has("avatar_url")) {
      updates.push("`avatar_url` = ?");
      params.push(payload.profile_image || null);
    }
    if (cols.has("photo_url")) {
      updates.push("`photo_url` = ?");
      params.push(payload.profile_image || null);
    }
  }
  if (cols.has("status") && payload.status !== undefined) {
    updates.push("`status` = ?");
    params.push(payload.status || "active");
  }
  if (!cols.has("status") && cols.has("is_active") && payload.status !== undefined) {
    updates.push("`is_active` = ?");
    params.push(String(payload.status).toLowerCase() === "active" ? 1 : 0);
  }

  const passwordCol = firstExistingColumn(cols, ["password", "password_hash"]);
  if (passwordCol && payload.password) {
    updates.push(`\`${passwordCol}\` = ?`);
    params.push(await bcrypt.hash(String(payload.password), 10));
  }

  if (!updates.length) return;
  params.push(id);
  await query(`UPDATE \`${table}\` SET ${updates.join(", ")} WHERE \`${idCol}\` = ?`, params);
}

async function remove(id, role) {
  const table = ROLE_TABLE_MAP[normalizeRole(role)];
  if (!table) return;
  const cols = await getTableColumns(table);
  if (!cols) return;
  const idCol = firstExistingColumn(cols, ["id", "user_id", `${role}_id`]);
  if (!idCol) return;
  await query(`DELETE FROM \`${table}\` WHERE \`${idCol}\` = ?`, [id]);
}

module.exports = { list, create, getById, update, remove };
