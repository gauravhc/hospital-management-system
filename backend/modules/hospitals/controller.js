const service = require("./service");
const { ok } = require("../../services/module.helper");
const path = require("path");
const fs = require("fs/promises");

const HOSPITAL_TYPES = new Set(["Hospital", "Clinic", "Lab", "Pharmacy"]);

function normalizeHospitalType(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Hospital";
  for (const option of HOSPITAL_TYPES) {
    if (option.toLowerCase() === raw.toLowerCase()) return option;
  }
  return "Hospital";
}

async function list(req, res) {
  const rows = await service.list();
  return res.json({ success: true, message: "Success", data: rows, hospitals: rows });
}

async function listActive(req, res) {
  const rows = await service.listActive();
  return res.json({ success: true, message: "Success", data: rows, hospitals: rows });
}
async function create(req, res) {
  const body = req.body || {};
  const { name, email, phone, address, gst_number, certification } = body;

  const type_of_hospital = normalizeHospitalType(body.type_of_hospital || body.hospital_type);
  const license_document = req.file?.filename ? `/uploads/hospitals/${req.file.filename}` : "";
  const verification_status = "Pending";

  if (!name || !email || !phone || !address || !gst_number || !certification) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  if (!license_document) {
    return res.status(400).json({ success: false, message: "License document is required" });
  }

  const result = await service.create({
    ...body,
    type_of_hospital,
    license_document,
    verification_status,
  });
  return res.status(201).json({
    success: true,
    message: "Hospital created",
    hospital: result?.hospital || null,
    hospital_id: result?.hospital_id ?? null,
  });
}
async function getById(req, res) {
  const row = await service.getById(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Hospital not found" });
  return res.json({ success: true, message: "Success", data: row, hospital: row });
}
async function update(req, res) {
  const body = req.body || {};
  const type_of_hospital = body.type_of_hospital || body.hospital_type ? normalizeHospitalType(body.type_of_hospital || body.hospital_type) : undefined;
  const license_document = req.file?.filename ? `/uploads/hospitals/${req.file.filename}` : undefined;

  await service.update(req.params.id, {
    ...body,
    ...(type_of_hospital ? { type_of_hospital } : {}),
    ...(license_document ? { license_document } : {}),
  });

  return ok(res, null, "Hospital updated");
}

async function getLicense(req, res) {
  const hospital = await service.getById(req.params.id);
  if (!hospital) return res.status(404).json({ success: false, message: "Hospital not found" });

  const rawPath = String(hospital.license_document || "").trim();
  if (!rawPath) return res.status(404).json({ success: false, message: "License document not found" });

  const filename = path.basename(rawPath);
  const abs = path.join(__dirname, "..", "..", "uploads", "hospitals", filename);

  try {
    await fs.access(abs);
  } catch {
    return res.status(404).json({ success: false, message: "License document not found" });
  }

  return res.sendFile(abs);
}

async function verify(req, res) {
  const status = req.body?.status ?? "";
  const normalized = service.normalizeVerificationStatus(status);
  if (!["Approved", "Rejected"].includes(normalized)) {
    return res.status(400).json({ success: false, message: 'status must be "Approved" or "Rejected"' });
  }

  const hospital = await service.getById(req.params.id);
  if (!hospital) return res.status(404).json({ success: false, message: "Hospital not found" });

  const current = String(hospital.verification_status || "Pending").trim();
  if (current && current !== "Pending") {
    return res.status(409).json({ success: false, message: `Hospital already ${current}` });
  }

  await service.setVerificationStatus(req.params.id, normalized);
  return ok(res, { status: normalized }, "Verification status updated");
}
async function remove(req, res) { await service.remove(req.params.id); return ok(res, null, "Hospital deleted"); }

module.exports = { list, listActive, create, getById, update, remove, getLicense, verify };
