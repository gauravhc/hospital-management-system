import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";

const firstExistingColumn = (columns, candidates) =>
  candidates.find((candidate) => columns?.has(candidate)) || null;

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function getInsuranceDetails({ hospitalId = null } = {}) {
  const cols = await getTableColumns("patient_insurance_details");
  if (!cols) return [];

  const idCol = firstExistingColumn(cols, ["id"]);
  const hospitalIdCol = firstExistingColumn(cols, ["hospital_id"]);
  const patientIdCol = firstExistingColumn(cols, ["patient_id"]);
  const policyIdCol = firstExistingColumn(cols, ["policy_id"]);
  const providerNameCol = firstExistingColumn(cols, ["provider_name"]);
  const policyNumberCol = firstExistingColumn(cols, ["policy_number"]);
  const planNameCol = firstExistingColumn(cols, ["plan_name"]);
  const coverageCol = firstExistingColumn(cols, ["coverage_details"]);
  const validTillCol = firstExistingColumn(cols, ["valid_till"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const notesCol = firstExistingColumn(cols, ["notes"]);
  const createdAtCol = firstExistingColumn(cols, ["created_at"]);

  const params = [];
  const where = hospitalId && hospitalIdCol ? `WHERE \`${hospitalIdCol}\` = ?` : "";
  if (hospitalId && hospitalIdCol) params.push(hospitalId);

  const [rows] = await db.query(
    `
      SELECT
        ${idCol ? `\`${idCol}\`` : "NULL"} AS id,
        ${hospitalIdCol ? `\`${hospitalIdCol}\`` : "NULL"} AS hospital_id,
        ${patientIdCol ? `\`${patientIdCol}\`` : "NULL"} AS patient_id,
        ${policyIdCol ? `\`${policyIdCol}\`` : "NULL"} AS policy_id,
        ${providerNameCol ? `\`${providerNameCol}\`` : "NULL"} AS provider_name,
        ${policyNumberCol ? `\`${policyNumberCol}\`` : "NULL"} AS policy_number,
        ${planNameCol ? `\`${planNameCol}\`` : "NULL"} AS plan_name,
        ${coverageCol ? `\`${coverageCol}\`` : "NULL"} AS coverage_details,
        ${validTillCol ? `\`${validTillCol}\`` : "NULL"} AS valid_till,
        ${statusCol ? `\`${statusCol}\`` : "NULL"} AS status,
        ${notesCol ? `\`${notesCol}\`` : "NULL"} AS notes
      FROM patient_insurance_details
      ${where}
      ORDER BY ${createdAtCol ? `\`${createdAtCol}\` DESC, ` : ""}${idCol ? `\`${idCol}\`` : "1"} DESC
    `,
    params
  );

  return rows;
}

export async function createInsuranceDetail({
  hospital_id,
  patient_id,
  policy_id,
  provider_name,
  policy_number,
  plan_name,
  coverage_details,
  valid_till,
  status,
  notes,
}) {
  const cols = await getTableColumns("patient_insurance_details");
  if (!cols) {
    throw new Error("patient_insurance_details table not found.");
  }

  const resolvedPatientId = toNumberOrNull(patient_id);
  const resolvedHospitalId = hospital_id ? toNumberOrNull(hospital_id) ?? hospital_id : null;
  const resolvedPolicyId = toNumberOrNull(policy_id);
  const resolvedProviderName = String(provider_name || "").trim();
  const resolvedPolicyNumber = String(policy_number || "").trim();

  if (!resolvedPatientId || !resolvedProviderName || !resolvedPolicyNumber) {
    throw new Error("patient_id, provider_name, and policy_number are required.");
  }

  const values = {};
  if (cols.has("hospital_id")) values.hospital_id = resolvedHospitalId;
  if (cols.has("patient_id")) values.patient_id = resolvedPatientId;
  if (cols.has("policy_id")) values.policy_id = resolvedPolicyId;
  if (cols.has("provider_name")) values.provider_name = resolvedProviderName;
  if (cols.has("policy_number")) values.policy_number = resolvedPolicyNumber;
  if (cols.has("plan_name")) values.plan_name = String(plan_name || "").trim() || null;
  if (cols.has("coverage_details")) values.coverage_details = String(coverage_details || "").trim() || null;
  if (cols.has("valid_till")) values.valid_till = valid_till || null;
  if (cols.has("status")) values.status = status || "active";
  if (cols.has("notes")) values.notes = String(notes || "").trim() || null;
  if (cols.has("created_at")) values.created_at = new Date();
  if (cols.has("updated_at")) values.updated_at = new Date();

  const insertCols = Object.keys(values);
  const [result] = await db.query(
    `INSERT INTO patient_insurance_details (${insertCols.map((col) => `\`${col}\``).join(", ")})
     VALUES (${insertCols.map(() => "?").join(", ")})`,
    insertCols.map((col) => values[col])
  );

  return {
    id: result.insertId,
    hospital_id: resolvedHospitalId,
    patient_id: resolvedPatientId,
    policy_id: resolvedPolicyId,
    provider_name: resolvedProviderName,
    policy_number: resolvedPolicyNumber,
    plan_name: String(plan_name || "").trim() || null,
    coverage_details: String(coverage_details || "").trim() || null,
    valid_till: valid_till || null,
    status: status || "active",
    notes: String(notes || "").trim() || null,
  };
}

export async function getClaims() {
  let table = "claims";
  let cols = await getTableColumns(table);
  if (!cols) {
    table = "insurance_claims";
    cols = await getTableColumns(table);
  }
  if (!cols) return [];

  const idCol = firstExistingColumn(cols, ["id", "claim_id"]);
  const patientIdCol = firstExistingColumn(cols, ["patient_id"]);
  const invoiceIdCol = firstExistingColumn(cols, ["invoice_id"]);
  const policyIdCol = firstExistingColumn(cols, ["policy_id"]);
  const amountCol = firstExistingColumn(cols, ["amount", "claim_amount"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const notesCol = firstExistingColumn(cols, ["notes", "remark", "remarks"]);
  const createdAtCol = firstExistingColumn(cols, ["created_at"]);
  const updatedAtCol = firstExistingColumn(cols, ["updated_at"]);

  const [rows] = await db.query(
    `
      SELECT
        ${idCol ? `\`${idCol}\`` : "NULL"} AS id,
        ${patientIdCol ? `\`${patientIdCol}\`` : "NULL"} AS patient_id,
        ${invoiceIdCol ? `\`${invoiceIdCol}\`` : "NULL"} AS invoice_id,
        ${policyIdCol ? `\`${policyIdCol}\`` : "NULL"} AS policy_id,
        ${amountCol ? `\`${amountCol}\`` : "NULL"} AS amount,
        ${statusCol ? `\`${statusCol}\`` : "NULL"} AS status,
        ${notesCol ? `\`${notesCol}\`` : "NULL"} AS notes,
        ${createdAtCol ? `\`${createdAtCol}\`` : "NULL"} AS created_at,
        ${updatedAtCol ? `\`${updatedAtCol}\`` : "NULL"} AS updated_at
      FROM \`${table}\`
      ORDER BY ${createdAtCol ? `\`${createdAtCol}\` DESC, ` : ""}${idCol ? `\`${idCol}\`` : "1"} DESC
    `
  );

  return rows;
}

export async function createClaim({ patient_id, invoice_id, policy_id, amount, notes }) {
  let table = "claims";
  let cols = await getTableColumns(table);
  if (!cols) {
    table = "insurance_claims";
    cols = await getTableColumns(table);
  }
  if (!cols) {
    throw new Error("Claims table not found.");
  }

  const idCol = firstExistingColumn(cols, ["id", "claim_id"]);
  const patientIdCol = firstExistingColumn(cols, ["patient_id"]);
  const invoiceIdCol = firstExistingColumn(cols, ["invoice_id"]);
  const policyIdCol = firstExistingColumn(cols, ["policy_id"]);
  const amountCol = firstExistingColumn(cols, ["amount", "claim_amount"]);
  const statusCol = firstExistingColumn(cols, ["status"]);
  const notesCol = firstExistingColumn(cols, ["notes", "remark", "remarks"]);
  const createdAtCol = firstExistingColumn(cols, ["created_at"]);
  const updatedAtCol = firstExistingColumn(cols, ["updated_at"]);

  const resolvedPatientId = toNumberOrNull(patient_id);
  const resolvedInvoiceId = toNumberOrNull(invoice_id);
  const resolvedPolicyId = toNumberOrNull(policy_id);
  const resolvedAmount = toNumberOrNull(amount);
  const resolvedNotes = String(notes || "").trim();

  if (!patientIdCol || !amountCol) {
    throw new Error("Claims table is missing required columns.");
  }
  if (!resolvedPatientId || resolvedAmount === null) {
    throw new Error("patient_id and amount are required.");
  }

  const values = {
    [patientIdCol]: resolvedPatientId,
    [amountCol]: resolvedAmount,
  };
  if (invoiceIdCol) values[invoiceIdCol] = resolvedInvoiceId;
  if (policyIdCol) values[policyIdCol] = resolvedPolicyId;
  if (statusCol) values[statusCol] = "submitted";
  if (notesCol) values[notesCol] = resolvedNotes || null;
  if (createdAtCol) values[createdAtCol] = new Date();
  if (updatedAtCol) values[updatedAtCol] = new Date();

  const insertCols = Object.keys(values);
  await db.query(
    `INSERT INTO \`${table}\` (${insertCols.map((col) => `\`${col}\``).join(", ")})
     VALUES (${insertCols.map(() => "?").join(", ")})`,
    insertCols.map((col) => values[col])
  );

  const [rows] = await db.query(
    `
      SELECT
        ${idCol ? `\`${idCol}\`` : "NULL"} AS id,
        ${patientIdCol ? `\`${patientIdCol}\`` : "NULL"} AS patient_id,
        ${invoiceIdCol ? `\`${invoiceIdCol}\`` : "NULL"} AS invoice_id,
        ${policyIdCol ? `\`${policyIdCol}\`` : "NULL"} AS policy_id,
        ${amountCol ? `\`${amountCol}\`` : "NULL"} AS amount,
        ${statusCol ? `\`${statusCol}\`` : "NULL"} AS status,
        ${notesCol ? `\`${notesCol}\`` : "NULL"} AS notes,
        ${createdAtCol ? `\`${createdAtCol}\`` : "NULL"} AS created_at,
        ${updatedAtCol ? `\`${updatedAtCol}\`` : "NULL"} AS updated_at
      FROM \`${table}\`
      WHERE \`${patientIdCol}\` = ? AND \`${amountCol}\` = ?
      ORDER BY ${createdAtCol ? `\`${createdAtCol}\` DESC, ` : ""}${idCol ? `\`${idCol}\`` : "1"} DESC
      LIMIT 1
    `,
    [resolvedPatientId, resolvedAmount]
  );

  return rows[0] || null;
}
