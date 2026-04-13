const { query } = require("../../config/database");
const { getHospitalColumn, getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

async function appointments(hospitalId) {
  const hospitalCol = await getHospitalColumn("appointments");
  const sql = `SELECT appointment_date, status, COUNT(*) AS total
               FROM appointments ${hospitalId && hospitalCol ? `WHERE \`${hospitalCol}\` = ?` : ""}
               GROUP BY appointment_date, status
               ORDER BY appointment_date DESC`;
  return query(sql, hospitalId && hospitalCol ? [hospitalId] : []);
}
async function revenue(hospitalId) {
  const hospitalCol = await getHospitalColumn("invoices");
  const sql = `SELECT DATE(created_at) AS day, SUM(total_amount) AS revenue
               FROM invoices ${hospitalId && hospitalCol ? `WHERE \`${hospitalCol}\` = ?` : ""}
               GROUP BY DATE(created_at)
               ORDER BY day DESC`;
  return query(sql, hospitalId && hospitalCol ? [hospitalId] : []);
}
async function patientVisits(hospitalId) {
  const hospitalCol = await getHospitalColumn("appointments");
  const sql = `SELECT patient_id, COUNT(*) AS visits
               FROM appointments ${hospitalId && hospitalCol ? `WHERE \`${hospitalCol}\` = ?` : ""}
               GROUP BY patient_id
               ORDER BY visits DESC`;
  return query(sql, hospitalId && hospitalCol ? [hospitalId] : []);
}
async function lab(hospitalId) {
  const hospitalCol = await getHospitalColumn("lab_reports");
  const sql = `SELECT status, COUNT(*) AS total
               FROM lab_reports ${hospitalId && hospitalCol ? `WHERE \`${hospitalCol}\` = ?` : ""}
               GROUP BY status`;
  return query(sql, hospitalId && hospitalCol ? [hospitalId] : []);
}
async function pharmacy(hospitalId) {
  const hospitalCol = await getHospitalColumn("pharmacy_medicines");
  const sql = `SELECT category, SUM(stock_quantity) AS total_stock
               FROM pharmacy_medicines ${hospitalId && hospitalCol ? `WHERE \`${hospitalCol}\` = ?` : ""}
               GROUP BY category`;
  return query(sql, hospitalId && hospitalCol ? [hospitalId] : []);
}

async function recentBillingHistory(hospitalId) {
  const invoiceHospitalCol = await getHospitalColumn("invoices");
  const patientHospitalCol = await getHospitalColumn("patients");

  const whereParts = [];
  const params = [];

  if (hospitalId && invoiceHospitalCol) {
    whereParts.push(`(i.\`${invoiceHospitalCol}\` = ? OR i.\`${invoiceHospitalCol}\` IS NULL)`);
    params.push(hospitalId);
  } else if (hospitalId && patientHospitalCol) {
    whereParts.push(`(p.\`${patientHospitalCol}\` = ? OR p.\`${patientHospitalCol}\` IS NULL)`);
    params.push(hospitalId);
  }

  const sql = `
    SELECT
      i.*,
      p.full_name AS patient_name,
      p.phone AS patient_phone,
      pay.method AS payment_method,
      pay.reference_no,
      pay.status AS payment_record_status
    FROM invoices i
    LEFT JOIN patients p ON p.id = i.patient_id
    LEFT JOIN (
      SELECT p1.*
      FROM payments p1
      INNER JOIN (
        SELECT invoice_id, MAX(id) AS latest_id
        FROM payments
        GROUP BY invoice_id
      ) latest ON latest.latest_id = p1.id
    ) pay ON pay.invoice_id = i.id
    ${whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : ""}
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT 20
  `;

  return query(sql, params);
}

