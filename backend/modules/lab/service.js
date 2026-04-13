const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

function tests(hospitalId) {
  return hospitalId
    ? query(`SELECT * FROM lab_tests WHERE hospital_id = ? ORDER BY id DESC`, [hospitalId])
    : query(`SELECT * FROM lab_tests ORDER BY id DESC`);
}

async function createTest(payload, hospitalId) {
  const cols = await getTableColumns("lab_tests");
  if (!cols) throw new Error("lab_tests table not found");

  const patientId = payload.patient_id || payload.patientId || null;
  const testName = payload.test_name || payload.testName || null;
  if (!patientId || !testName) {
    throw new Error("patient_id and test_name are required");
  }

  const record = {};
  const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);
  if (hospitalCol) record[hospitalCol] = hospitalId || payload.hospital_id || null;

  const patientCol = firstExistingColumn(cols, ["patient_id", "patientId"]);
  if (patientCol) record[patientCol] = patientId;

  const doctorCol = firstExistingColumn(cols, ["doctor_id", "doctorId"]);
  if (doctorCol) record[doctorCol] = payload.doctor_id || payload.doctorId || null;

  const testNameCol = firstExistingColumn(cols, ["test_name", "name", "test"]);
  if (testNameCol) record[testNameCol] = String(testName).trim();

  const testCodeCol = firstExistingColumn(cols, ["test_code", "code"]);
  if (testCodeCol) record[testCodeCol] = payload.test_code || payload.testCode || null;

  const categoryCol = firstExistingColumn(cols, ["category", "department"]);
  if (categoryCol) record[categoryCol] = payload.category || null;

  const priceCol = firstExistingColumn(cols, ["price", "amount"]);
  if (priceCol) record[priceCol] = payload.price ?? 0;

  const statusCol = firstExistingColumn(cols, ["status"]);
  if (statusCol) record[statusCol] = payload.status || "ordered";

  const notesCol = firstExistingColumn(cols, ["notes", "note", "remarks"]);
  if (notesCol) record[notesCol] = payload.notes || null;

  const orderedAtCol = firstExistingColumn(cols, ["ordered_at"]);
  if (orderedAtCol) record[orderedAtCol] = new Date();

  const insertCols = Object.keys(record).filter((k) => cols.has(k));
  const placeholders = insertCols.map(() => "?").join(", ");
  const values = insertCols.map((k) => record[k]);

  return query(
    `INSERT INTO lab_tests (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
    values
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
