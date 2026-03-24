const bcrypt = require("bcryptjs");
const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

function normalizeName(payload = {}) {
  return (
    payload.full_name ||
    payload.name ||
    [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim()
  );
}

async function list() {
  const cols = await getTableColumns("super_admins");
  if (!cols) return [];

  const idCol = firstExistingColumn(cols, ["id", "super_admin_id"]);
  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  const emailCol = firstExistingColumn(cols, ["email"]);

  const select = [
    idCol ? `\`${idCol}\` AS id` : "id AS id",
    nameCol ? `\`${nameCol}\` AS name` : "NULL AS name",
    emailCol ? `\`${emailCol}\` AS email` : "NULL AS email",
  ];

  return query(`SELECT ${select.join(", ")} FROM super_admins ORDER BY ${idCol || "id"} DESC`);
}

async function create(payload) {
  const cols = await getTableColumns("super_admins");
  if (!cols) throw new Error("super_admins table not found");

  const values = {};
  const name = normalizeName(payload);
  const email = String(payload.email || "").trim().toLowerCase();

  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  if (nameCol) values[nameCol] = name;
  if (cols.has("email")) values.email = email;

  const passwordCol = firstExistingColumn(cols, ["password", "password_hash"]);
  if (passwordCol) {
    values[passwordCol] = await bcrypt.hash(String(payload.password || "Admin@123"), 10);
  }

  const insertCols = Object.keys(values);
  const placeholders = insertCols.map(() => "?").join(", ");
  const result = await query(
    `INSERT INTO super_admins (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    insertCols.map((c) => values[c])
  );

  return { id: result?.insertId ?? null };
}

async function update(id, payload) {
  const cols = await getTableColumns("super_admins");
  if (!cols) return;

  const idCol = firstExistingColumn(cols, ["id", "super_admin_id"]);
  if (!idCol) return;

  const updates = [];
  const params = [];
  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  if (nameCol && payload.name !== undefined) {
    updates.push(`\`${nameCol}\` = ?`);
    params.push(normalizeName(payload) || null);
  }
  if (cols.has("email") && payload.email !== undefined) {
    updates.push("`email` = ?");
    params.push(payload.email || null);
  }
  const passwordCol = firstExistingColumn(cols, ["password", "password_hash"]);
  if (passwordCol && payload.password) {
    updates.push(`\`${passwordCol}\` = ?`);
    params.push(await bcrypt.hash(String(payload.password), 10));
  }

  if (!updates.length) return;
  params.push(id);
  await query(`UPDATE super_admins SET ${updates.join(", ")} WHERE \`${idCol}\` = ?`, params);
}

async function remove(id) {
  const cols = await getTableColumns("super_admins");
  if (!cols) return;
  const idCol = firstExistingColumn(cols, ["id", "super_admin_id"]);
  if (!idCol) return;
  await query(`DELETE FROM super_admins WHERE \`${idCol}\` = ?`, [id]);
}

module.exports = { list, create, update, remove };
