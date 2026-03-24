const { query } = require("../../config/database");

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

module.exports = { claims, createClaim, updateClaim, policies, createPolicy };
