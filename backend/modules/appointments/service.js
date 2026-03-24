const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

let cachedSelectSql = null;
let cachedSelectSqlBuiltAt = 0;

async function buildSelectSql() {
  // Rebuild occasionally to accommodate schema drift while dev server is running.
  if (cachedSelectSql && Date.now() - cachedSelectSqlBuiltAt < 60_000) return cachedSelectSql;

  const patientCols = (await getTableColumns("patients")) || new Set();
  const doctorCols = (await getTableColumns("doctors")) || new Set();

  const patientFullNameCol = firstExistingColumn(patientCols, ["full_name", "name"]);
  const patientFirstNameCol = firstExistingColumn(patientCols, ["first_name"]);
  const patientLastNameCol = firstExistingColumn(patientCols, ["last_name"]);
  const patientEmailCol = firstExistingColumn(patientCols, ["email"]);
  const patientPhoneCol = firstExistingColumn(patientCols, ["phone", "mobile"]);
  const patientGenderCol = firstExistingColumn(patientCols, ["gender"]);
  const patientBloodGroupCol = firstExistingColumn(patientCols, ["blood_group"]);

  const doctorFullNameCol = firstExistingColumn(doctorCols, ["full_name", "name"]);
  const doctorFirstNameCol = firstExistingColumn(doctorCols, ["first_name"]);
  const doctorLastNameCol = firstExistingColumn(doctorCols, ["last_name"]);

  const patientNameExpr = patientFullNameCol
    ? `p.\`${patientFullNameCol}\``
    : patientFirstNameCol || patientLastNameCol
    ? `CONCAT_WS(' ', ${patientFirstNameCol ? `p.\`${patientFirstNameCol}\`` : "NULL"}, ${patientLastNameCol ? `p.\`${patientLastNameCol}\`` : "NULL"})`
    : "NULL";

  const doctorNameExpr = doctorFullNameCol
    ? `d.\`${doctorFullNameCol}\``
    : doctorFirstNameCol || doctorLastNameCol
    ? `CONCAT_WS(' ', ${doctorFirstNameCol ? `d.\`${doctorFirstNameCol}\`` : "NULL"}, ${doctorLastNameCol ? `d.\`${doctorLastNameCol}\`` : "NULL"})`
    : "NULL";

  const select = [
    "a.*",
    "h.name AS hospital_name",
    `${patientNameExpr} AS patient_name`,
    `${doctorNameExpr} AS doctor_name`,
    patientEmailCol ? `p.\`${patientEmailCol}\` AS patient_email` : "NULL AS patient_email",
    patientPhoneCol ? `p.\`${patientPhoneCol}\` AS patient_phone` : "NULL AS patient_phone",
    patientGenderCol ? `p.\`${patientGenderCol}\` AS patient_gender` : "NULL AS patient_gender",
    patientBloodGroupCol ? `p.\`${patientBloodGroupCol}\` AS patient_blood_group` : "NULL AS patient_blood_group",
  ];

  cachedSelectSql = `SELECT ${select.join(", ")}
    FROM appointments a
    LEFT JOIN hospitals h ON h.id = a.hospital_id
    LEFT JOIN patients p ON p.id = a.patient_id
    LEFT JOIN doctors d ON d.id = a.doctor_id`;
  cachedSelectSqlBuiltAt = Date.now();
  return cachedSelectSql;
}

async function selectSql(where = "", params = []) {
  const base = await buildSelectSql();
  return query(
    `${base}
     ${where}
     ORDER BY a.appointment_date DESC, a.appointment_time DESC, a.id DESC`,
    params
  );
}

async function list(hospitalId) {
  return hospitalId ? selectSql(`WHERE a.hospital_id = ?`, [hospitalId]) : selectSql();
}

function create(payload, hospitalId) {
  return query(
    `INSERT INTO appointments (hospital_id, patient_id, doctor_id, appointment_date, appointment_time, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      hospitalId || payload.hospital_id,
      payload.patient_id,
      payload.doctor_id,
      payload.appointment_date,
      payload.appointment_time,
      payload.status || "scheduled",
    ]
  );
}

async function getById(id) {
  const rows = await selectSql(`WHERE a.id = ?`, [id]);
  return rows[0] || null;
}

function update(id, payload) {
  return query(
    `UPDATE appointments
     SET appointment_date = COALESCE(?, appointment_date),
         appointment_time = COALESCE(?, appointment_time),
         status = COALESCE(?, status)
     WHERE id = ?`,
    [
      payload.appointment_date || null,
      payload.appointment_time || null,
      payload.status || null,
      id,
    ]
  );
}

function remove(id) { return query(`DELETE FROM appointments WHERE id = ?`, [id]); }
async function byDoctor(doctorId) { return selectSql(`WHERE a.doctor_id = ?`, [doctorId]); }
async function byPatient(patientId) { return selectSql(`WHERE a.patient_id = ?`, [patientId]); }

module.exports = { list, create, getById, update, remove, byDoctor, byPatient };
