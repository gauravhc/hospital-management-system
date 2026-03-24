const { query } = require("../../config/database");

function items(hospitalId) {
  return hospitalId
    ? query(`SELECT * FROM inventory_items WHERE hospital_id = ? ORDER BY created_at DESC`, [hospitalId])
    : query(`SELECT * FROM inventory_items ORDER BY created_at DESC`);
}
function createItem(payload, hospitalId) {
  return query(
    `INSERT INTO inventory_items (hospital_id, name, sku, category, quantity, reorder_level, unit, unit_cost, supplier_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [hospitalId || payload.hospital_id, payload.name, payload.sku || null, payload.category || null, payload.quantity || 0, payload.reorder_level || 0, payload.unit || null, payload.unit_cost || 0, payload.supplier_name || null]
  );
}
function updateItem(id, payload) {
  return query(
    `UPDATE inventory_items
     SET name = COALESCE(?, name), sku = COALESCE(?, sku), category = COALESCE(?, category), quantity = COALESCE(?, quantity),
         reorder_level = COALESCE(?, reorder_level), unit = COALESCE(?, unit), unit_cost = COALESCE(?, unit_cost), supplier_name = COALESCE(?, supplier_name)
     WHERE id = ?`,
    [payload.name || null, payload.sku || null, payload.category || null, payload.quantity, payload.reorder_level, payload.unit || null, payload.unit_cost, payload.supplier_name || null, id]
  );
}
function removeItem(id) { return query(`DELETE FROM inventory_items WHERE id = ?`, [id]); }
function lowStock(hospitalId) {
  const params = [];
  let sql = `SELECT * FROM inventory_items WHERE quantity <= reorder_level`;
  if (hospitalId) {
    sql += ` AND hospital_id = ?`;
    params.push(hospitalId);
  }
  return query(sql, params);
}
module.exports = { items, createItem, updateItem, removeItem, lowStock };
