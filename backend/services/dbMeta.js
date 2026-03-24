const { query } = require("../config/database");

const columnCache = new Map();

function firstExistingColumn(columns, candidates) {
  return candidates.find((c) => columns?.has(c)) || null;
}

async function getTableColumns(table) {
  if (!table) return null;
  if (columnCache.has(table)) return columnCache.get(table);
  try {
    const rows = await query(`SHOW COLUMNS FROM \`${table}\``);
    const set = new Set(rows.map((r) => r.Field));
    columnCache.set(table, set);
    return set;
  } catch (error) {
    columnCache.set(table, null);
    return null;
  }
}

function clearTableColumnsCache(table) {
  if (!table) {
    columnCache.clear();
    return;
  }
  columnCache.delete(table);
}

module.exports = {
  getTableColumns,
  firstExistingColumn,
  clearTableColumnsCache,
};
