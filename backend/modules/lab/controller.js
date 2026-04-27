const path = require("path");
const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function tests(req, res) { return ok(res, await service.tests(getScopedHospitalId(req))); }
async function createTest(req, res) { await service.createTest(req.body, getScopedHospitalId(req)); return ok(res, null, "Lab test created", 201); }
function isPatientUser(req) {
  return String(req.user?.role || "").toLowerCase().trim() === "patient";
}

async function reports(req, res) {
  const filters = { ...(req.query || {}) };
  if (isPatientUser(req)) {
    filters.patient_id = req.user.id;
  }
  return ok(res, await service.reports(getScopedHospitalId(req), filters));
}
async function createReport(req, res) { await service.createReport(req.body, getScopedHospitalId(req)); return ok(res, null, "Lab report created", 201); }
async function getReport(req, res) {
  const row = await service.getReport(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Lab report not found" });
  if (isPatientUser(req) && String(row.patient_id) !== String(req.user.id)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  return ok(res, row);
}
async function reportsByPatient(req, res) {
  const requestedPatientId = req.params.patientId;
  if (isPatientUser(req) && String(requestedPatientId) !== String(req.user.id)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  return ok(res, await service.reportsByPatient(requestedPatientId, getScopedHospitalId(req)));
}
async function uploadReport(req, res) {
  const fileUrl = req.file ? `/uploads/lab/${path.basename(req.file.path)}` : null;
  if (!req.params.id) {
    return ok(res, { file_url: fileUrl }, "Lab report uploaded", 201);
  }
  const row = await service.updateReportFile(req.params.id, fileUrl);
  return ok(res, row, "Lab report uploaded", 201);
}

module.exports = { tests, createTest, reports, createReport, getReport, reportsByPatient, uploadReport };
