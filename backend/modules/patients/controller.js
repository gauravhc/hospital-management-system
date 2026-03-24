const service = require("./service");
const usersService = require("../users/service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");
const fs = require("fs");
const path = require("path");

const normalizeProfileImage = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("profile_images/")) return raw;
  if (raw.startsWith("uploads/")) return raw.replace(/^uploads\//, "");
  if (raw.startsWith("/uploads/")) return raw.replace(/^\/uploads\//, "");
  return raw;
};

const buildProfileResponse = (patient) => {
  const profileImage = normalizeProfileImage(
    patient?.profile_image_url ||
      patient?.profile_image ||
      patient?.avatar_url ||
      patient?.photo_url ||
      ""
  );
  const imageUrl = profileImage
    ? /^https?:\/\//i.test(profileImage)
      ? profileImage
      : profileImage.includes("/")
      ? `/uploads/${profileImage}`
      : `/uploads/profile_images/${profileImage}`
    : "";

  return {
  id: patient?.id,
  patient_id: patient?.id,
  name: patient?.full_name || patient?.name || "",
  full_name: patient?.full_name || patient?.name || "",
  email: patient?.email || "",
  phone: patient?.phone || patient?.mobile || "",
  gender: patient?.gender || "",
  dob: patient?.dob || patient?.date_of_birth || null,
  blood_group: patient?.blood_group || "",
  age: patient?.age || null,
  state: patient?.state || "",
  country: patient?.country || "",
  pincode: patient?.pincode || "",
  address: patient?.address || "",
  profile_image: profileImage || "",
  profile_image_url: imageUrl,
};
};

const resolvePatientId = async (req) => {
  const { query } = require("../../config/database");
  if (req?.user?.id) {
    const rows = await query(`SELECT id FROM patients WHERE id = ? LIMIT 1`, [req.user.id]);
    if (rows.length) return rows[0].id;
  }

  if (!req?.user?.email && !req?.user?.phone) return null;
  const rows = await query(
    `SELECT id FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`,
    [req.user.email, req.user.phone || ""]
  );
  return rows[0]?.id || null;
};

const resolvePatientRow = async (req) => {
  if (!req?.user) return null;
  const { query } = require("../../config/database");
  if (req.user.id) {
    const rowsById = await query(`SELECT * FROM patients WHERE id = ? LIMIT 1`, [req.user.id]);
    if (rowsById.length) return rowsById[0];
  }

  const rows = await query(
    `SELECT * FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`,
    [req.user.email, req.user.phone || ""]
  );
  return rows[0] || null;
};

async function list(req, res) {
  const rows = await service.list(getScopedHospitalId(req));
  return res.json({ success: true, message: "Success", data: rows, patients: rows });
}
async function register(req, res) {
  const { name, full_name, email, password, phone, gender, address, dob, date_of_birth, blood_group, bloodGroup, state, country, pincode, age } = req.body || {};
  if (!email || !password || !(name || full_name) || !phone) {
    return res.status(400).json({ success: false, message: "name, email, password and phone are required" });
  }

  const payload = {
    role: "patient",
    name: name || full_name,
    email,
    password,
    phone,
    gender,
    address,
    dob: dob || date_of_birth,
    blood_group: blood_group || bloodGroup,
    state,
    country,
    pincode,
    age,
    profile_image: req.file?.filename ? `profile_images/${req.file.filename}` : null,
  };

  const created = await usersService.create(payload, null);
  const patient = await service.getById(created.id);
  return res.status(201).json({
    success: true,
    message: "Patient registered successfully",
    ...buildProfileResponse(patient || {}),
  });
}
async function create(req, res) { await service.create(req.body, getScopedHospitalId(req)); return ok(res, null, "Patient created", 201); }
async function getById(req, res) {
  const row = await service.getById(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Patient not found" });
  const patient = {
    ...row,
    name: row.name || row.full_name,
    phone: row.phone || row.mobile,
    patient_id: row.patient_id || row.id,
  };
  return res.json({ success: true, message: "Success", data: patient, patient });
}
async function update(req, res) { await service.update(req.params.id, req.body); return ok(res, null, "Patient updated"); }
async function remove(req, res) { await service.remove(req.params.id); return ok(res, null, "Patient deleted"); }
async function appointments(req, res) { return ok(res, await service.appointments(req.params.id)); }
async function labReports(req, res) { return ok(res, await service.labReports(req.params.id)); }
async function bills(req, res) { return ok(res, await service.bills(req.params.id)); }
async function documents(req, res) { return ok(res, await service.documents(req.params.id)); }
async function getProfile(req, res) {
  const patient = (await service.getById(req.user.id)) || (await resolvePatientRow(req));
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
  return res.json({ success: true, ...buildProfileResponse(patient) });
}

async function updateProfile(req, res) {
  const patientRow = await resolvePatientRow(req);
  if (!patientRow) return res.status(404).json({ success: false, message: "Patient not found" });
  const payload = {
    role: "patient",
    name: req.body?.name,
    phone: req.body?.phone,
    address: req.body?.address,
    gender: req.body?.gender,
    dob: req.body?.dob || req.body?.date_of_birth,
    blood_group: req.body?.blood_group || req.body?.bloodGroup,
    state: req.body?.state,
    country: req.body?.country,
    pincode: req.body?.pincode,
    age: req.body?.age,
    profile_image: req.file?.filename ? `profile_images/${req.file.filename}` : undefined,
  };
  await usersService.update(patientRow.id, payload);
  const patient = await service.getById(patientRow.id);
  return res.json({ success: true, message: "Profile updated successfully", ...buildProfileResponse(patient || {}) });
}

async function getMedicalHistory(req, res) {
  const patientId = await resolvePatientId(req);
  if (!patientId) return res.status(404).json({ success: false, message: "Patient not found" });
  const rows = await service.medicalHistory(patientId);
  const latest = rows[0] || {};
  return res.json({
    success: true,
    data: rows,
    condition: latest.condition || latest.diagnosis || latest.chronic_diseases || "",
    medications: latest.medications || latest.treatment || "",
    allergies: latest.allergies || "",
    notes: latest.notes || "",
  });
}

async function createMedicalHistory(req, res) {
  const patientRow = await resolvePatientRow(req);
  if (!patientRow) return res.status(404).json({ success: false, message: "Patient not found" });
  await service.addMedicalHistory(patientRow.id, req.body || {}, patientRow.hospital_id || req.user?.hospital_id || null);
  return res.status(201).json({ success: true, message: "Medical history saved" });
}

async function listDocuments(req, res) {
  const patientId = await resolvePatientId(req);
  if (!patientId) return res.status(404).json({ success: false, message: "Patient not found" });
  const rows = await service.documents(patientId);
  const documents = rows.map((row) => {
    const rawPath =
      row.file_path ||
      row.file_url ||
      row.url ||
      row.path ||
      row.fileUrl ||
      row.document_path ||
      "";
    const normalized = String(rawPath || "").replace(/^\/uploads\//, "");
    const url = normalized ? `/uploads/${normalized}` : "";
    return {
      ...row,
      url,
      original_name: row.document_name || row.title || row.file_name || row.filename || row.original_name,
    };
  });
  return res.json({ success: true, data: documents, documents });
}

async function uploadDocument(req, res) {
  const patientRow = await resolvePatientRow(req);
  if (!patientRow) return res.status(404).json({ success: false, message: "Patient not found" });

  const file = req.file || null;
  const filePath = file?.filename ? `patient_documents/${file.filename}` : null;
  await service.addDocument(
    patientRow.id,
    {
      document_name: req.body?.document_name || req.body?.title || file?.originalname || "Document",
      file_name: file?.filename || null,
      file_path: filePath,
      file_url: filePath ? `/uploads/${filePath}` : null,
      original_name: file?.originalname || null,
      file_type: file?.mimetype || null,
      file_size: typeof file?.size === "number" ? file.size : null,
    },
    patientRow.hospital_id || req.user?.hospital_id || null
  );

  return res.status(201).json({
    success: true,
    data: {
      file_name: file?.filename || null,
      original_name: file?.originalname || null,
      file_type: file?.mimetype || null,
      file_path: filePath ? `/uploads/${filePath}` : null,
    },
  });
}

function normalizeUploadsRef(fileRef) {
  if (!fileRef) return null;
  const raw = String(fileRef || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return null;

  // Strip leading /uploads or uploads
  const cleaned = raw
    .replace(/^\/uploads\//, "")
    .replace(/^uploads\//, "")
    .replace(/^\//, "");

  // Only allow deleting files within our uploads directory
  if (!cleaned) return null;
  return cleaned;
}

async function deleteDocument(req, res) {
  const patientId = await resolvePatientId(req);
  if (!patientId) return res.status(404).json({ success: false, message: "Patient not found" });

  const { deleted, fileRef } = await service.deleteDocument(patientId, req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: "Document not found" });

  const cleaned = normalizeUploadsRef(fileRef);
  if (cleaned) {
    const absolutePath = path.join(__dirname, "..", "..", "uploads", cleaned);
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch {
      // best-effort cleanup only
    }
  }

  return res.json({ success: true, message: "Document deleted" });
}

async function listAppointments(req, res) {
  const patientId = await resolvePatientId(req);
  if (!patientId) return res.status(404).json({ success: false, message: "Patient not found" });
  const rows = await service.appointments(patientId);
  return res.json({ success: true, data: rows, appointments: rows });
}

async function listBills(req, res) {
  const patientId = await resolvePatientId(req);
  if (!patientId) return res.status(404).json({ success: false, message: "Patient not found" });
  const rows = await service.bills(patientId);
  return res.json({ success: true, data: rows, bills: rows });
}

async function listLabReports(req, res) {
  const patientId = await resolvePatientId(req);
  if (!patientId) return res.status(404).json({ success: false, message: "Patient not found" });
  const rows = await service.labReports(patientId);
  return res.json({ success: true, data: rows, lab_reports: rows });
}

module.exports = {
  list,
  register,
  create,
  getById,
  update,
  remove,
  appointments,
  labReports,
  bills,
  documents,
  getProfile,
  updateProfile,
  getMedicalHistory,
  createMedicalHistory,
  listDocuments,
  uploadDocument,
  deleteDocument,
  listAppointments,
  listBills,
  listLabReports,
};
