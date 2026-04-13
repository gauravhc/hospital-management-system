<<<<<<< HEAD
const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");
=======
const { getConnection, query } = require("../../config/database");
const { getHospitalColumn, getTableColumns, firstExistingColumn } = require("../../services/dbMeta");
>>>>>>> 7fdfd7e (committing the changes)

async function getSortClause(table, aliases = []) {
  const cols = await getTableColumns(table);
  const sortCol = firstExistingColumn(cols, aliases);
  return sortCol ? `\`${sortCol}\` DESC` : "`id` DESC";
}

<<<<<<< HEAD
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
=======
async function tests(hospitalId, filters = {}) {
  const params = [];
  let sql = `SELECT * FROM lab_tests`;
  const where = [];
  const hospitalCol = await getHospitalColumn("lab_tests");
  const orderBy = await getSortClause("lab_tests", ["created_at", "updated_at", "test_date", "id"]);

  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }
  if (filters.patient_id) {
    where.push("patient_id = ?");
    params.push(filters.patient_id);
  }
  if (filters.status) {
    where.push("status = ?");
    params.push(filters.status);
  }

  if (where.length) {
    sql += ` WHERE ${where.join(" AND ")}`;
  }

  sql += ` ORDER BY ${orderBy}`;
  return query(sql, params);
}

