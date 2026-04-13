const { query } = require("../../config/database");
<<<<<<< HEAD
const { getTableColumns } = require("../../services/dbMeta");
=======
const { getHospitalColumn, getTableColumns, firstExistingColumn } = require("../../services/dbMeta");
>>>>>>> 7fdfd7e (committing the changes)

async function buildOrderBy(table) {
  const cols = await getTableColumns(table);
  const createdAtCol = firstExistingColumn(cols, ["created_at"]);
  const idCol = firstExistingColumn(cols, ["id", "claim_id", "policy_id"]);
  const parts = [];
  if (createdAtCol) parts.push(`\`${createdAtCol}\` DESC`);
  if (idCol) parts.push(`\`${idCol}\` DESC`);
  return parts.length ? ` ORDER BY ${parts.join(", ")}` : "";
}

async function patientInsuranceDetails(hospitalId, patientId = null) {
  const hospitalCol = await getHospitalColumn("patient_insurance_details");
  const cols = await getTableColumns("patient_insurance_details");
  const patientCol = firstExistingColumn(cols, ["patient_id"]);
  const orderBy = await buildOrderBy("patient_insurance_details");
  const where = [];
  const params = [];

  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }
  if (patientId && patientCol) {
    where.push(`\`${patientCol}\` = ?`);
    params.push(patientId);
  }

  return query(
    `SELECT * FROM patient_insurance_details${where.length ? ` WHERE ${where.join(" AND ")}` : ""}${orderBy}`,
    params
  );
}

async function createPatientInsuranceDetail(payload, hospitalId) {
  const cols = await getTableColumns("patient_insurance_details");
  if (!cols) throw new Error("patient_insurance_details table not found");

  const patientId = payload.patient_id || null;
  const providerName = String(payload.provider_name || "").trim();
  const policyNumber = String(payload.policy_number || "").trim();

  if (!patientId || !providerName || !policyNumber) {
    throw new Error("patient_id, provider_name and policy_number are required");
  }

  const values = {};
  if (cols.has("hospital_id")) values.hospital_id = hospitalId || payload.hospital_id || null;
  if (cols.has("patient_id")) values.patient_id = patientId;
  if (cols.has("policy_id")) values.policy_id = payload.policy_id || null;
  if (cols.has("provider_name")) values.provider_name = providerName;
  if (cols.has("policy_number")) values.policy_number = policyNumber;
  if (cols.has("plan_name")) values.plan_name = payload.plan_name || null;
  if (cols.has("coverage_details")) values.coverage_details = payload.coverage_details || null;
  if (cols.has("valid_till")) values.valid_till = payload.valid_till || null;
  if (cols.has("status")) values.status = payload.status || "active";
  if (cols.has("notes")) values.notes = payload.notes || null;

  const insertCols = Object.keys(values);
  return query(
    `INSERT INTO patient_insurance_details (${insertCols.map((col) => `\`${col}\``).join(", ")})
     VALUES (${insertCols.map(() => "?").join(", ")})`,
    insertCols.map((col) => values[col])
  );
}

async function updatePatientInsuranceDetail(id, payload) {
  const cols = await getTableColumns("patient_insurance_details");
  if (!cols) throw new Error("patient_insurance_details table not found");

  const updates = [];
  const params = [];

  const assignIfPresent = (column, value) => {
    if (!cols.has(column) || value === undefined) return;
    updates.push(`\`${column}\` = ?`);
    params.push(value);
  };

  assignIfPresent("policy_id", payload.policy_id || null);
  assignIfPresent("provider_name", payload.provider_name || null);
  assignIfPresent("policy_number", payload.policy_number || null);
  assignIfPresent("plan_name", payload.plan_name || null);
  assignIfPresent("coverage_details", payload.coverage_details || null);
  assignIfPresent("valid_till", payload.valid_till || null);
  assignIfPresent("status", payload.status || null);
  assignIfPresent("notes", payload.notes || null);

  if (!updates.length) return { affectedRows: 0 };

  params.push(id);
  return query(
    `UPDATE patient_insurance_details SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
}

async function claims(hospitalId) {
  const hospitalCol = await getHospitalColumn("claims");
  const orderBy = await buildOrderBy("claims");
  return hospitalId && hospitalCol
    ? query(`SELECT * FROM claims WHERE \`${hospitalCol}\` = ?${orderBy}`, [hospitalId])
    : query(`SELECT * FROM claims${orderBy}`);
}

