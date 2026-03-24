const service = require("./service");
const { ok } = require("../../services/module.helper");

function requireNurse(req) {
  if (!req.user || String(req.user.role || "").toLowerCase() !== "nurse") {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }
}

function validateStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (!["pending", "in_progress", "completed"].includes(value)) return "";
  return value;
}

async function profile(req, res) {
  requireNurse(req);
  const nurse = await service.getNurseProfile(req.user.id);
  if (!nurse) {
    return res.status(404).json({ success: false, message: "Nurse profile not found" });
  }
  return ok(res, nurse, "Success");
}

async function tasks(req, res) {
  requireNurse(req);
  const tasks = await service.listTasks({ nurseId: req.user.id, hospitalId: req.user.hospital_id });
  return ok(res, tasks, "Success");
}

async function updateTask(req, res) {
  requireNurse(req);
  const status = validateStatus(req.body?.status);
  if (!status || status === "pending") {
    return res.status(400).json({ success: false, message: "status must be in_progress or completed" });
  }

  const result = await service.updateTaskStatus({
    taskId: req.params.id,
    nurseId: req.user.id,
    hospitalId: req.user.hospital_id,
    status,
  });

  if (!result.updated) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }

  return ok(res, null, "Task updated");
}

async function addVitals(req, res) {
  requireNurse(req);
  const body = req.body || {};

  if (!body.patient_id) {
    return res.status(400).json({ success: false, message: "patient_id is required" });
  }

  try {
    const created = await service.addVitals({
      nurseId: req.user.id,
      hospitalId: req.user.hospital_id,
      payload: body,
    });

    return ok(res, created, "Vitals recorded", 201);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Failed to record vitals" });
  }
}

async function vitals(req, res) {
  requireNurse(req);
  const patientId = req.params.patientId;
  if (!patientId) {
    return res.status(400).json({ success: false, message: "patient_id is required" });
  }

  const items = await service.listVitals({
    nurseId: req.user.id,
    hospitalId: req.user.hospital_id,
    patientId,
  });

  return ok(res, items, "Success");
}

module.exports = {
  profile,
  tasks,
  updateTask,
  addVitals,
  vitals,
};