async function createTest(payload, hospitalId) {
  if (!payload.patient_id) {
    throw new Error("patient_id is required");
  }

  return query(
    `INSERT INTO lab_tests (hospital_id, patient_id, doctor_id, test_name, test_code, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
>>>>>>> 7fdfd7e (committing the changes)
    [
      hospitalId || payload.hospital_id,
      payload.patient_id,
      payload.doctor_id || null,
      payload.test_name,
      payload.test_code || null,
      payload.status || "ordered",
      payload.notes || null,
    ]
  );
}

async function reports(hospitalId, filters = {}) {
  const reportCols = await getTableColumns("lab_reports");
  const patientCols = await getTableColumns("patients");
  const doctorCols = await getTableColumns("doctors");
  const params = [];
  const reportDoctorCol = firstExistingColumn(reportCols, ["doctor_id", "doctorId"]);
  const reportPatientCol = firstExistingColumn(reportCols, ["patient_id", "patientId"]);
  const reportTitleCol = firstExistingColumn(reportCols, ["title", "test_name", "testName"]);
  const reportSummaryCol = firstExistingColumn(reportCols, ["result_summary", "findings", "notes", "comment", "comments", "description"]);
  const reportFileCol = firstExistingColumn(reportCols, ["file_url", "report_url"]);
  const reportResultCol = firstExistingColumn(reportCols, ["result"]);
  const patientNameCol = firstExistingColumn(patientCols, ["full_name", "name", "first_name"]);
  const doctorNameCol = firstExistingColumn(doctorCols, ["full_name", "name", "first_name"]);
  const patientNameSelect = patientNameCol ? `p.\`${patientNameCol}\` AS patient_name` : "NULL AS patient_name";
  const doctorNameSelect = doctorNameCol ? `d.\`${doctorNameCol}\` AS doctor_name` : "NULL AS doctor_name";
  const fileUrlSelect = reportFileCol ? `lr.\`${reportFileCol}\` AS file_url` : "NULL AS file_url";
  const rawResultSelect = reportResultCol ? `lr.\`${reportResultCol}\` AS raw_result` : "NULL AS raw_result";
  const titleSelect = reportTitleCol ? `lr.\`${reportTitleCol}\` AS normalized_title` : "NULL AS normalized_title";
  const summarySelect = reportSummaryCol ? `lr.\`${reportSummaryCol}\` AS normalized_summary` : "NULL AS normalized_summary";

  let sql = `SELECT lr.*, ${patientNameSelect}, ${doctorNameSelect}, ${fileUrlSelect}, ${rawResultSelect}, ${titleSelect}, ${summarySelect} FROM lab_reports lr`;
  if (reportPatientCol) {
    sql += ` LEFT JOIN patients p ON p.id = lr.\`${reportPatientCol}\``;
  }
  if (reportDoctorCol) {
    sql += ` LEFT JOIN doctors d ON d.id = lr.\`${reportDoctorCol}\``;
  }
  const where = [];
  const hospitalCol = await getHospitalColumn("lab_reports");
  const orderBy = await getSortClause("lab_reports", ["created_at", "updated_at", "report_date", "id"]);

  if (hospitalId && hospitalCol) {
    where.push(`lr.\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }
  if (filters.patient_id) {
    where.push(`lr.\`${reportPatientCol || "patient_id"}\` = ?`);
    params.push(filters.patient_id);
  }
  if (filters.test_id) {
    where.push("lr.test_id = ?");
    params.push(filters.test_id);
  }
  if (filters.doctor_id && reportDoctorCol) {
    where.push(`lr.\`${reportDoctorCol}\` = ?`);
    params.push(filters.doctor_id);
  }

  if (where.length) {
    sql += ` WHERE ${where.join(" AND ")}`;
  }

  sql += ` ORDER BY ${orderBy}`;
  const rows = await query(sql, params);
  return rows.map((row) => {
    let resolvedFileUrl = row.file_url || null;

    if (!resolvedFileUrl && row.raw_result) {
      try {
        const parsed = JSON.parse(row.raw_result);
        if (Array.isArray(parsed) && parsed[0]) {
          resolvedFileUrl = parsed[0];
        } else if (typeof parsed === "string" && parsed) {
          resolvedFileUrl = parsed;
        }
      } catch {
        if (String(row.raw_result || "").startsWith("/uploads/")) {
          resolvedFileUrl = row.raw_result;
        }
      }
    }

    return {
      ...row,
      title: row.normalized_title || row.title || row.test_name || row.testName || "Lab Report",
      result_summary: row.normalized_summary || row.result_summary || row.findings || row.notes || null,
      file_url: resolvedFileUrl,
    };
  });
}

async function createReport(payload, hospitalId) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [testRows] = payload.test_id
      ? await connection.execute(`SELECT * FROM lab_tests WHERE id = ? LIMIT 1`, [payload.test_id])
      : [[]];
    const test = testRows[0] || null;

    const resolvedHospitalId = hospitalId || payload.hospital_id || test?.hospital_id || null;
    const resolvedPatientId = payload.patient_id || test?.patient_id || null;
    const resolvedDoctorId = payload.doctor_id || test?.doctor_id || null;

    if (!resolvedHospitalId || !resolvedPatientId) {
      throw new Error("hospital_id and patient_id are required");
    }

    await connection.execute(
      `INSERT INTO lab_reports (hospital_id, patient_id, doctor_id, test_id, title, findings, result_summary, file_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolvedHospitalId,
        resolvedPatientId,
        resolvedDoctorId,
        payload.test_id || null,
        payload.title || payload.test_name || test?.test_name || "Lab Report",
        payload.findings || null,
        payload.result_summary || payload.result || null,
        payload.file_url || null,
        payload.status || "final",
      ]
    );

    if (payload.test_id) {
      await connection.execute(
        `UPDATE lab_tests SET status = 'completed', notes = COALESCE(?, notes) WHERE id = ?`,
        [payload.notes || null, payload.test_id]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getReport(id) {
  const rows = await query(`SELECT * FROM lab_reports WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function updateReportFile(id, fileUrl) {
  await query(
    `UPDATE lab_reports SET file_url = ?, status = 'final', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [fileUrl, id]
  );
  return getReport(id);
}

function reportsByPatient(patientId, hospitalId) {
  return reports(hospitalId, { patient_id: patientId });
}

module.exports = { tests, createTest, reports, createReport, getReport, updateReportFile, reportsByPatient };
