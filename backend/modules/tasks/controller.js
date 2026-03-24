const { ok } = require("../../services/module.helper");
const { assignTask, resolveHospitalIdForRow } = require("./service");

function normalizePriority(value) {
  const p = String(value || "").trim().toLowerCase();
  if (["low", "medium", "high"].includes(p)) return p;
  return "medium";
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
  const nurseId = body.nurse_id ?? body.nurseId ?? null;
  const patientId = body.patient_id ?? body.patientId ?? null;
  const taskTitle = String(body.task_title ?? body.taskTitle ?? "").trim();
  const description = String(body.description || "").trim();
  const priority = normalizePriority(body.priority);

  if (!nurseId || !patientId || !taskTitle) {
    return res.status(400).json({
      success: false,
      message: "nurse_id, patient_id and task_title are required",
    });
  }

  // Enforce same-hospital assignment when possible.
  const [nurseHospitalId, patientHospitalId] = await Promise.all([
    resolveHospitalIdForRow("nurses", nurseId, "nurse"),
    resolveHospitalIdForRow("patients", patientId, "patient"),
  ]);

  if (hospitalId) {
    if (nurseHospitalId && String(nurseHospitalId) !== String(hospitalId)) {
      return res.status(403).json({ success: false, message: "Cannot assign to nurse from another hospital" });
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
    priority,
  });

  return ok(res, created, "Task assigned", 201);
}

module.exports = {
  assign,
};

