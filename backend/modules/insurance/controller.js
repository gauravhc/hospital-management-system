const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function claims(req, res) { return ok(res, await service.claims(getScopedHospitalId(req))); }
async function createClaim(req, res) { await service.createClaim(req.body, getScopedHospitalId(req)); return ok(res, null, "Claim submitted", 201); }
async function updateClaim(req, res) { await service.updateClaim(req.params.id, req.body); return ok(res, null, "Claim updated"); }
async function policies(req, res) { return ok(res, await service.policies(getScopedHospitalId(req))); }
async function createPolicy(req, res) { await service.createPolicy(req.body, getScopedHospitalId(req)); return ok(res, null, "Policy created", 201); }

function isPatient(req) {
  return String(req.user?.role || "").toLowerCase() === "patient";
}

async function createPatientInsurance(req, res) {
  const hospitalId = getScopedHospitalId(req);
  const body = req.body || {};

  const patientId = isPatient(req) ? req.user?.id : body.patient_id || body.patientId;
  if (!patientId) return res.status(400).json({ success: false, message: "patient_id is required" });

  const aadhaarNumber = String(body.aadhaar_number || body.aadhaarNumber || "").trim();
  const panNumber = String(body.pan_number || body.panNumber || "").trim();
  const insuranceNumber = String(body.insurance_number || body.insuranceNumber || "").trim();
  const policyId = String(body.policy_id || body.policyId || "").trim();
  const validityDate = String(body.validity_date || body.validityDate || "").trim();
  const claimAmountRaw = body.claim_amount ?? body.claimAmount ?? "";
  const claimAmount = claimAmountRaw === "" ? null : Number(claimAmountRaw);

  const files = req.files || {};
  const aadhaarPhoto = files.aadhaar_photo?.[0]?.filename ? `/uploads/insurance/${files.aadhaar_photo[0].filename}` : "";
  const panPhoto = files.pan_photo?.[0]?.filename ? `/uploads/insurance/${files.pan_photo[0].filename}` : "";
  const insuranceCard = files.insurance_card_photo?.[0]?.filename
    ? `/uploads/insurance/${files.insurance_card_photo[0].filename}`
    : "";

  const missing = [];
  if (!aadhaarNumber) missing.push("aadhaar_number");
  if (!panNumber) missing.push("pan_number");
  if (!aadhaarPhoto) missing.push("aadhaar_photo");
  if (!panPhoto) missing.push("pan_photo");
  if (!insuranceNumber) missing.push("insurance_number");
  if (!policyId) missing.push("policy_id");
  if (!insuranceCard) missing.push("insurance_card_photo");
  if (!validityDate) missing.push("validity_date");
  if (claimAmount === null || Number.isNaN(claimAmount)) missing.push("claim_amount");

  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });
  }

  await service.createPatientInsurance(
    {
      patient_id: patientId,
      hospital_id: hospitalId || null,
      aadhaar_number: aadhaarNumber,
      pan_number: panNumber,
      aadhaar_photo: aadhaarPhoto,
      pan_photo: panPhoto,
      insurance_number: insuranceNumber,
      policy_id: policyId,
      insurance_card_photo: insuranceCard,
      validity_date: validityDate,
      claim_amount: claimAmount,
    },
    hospitalId
  );

  return ok(res, null, "Insurance details saved", 201);
}

async function getPatientInsurance(req, res) {
  const patientId = req.params.patientId;
  if (!patientId) return res.status(400).json({ success: false, message: "patientId is required" });

  if (isPatient(req) && String(req.user?.id) !== String(patientId)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const rows = await service.getPatientInsurance(patientId);
  const latest = rows[0] || null;
  return res.json({ success: true, message: "Success", data: latest, history: rows });
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