async function claimsByPatient(patientId, hospitalId = null) {
  const cols = await getTableColumns("claims");
  if (!cols) throw new Error("claims table not found");

  const patientCol = firstExistingColumn(cols, ["patient_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
  const orderBy = await buildOrderBy("claims");
  const where = [];
  const params = [];

  if (patientCol) {
    where.push(`\`${patientCol}\` = ?`);
    params.push(patientId);
  }
  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  return query(`SELECT * FROM claims${where.length ? ` WHERE ${where.join(" AND ")}` : ""}${orderBy}`, params);
}

async function createClaim(payload, hospitalId) {
  const cols = await getTableColumns("claims");
  if (!cols) throw new Error("claims table not found");

  const values = {};
  if (cols.has("hospital_id")) values.hospital_id = hospitalId || payload.hospital_id || null;
  if (cols.has("patient_id")) values.patient_id = payload.patient_id || null;
  if (cols.has("invoice_id")) values.invoice_id = payload.invoice_id || null;
  if (cols.has("policy_id")) values.policy_id = payload.policy_id || null;
  if (cols.has("amount")) values.amount = payload.amount || 0;
  else if (cols.has("claim_amount")) values.claim_amount = payload.amount || 0;
  if (cols.has("status")) values.status = payload.status || "submitted";
  if (cols.has("notes")) values.notes = payload.notes || null;
  else if (cols.has("remark")) values.remark = payload.notes || null;
  else if (cols.has("remarks")) values.remarks = payload.notes || null;
  const attachmentCol = firstExistingColumn(cols, ["attachment_url", "document_url", "file_url", "attachment_path", "file_path"]);
  if (attachmentCol) values[attachmentCol] = payload.attachment_url || payload.document_url || payload.file_url || null;

  const insertCols = Object.keys(values);
  return query(
    `INSERT INTO claims (${insertCols.map((col) => `\`${col}\``).join(", ")})
     VALUES (${insertCols.map(() => "?").join(", ")})`,
    insertCols.map((col) => values[col])
  );
}

function updateClaim(id, payload) {
  return query(`UPDATE claims SET status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?`, [payload.status || null, payload.notes || null, id]);
}

async function policies(hospitalId) {
  const hospitalCol = await getHospitalColumn("insurance_policies");
  const cols = await getTableColumns("insurance_policies");
  const idCol = firstExistingColumn(cols, ["id"]);
  const providerCol = firstExistingColumn(cols, ["provider_name", "provider"]);
  const policyNameCol = firstExistingColumn(cols, ["policy_name", "plan_name", "name"]);
  const policyNumberCol = firstExistingColumn(cols, ["policy_number"]);
  const coverageCol = firstExistingColumn(cols, ["coverage_details", "coverage"]);
  const activeCol = firstExistingColumn(cols, ["is_active", "status"]);
  const orderBy = await buildOrderBy("insurance_policies");
  const sql = `SELECT
      ${idCol ? `\`${idCol}\`` : "NULL"} AS id,
      ${providerCol ? `\`${providerCol}\`` : "NULL"} AS provider_name,
      ${policyNameCol ? `\`${policyNameCol}\`` : "NULL"} AS policy_name,
      ${policyNumberCol ? `\`${policyNumberCol}\`` : "NULL"} AS policy_number,
      ${coverageCol ? `\`${coverageCol}\`` : "NULL"} AS coverage_details,
      ${activeCol ? `\`${activeCol}\`` : "NULL"} AS is_active
    FROM insurance_policies`;
  return hospitalId && hospitalCol
    ? query(`${sql} WHERE \`${hospitalCol}\` = ?${orderBy}`, [hospitalId])
    : query(`${sql}${orderBy}`);
}

