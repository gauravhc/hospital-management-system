const { query } = require("../../config/database");

function tests(hospitalId) {
  return hospitalId
    ? query(`SELECT * FROM lab_tests WHERE hospital_id = ? ORDER BY id DESC`, [hospitalId])
    : query(`SELECT * FROM lab_tests ORDER BY id DESC`);
}

function createTest(payload, hospitalId) {
  return query(
    `INSERT INTO lab_tests (hospital_id, test_name, price)
     VALUES (?, ?, ?)`,
    [hospitalId || payload.hospital_id, payload.test_name, payload.price || 0]
  );
}

function reports() {
  return query(`SELECT * FROM lab_reports ORDER BY created_at DESC, id DESC`);
}

function createReport(payload) {
  return query(
    `INSERT INTO lab_reports (patient_id, test_name, result, status, report_date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      payload.patient_id || null,
      payload.test_name || payload.order_id || "Lab Report",
      payload.result || null,
      payload.status || "completed",
      payload.report_date || new Date().toISOString().slice(0, 10),
    ]
  );
}

async function getReport(id) {
  const rows = await query(`SELECT * FROM lab_reports WHERE id = ?`, [id]);
  return rows[0] || null;
}

module.exports = { tests, createTest, reports, createReport, getReport };
