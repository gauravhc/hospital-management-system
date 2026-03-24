const { query } = require("../../config/database");

function appointments(hospitalId) {
  const sql = `SELECT appointment_date, status, COUNT(*) AS total
               FROM appointments ${hospitalId ? "WHERE hospital_id = ?" : ""}
               GROUP BY appointment_date, status
               ORDER BY appointment_date DESC`;
  return query(sql, hospitalId ? [hospitalId] : []);
}
function revenue(hospitalId) {
  const sql = `SELECT DATE(created_at) AS day, SUM(total_amount) AS revenue
               FROM invoices ${hospitalId ? "WHERE hospital_id = ?" : ""}
               GROUP BY DATE(created_at)
               ORDER BY day DESC`;
  return query(sql, hospitalId ? [hospitalId] : []);
}
function patientVisits(hospitalId) {
  const sql = `SELECT patient_id, COUNT(*) AS visits
               FROM appointments ${hospitalId ? "WHERE hospital_id = ?" : ""}
               GROUP BY patient_id
               ORDER BY visits DESC`;
  return query(sql, hospitalId ? [hospitalId] : []);
}
function lab(hospitalId) {
  const sql = `SELECT status, COUNT(*) AS total
               FROM lab_reports ${hospitalId ? "WHERE hospital_id = ?" : ""}
               GROUP BY status`;
  return query(sql, hospitalId ? [hospitalId] : []);
}
function pharmacy(hospitalId) {
  const sql = `SELECT category, SUM(stock_quantity) AS total_stock
               FROM pharmacy_medicines ${hospitalId ? "WHERE hospital_id = ?" : ""}
               GROUP BY category`;
  return query(sql, hospitalId ? [hospitalId] : []);
}
module.exports = { appointments, revenue, patientVisits, lab, pharmacy };
