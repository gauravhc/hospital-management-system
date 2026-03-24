const { query } = require("../../config/database");

function create(payload) {
  return query(
    `INSERT INTO payments (invoice_id, amount, method)
     VALUES (?, ?, ?)`,
    [payload.invoice_id, payload.amount, payload.method || payload.payment_method || "cash"]
  );
}

function history() {
  return query(`SELECT * FROM payments ORDER BY payment_date DESC, id DESC`);
}

async function getById(id) {
  const rows = await query(`SELECT * FROM payments WHERE id = ?`, [id]);
  return rows[0] || null;
}

module.exports = { create, history, getById };
