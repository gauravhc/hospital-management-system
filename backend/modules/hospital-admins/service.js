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

async function create(payload) {
  const cols = await getTableColumns("hospital_admins");
  if (!cols) throw new Error("hospital_admins table not found");

  const values = {};
  const name = normalizeName(payload);
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = payload.phone || payload.mobile || null;
  const hospitalId = payload.hospital_id ?? payload.hospitalId ?? null;

  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  if (nameCol) values[nameCol] = name;
  if (cols.has("email")) values.email = email;
  if (cols.has("phone")) values.phone = phone;
  if (!cols.has("phone") && cols.has("mobile")) values.mobile = phone;
  if (cols.has("hospital_id")) values.hospital_id = hospitalId;
  if (cols.has("status")) values.status = payload.status || "active";
  if (!cols.has("status") && cols.has("is_active")) {
    values.is_active = payload.status ? String(payload.status).toLowerCase() === "active" : 1;
  }

  const passwordCol = firstExistingColumn(cols, ["password", "password_hash"]);
  if (passwordCol) {
    values[passwordCol] = await bcrypt.hash(String(payload.password || "Admin@123"), 10);
  }

  const insertCols = Object.keys(values);
  const placeholders = insertCols.map(() => "?").join(", ");
  const result = await query(
    `INSERT INTO hospital_admins (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    insertCols.map((c) => values[c])
  );

  return { id: result?.insertId ?? null };
}

module.exports = { create };
