const { query } = require("../../config/database");
const { getTableColumns } = require("../../services/dbMeta");

function claims() {
  return query(`SELECT * FROM insurance_claims ORDER BY claim_date DESC, id DESC`);
}

function createClaim(payload) {
  return query(
    `INSERT INTO insurance_claims (patient_id, invoice_id, status)
     VALUES (?, ?, ?)`,
    [payload.patient_id || null, payload.invoice_id || null, payload.status || "pending"]
  );
}

function updateClaim(id, payload) {
  return query(`UPDATE insurance_claims SET status = COALESCE(?, status) WHERE id = ?`, [payload.status || null, id]);
}

function policies() {
  return query(`SELECT * FROM insurance_policies ORDER BY id DESC`);
}

function createPolicy(payload) {
  return query(
    `INSERT INTO insurance_policies (hospital_id, provider_name, policy_name, policy_number, coverage_details, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [payload.hospital_id || null, payload.provider_name, payload.policy_name, payload.policy_number || null, payload.coverage_details || null, payload.is_active !== false]
  );
}

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
  createClaim,
  updateClaim,
  policies,
  createPolicy,
  createPatientInsurance,
  getPatientInsurance,
};
