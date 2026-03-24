const { query } = require("../config/database");

let cachedMode = null;

async function getSchemaMode() {
  if (cachedMode) {
    return cachedMode;
  }

  try {
    const rows = await query(`SHOW COLUMNS FROM hospitals LIKE 'id'`);
    const type = rows[0]?.Type || "";
    cachedMode = type.includes("int") ? "legacy" : "erp";
  } catch (error) {
    cachedMode = "erp";
  }

  return cachedMode;
}

module.exports = {
  getSchemaMode,
};
