const { ok } = require("../../services/module.helper");
const {
  assignTask,
  resolveHospitalIdForRow,
  pickDefaultAssigneeId,
  listPlansByPatient,
  listTasksByDoctor,
  normalizeTests,
  acceptTask,
  startTask,
  completeTask,
  updateTaskNotes,
} = require("./service");

function normalizePriority(value) {
  const p = String(value || "").trim().toLowerCase();
  if (["low", "medium", "high"].includes(p)) return p;
  return "medium";
}

// normalizeTests is shared in service; keep controller validation minimal.

async function create(req, res) {
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

  const treatment = String(body.treatment ?? "").trim();
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

  // Enforce same-hospital patient when possible.
  const patientHospitalId = await resolveHospitalIdForRow("patients", patientId, "patient");

  if (hospitalId) {
    if (patientHospitalId && String(patientHospitalId) !== String(hospitalId)) {
      return res.status(403).json({ success: false, message: "Cannot assign patient from another hospital" });
    }
  }

  const created = await assignTask({
    hospitalId,
    assignedBy: req.user?.id ?? null,
    nurseId: null,
    patientId,
    taskTitle,
    description,
    treatment,
    tests,
    priority,
  });

  return ok(res, created, "Task created", 201);
}

// Backward compatibility: `/api/tasks/assign` may still send nurse_id.
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

  // Enforce same-hospital assignment when possible.
  if (nurseId) {
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
  }

  const created = await assignTask({
    hospitalId,
    assignedBy: req.user?.id ?? null,
    nurseId: nurseId ?? null,
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

async function doctorTasks(req, res) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "doctor") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const hospitalId = req.user?.hospital_id ?? null;
  if (!hospitalId) {
    return res.status(400).json({ success: false, message: "Hospital not found for current user" });
  }

  const rows = await listTasksByDoctor({
    hospitalId,
    doctorId: req.user?.id ?? null,
  });

  return ok(res, rows, "Success");
}

async function accept(req, res) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "nurse") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const hospitalId = req.user?.hospital_id ?? null;
  if (!hospitalId) {
    return res.status(400).json({ success: false, message: "Hospital not found for current user" });
  }

  const updated = await acceptTask({
    taskId: req.params.id,
    hospitalId,
    nurseId: req.user?.id ?? null,
    notes: req.body?.notes ?? req.body?.nurse_notes ?? null,
  });

  return ok(res, updated, "Task accepted");
}

async function start(req, res) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "nurse") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const hospitalId = req.user?.hospital_id ?? null;
  if (!hospitalId) {
    return res.status(400).json({ success: false, message: "Hospital not found for current user" });
  }

  const updated = await startTask({
    taskId: req.params.id,
    hospitalId,
    nurseId: req.user?.id ?? null,
    notes: req.body?.notes ?? req.body?.nurse_notes ?? null,
  });

  return ok(res, updated, "Task started");
}

async function complete(req, res) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "nurse") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const hospitalId = req.user?.hospital_id ?? null;
  if (!hospitalId) {
    return res.status(400).json({ success: false, message: "Hospital not found for current user" });
  }

  const updated = await completeTask({
    taskId: req.params.id,
    hospitalId,
    nurseId: req.user?.id ?? null,
    notes: req.body?.notes ?? req.body?.nurse_notes ?? null,
  });

  return ok(res, updated, "Task completed");
}

async function notes(req, res) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "nurse") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const hospitalId = req.user?.hospital_id ?? null;
  if (!hospitalId) {
    return res.status(400).json({ success: false, message: "Hospital not found for current user" });
  }

  const notesValue = String(req.body?.notes ?? req.body?.nurse_notes ?? "").trim();

  const updated = await updateTaskNotes({
    taskId: req.params.id,
    hospitalId,
    nurseId: req.user?.id ?? null,
    notes: notesValue,
  });

  return ok(res, updated, "Notes saved");
}

module.exports = {
  create,
  assign,
  patientHistory,
  doctorTasks,
  accept,
  start,
  complete,
  notes,
};
