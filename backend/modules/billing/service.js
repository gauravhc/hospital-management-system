const { query } = require("../../config/database");

function invoices(hospitalId) {
  return hospitalId
    ? query(`SELECT * FROM invoices WHERE hospital_id = ? ORDER BY created_at DESC, id DESC`, [hospitalId])
    : query(`SELECT * FROM invoices ORDER BY created_at DESC, id DESC`);
}

function createInvoice(payload, hospitalId) {
  return query(
    `INSERT INTO invoices (patient_id, hospital_id, total_amount, status)
     VALUES (?, ?, ?, ?)`,
    [
      payload.patient_id,
      hospitalId || payload.hospital_id,
      payload.total_amount || 0,
      payload.status || "unpaid",
    ]
  );
}

async function getInvoice(id) {
  const rows = await query(`SELECT * FROM invoices WHERE id = ?`, [id]);
  return rows[0] || null;
}

function patientInvoices(patientId) {
  return query(`SELECT * FROM invoices WHERE patient_id = ? ORDER BY created_at DESC, id DESC`, [patientId]);
}

module.exports = { invoices, createInvoice, getInvoice, patientInvoices };
