const { ok } = require("../../services/module.helper");
const { assignTask, resolveHospitalIdForRow, pickDefaultAssigneeId, listPlansByPatient } = require("./service");

function normalizePriority(value) {
  const p = String(value || "").trim().toLowerCase();
  if (["low", "medium", "high"].includes(p)) return p;
  return "medium";
}

function normalizeTests(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v || "").trim()).filter(Boolean);
  }
  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v || "").trim()).filter(Boolean);
    }
  } catch {
    // ignore
  }
  return raw
    .split(",")
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

async function assign(req, res) {
  const role = String(req.user?.role || "").toLowerCase();
  if (!["doctor", "hospital_admin", "super_admin"].includes(role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const hospitalId = req.user?.hospital_id ?? null;
  if (!hospitalId && role !== "super_admin") {
    return res.status(400).json({ success: false, message: "Hospital not found for current user" });
  }

  const body = req.body || {};
  const patientId = body.patient_id ?? body.patientId ?? null;

  const treatment = String(body.treatment ?? body.description ?? "").trim();
  const tests = normalizeTests(body.tests);

  const taskTitle = String(body.task_title ?? body.taskTitle ?? "Treatment & Tests").trim();
  const description = String(body.description || "").trim();
  const priority = normalizePriority(body.priority);

  if (!patientId || !treatment) {
    return res.status(400).json({
      success: false,
      message: "patient_id and treatment are required",
    });
  }

  const resolvedAssigneeId = body.nurse_id ?? body.nurseId ?? null;
  const nurseId = resolvedAssigneeId || (await pickDefaultAssigneeId(hospitalId));
  if (!nurseId) {
    return res.status(400).json({
      success: false,
      message: "No available staff found for this hospital",
    });
  }

  // Enforce same-hospital assignment when possible.
  const [nurseHospitalId, patientHospitalId] = await Promise.all([
    resolveHospitalIdForRow("nurses", nurseId, "nurse"),
    resolveHospitalIdForRow("patients", patientId, "patient"),
  ]);

  if (hospitalId) {
    if (nurseHospitalId && String(nurseHospitalId) !== String(hospitalId)) {
      return res.status(403).json({ success: false, message: "Cannot assign to a different hospital" });
    }
    if (patientHospitalId && String(patientHospitalId) !== String(hospitalId)) {
      return res.status(403).json({ success: false, message: "Cannot assign patient from another hospital" });
    }
  }

  const created = await assignTask({
    hospitalId,
    assignedBy: req.user?.id ?? null,
    nurseId,
    patientId,
    taskTitle,
    description,
    treatment,
    tests,
    priority,
  });

  return ok(res, created, "Saved", 201);
}

async function patientHistory(req, res) {
  const role = String(req.user?.role || "").toLowerCase();
  if (!["doctor", "hospital_admin", "super_admin"].includes(role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const patientId = req.params.patientId;
  if (!patientId) {
    return res.status(400).json({ success: false, message: "patientId is required" });
  }

  const hospitalId = req.user?.hospital_id ?? null;
  const rows = await listPlansByPatient({
    hospitalId,
    patientId,
    assignedBy: role === "doctor" ? (req.user?.id ?? null) : null,
  });
  return ok(res, rows, "Success");
}

module.exports = {
  assign,
  patientHistory,
};