async function patientReport(patientId, hospitalId) {
  const patientCols = await getTableColumns("patients");
  const patientHospitalCol = await getHospitalColumn("patients");
  const appointmentHospitalCol = await getHospitalColumn("appointments");
  const invoiceHospitalCol = await getHospitalColumn("invoices");
  const externalPatientIdCol = firstExistingColumn(patientCols, ["patient_id", "patient_id_no"]);

  const patientIdWhere = ["id = ?"];
  const patientParams = [patientId];
  if (externalPatientIdCol) {
    patientIdWhere.push(`\`${externalPatientIdCol}\` = ?`);
    patientParams.push(patientId);
  }

  const patientWhere = [`(${patientIdWhere.join(" OR ")})`];
  if (hospitalId && patientHospitalCol) {
    patientWhere.push(`(\`${patientHospitalCol}\` = ? OR \`${patientHospitalCol}\` IS NULL)`);
    patientParams.push(hospitalId);
  }

  const patientRows = await query(
    `SELECT * FROM patients WHERE ${patientWhere.join(" AND ")} LIMIT 1`,
    patientParams
  );

  const patient = patientRows[0] || null;
  if (!patient) return null;

  const appointmentWhere = ["a.patient_id = ?"];
  const appointmentParams = [patient.id];
  if (hospitalId && appointmentHospitalCol) {
    appointmentWhere.push(`(a.\`${appointmentHospitalCol}\` = ? OR a.\`${appointmentHospitalCol}\` IS NULL)`);
    appointmentParams.push(hospitalId);
  }

  const appointmentsSql = `
    SELECT
      a.*,
      d.full_name AS doctor_name
    FROM appointments a
    LEFT JOIN doctors d ON d.id = a.doctor_id
    WHERE ${appointmentWhere.join(" AND ")}
    ORDER BY a.appointment_date DESC, a.appointment_time DESC, a.id DESC
  `;

  const invoiceWhere = ["i.patient_id = ?"];
  const invoiceParams = [patient.id];
  if (hospitalId && invoiceHospitalCol) {
    invoiceWhere.push(`(i.\`${invoiceHospitalCol}\` = ? OR i.\`${invoiceHospitalCol}\` IS NULL)`);
    invoiceParams.push(hospitalId);
  }

  const invoicesSql = `
    SELECT
      i.*,
      pay.method AS payment_method,
      pay.reference_no,
      pay.status AS payment_record_status
    FROM invoices i
    LEFT JOIN (
      SELECT p1.*
      FROM payments p1
      INNER JOIN (
        SELECT invoice_id, MAX(id) AS latest_id
        FROM payments
        GROUP BY invoice_id
      ) latest ON latest.latest_id = p1.id
    ) pay ON pay.invoice_id = i.id
    WHERE ${invoiceWhere.join(" AND ")}
    ORDER BY i.created_at DESC, i.id DESC
  `;

  const [appointmentsRows, invoiceRows, invoiceItemRows] = await Promise.all([
    query(appointmentsSql, appointmentParams),
    query(invoicesSql, invoiceParams),
    query(
      `SELECT ii.* FROM invoice_items ii
       INNER JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.patient_id = ?
       ORDER BY ii.id DESC`,
      [patient.id]
    ),
  ]);

  const itemsByInvoiceId = invoiceItemRows.reduce((acc, row) => {
    const key = String(row.invoice_id);
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return {
    patient: {
      ...patient,
      patient_id: patient.patient_id || patient.patient_id_no || patient.id,
      name: patient.full_name || patient.name || "",
      mobile: patient.phone || patient.mobile || "",
    },
    appointments: appointmentsRows.map((row) => ({
      ...row,
      date: row.appointment_date,
      time: row.appointment_time,
    })),
    bills: invoiceRows.map((row) => ({
      ...row,
      payment_status: row.payment_status || row.status || "unpaid",
      grand_total: row.grand_total || row.total_amount || 0,
      payment_method: row.payment_method || null,
      reference_no: row.reference_no || null,
      items: itemsByInvoiceId[String(row.id)] || [],
    })),
  };
}

async function generatePatientReport(patientId, hospitalId) {
  const report = await patientReport(patientId, hospitalId);
  if (!report) return null;

  return {
    generated_at: new Date().toISOString(),
    patient_id: report.patient?.patient_id || patientId,
    patient_name: report.patient?.name || "",
    appointments: report.appointments.length,
    bills: report.bills.length,
    total_billed: report.bills.reduce((sum, entry) => sum + Number(entry.total_amount || entry.grand_total || 0), 0),
  };
}

module.exports = {
  appointments,
  revenue,
  patientVisits,
  lab,
  pharmacy,
  recentBillingHistory,
  patientReport,
  generatePatientReport,
};
