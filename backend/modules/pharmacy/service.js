const { query } = require("../../config/database");

function medicines(hospitalId) {
  return hospitalId
    ? query(`SELECT * FROM pharmacy_medicines WHERE hospital_id = ? ORDER BY created_at DESC`, [hospitalId])
    : query(`SELECT * FROM pharmacy_medicines ORDER BY created_at DESC`);
}
function createMedicine(payload, hospitalId) {
  return query(
    `INSERT INTO pharmacy_medicines (hospital_id, name, sku, category, unit_price, stock_quantity, reorder_level, expiry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [hospitalId || payload.hospital_id, payload.name, payload.sku || null, payload.category || null, payload.unit_price || 0, payload.stock_quantity || 0, payload.reorder_level || 0, payload.expiry_date || null]
  );
}
function updateMedicine(id, payload) {
  return query(
    `UPDATE pharmacy_medicines
     SET name = COALESCE(?, name), sku = COALESCE(?, sku), category = COALESCE(?, category), unit_price = COALESCE(?, unit_price),
         stock_quantity = COALESCE(?, stock_quantity), reorder_level = COALESCE(?, reorder_level), expiry_date = COALESCE(?, expiry_date)
     WHERE id = ?`,
    [payload.name || null, payload.sku || null, payload.category || null, payload.unit_price, payload.stock_quantity, payload.reorder_level, payload.expiry_date || null, id]
  );
}
function removeMedicine(id) { return query(`DELETE FROM pharmacy_medicines WHERE id = ?`, [id]); }
function orders(hospitalId) {
  return hospitalId
    ? query(`SELECT * FROM pharmacy_orders WHERE hospital_id = ? ORDER BY created_at DESC`, [hospitalId])
    : query(`SELECT * FROM pharmacy_orders ORDER BY created_at DESC`);
}
function createOrder(payload, hospitalId) {
  return query(
    `INSERT INTO pharmacy_orders (hospital_id, patient_id, doctor_id, medicine_id, quantity, total_amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [hospitalId || payload.hospital_id, payload.patient_id || null, payload.doctor_id || null, payload.medicine_id || null, payload.quantity || 1, payload.total_amount || 0, payload.status || "pending"]
  );
}
module.exports = { medicines, createMedicine, updateMedicine, removeMedicine, orders, createOrder };
