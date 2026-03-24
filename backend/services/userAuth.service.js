const bcrypt = require("bcryptjs");
const { query } = require("../config/database");
const { getTableColumns, firstExistingColumn } = require("./dbMeta");

async function createAuthUser({ email, password, role, hospital_id }) {
  const cols = await getTableColumns("users");
  if (!cols) {
    throw new Error("Users table not found");
  }

  const idCol = firstExistingColumn(cols, ["id", "user_id"]);
  const emailCol = firstExistingColumn(cols, ["email"]);
  const passwordCol = firstExistingColumn(cols, ["password", "password_hash"]);
  const roleCol = firstExistingColumn(cols, ["role"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);

  if (!idCol || !emailCol || !passwordCol || !roleCol) {
    throw new Error("Users table missing required columns");
  }

  const safeEmail = String(email || "").trim().toLowerCase();
  const hash = await bcrypt.hash(password || "123456", 10);

  await query(
    `INSERT INTO users (\`${emailCol}\`, \`${passwordCol}\`, \`${roleCol}\`${hospitalCol ? `, \`${hospitalCol}\`` : ""})
     VALUES (?, ?, ?${hospitalCol ? ", ?" : ""})`,
    hospitalCol ? [safeEmail, hash, role, hospital_id ?? null] : [safeEmail, hash, role]
  );

  const rows = await query(
    `SELECT \`${idCol}\` AS id FROM users WHERE \`${emailCol}\` = ? ORDER BY \`${idCol}\` DESC LIMIT 1`,
    [safeEmail]
  );

  return rows[0]?.id || null;
}

module.exports = {
  createAuthUser,
};