async function createPolicy(payload, hospitalId) {
  const cols = await getTableColumns("insurance_policies");
  if (!cols) throw new Error("insurance_policies table not found");

  const values = {};
  if (cols.has("hospital_id")) values.hospital_id = hospitalId || payload.hospital_id || null;
  if (cols.has("provider_name")) values.provider_name = payload.provider_name;
  else if (cols.has("provider")) values.provider = payload.provider_name;
  if (cols.has("policy_name")) values.policy_name = payload.policy_name;
  else if (cols.has("plan_name")) values.plan_name = payload.policy_name;
  else if (cols.has("name")) values.name = payload.policy_name;
  if (cols.has("policy_number")) values.policy_number = payload.policy_number || null;
  if (cols.has("coverage_details")) values.coverage_details = payload.coverage_details || null;
  else if (cols.has("coverage")) values.coverage = payload.coverage_details || null;
  if (cols.has("is_active")) values.is_active = payload.is_active !== false;
  else if (cols.has("status")) values.status = payload.is_active === false ? "inactive" : "active";

  const insertCols = Object.keys(values);
  return query(
    `INSERT INTO insurance_policies (${insertCols.map((col) => `\`${col}\``).join(", ")})
     VALUES (${insertCols.map(() => "?").join(", ")})`,
    insertCols.map((col) => values[col])
  );
}
<<<<<<< HEAD

async function createPatientInsurance(payload = {}, hospitalId = null) {
  const cols = await getTableColumns("patient_insurance");
  if (!cols) throw new Error("patient_insurance table not found");

  const values = {};
  const add = (name, value) => {
    if (!cols.has(name)) return;
    values[name] = value ?? null;
  };

  add("patient_id", payload.patient_id);
  add("hospital_id", hospitalId || payload.hospital_id || null);
  add("aadhaar_number", payload.aadhaar_number || null);
  add("pan_number", payload.pan_number || null);
  add("aadhaar_photo", payload.aadhaar_photo || null);
  add("pan_photo", payload.pan_photo || null);
  add("insurance_number", payload.insurance_number || null);
  add("policy_id", payload.policy_id || null);
  add("insurance_card_photo", payload.insurance_card_photo || null);
  add("validity_date", payload.validity_date || null);
  add("claim_amount", payload.claim_amount ?? null);

  const insertCols = Object.keys(values);
  const placeholders = insertCols.map(() => "?").join(", ");

  return query(
    `INSERT INTO patient_insurance (${insertCols.map((c) => `\`${c}\``).join(", ")})
     VALUES (${placeholders})`,
    insertCols.map((c) => values[c])
  );
}

async function getPatientInsurance(patientId) {
  const cols = await getTableColumns("patient_insurance");
  if (!cols) return [];

  const orderBy = cols.has("created_at")
    ? "created_at DESC"
    : cols.has("id")
      ? "id DESC"
      : "patient_id DESC";

  const rows = await query(`SELECT * FROM patient_insurance WHERE patient_id = ? ORDER BY ${orderBy}`, [patientId]);
  return rows;
}

module.exports = {
  claims,
=======
module.exports = {
  claims,
  claimsByPatient,
>>>>>>> 7fdfd7e (committing the changes)
  createClaim,
  updateClaim,
  policies,
  createPolicy,
<<<<<<< HEAD
  createPatientInsurance,
  getPatientInsurance,
=======
  patientInsuranceDetails,
  createPatientInsuranceDetail,
  updatePatientInsuranceDetail,
>>>>>>> 7fdfd7e (committing the changes)
};
