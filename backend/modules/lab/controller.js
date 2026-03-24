const path = require("path");
const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function tests(req, res) { return ok(res, await service.tests(getScopedHospitalId(req))); }
async function createTest(req, res) { await service.createTest(req.body, getScopedHospitalId(req)); return ok(res, null, "Lab test created", 201); }
async function reports(req, res) { return ok(res, await service.reports(getScopedHospitalId(req))); }
async function createReport(req, res) { await service.createReport(req.body, getScopedHospitalId(req)); return ok(res, null, "Lab report created", 201); }
async function getReport(req, res) {
  const row = await service.getReport(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Lab report not found" });
  return ok(res, row);
}
async function uploadReport(req, res) {
  const fileUrl = req.file ? `/uploads/lab/${path.basename(req.file.path)}` : null;
  return ok(res, { file_url: fileUrl }, "Lab report uploaded", 201);
}

module.exports = { tests, createTest, reports, createReport, getReport, uploadReport };
