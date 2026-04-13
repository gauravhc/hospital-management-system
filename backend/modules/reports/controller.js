const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function appointments(req, res) { return ok(res, await service.appointments(getScopedHospitalId(req))); }
async function revenue(req, res) { return ok(res, await service.revenue(getScopedHospitalId(req))); }
async function patientVisits(req, res) { return ok(res, await service.patientVisits(getScopedHospitalId(req))); }
async function lab(req, res) { return ok(res, await service.lab(getScopedHospitalId(req))); }
async function pharmacy(req, res) { return ok(res, await service.pharmacy(getScopedHospitalId(req))); }
async function list(req, res) {
  const rows = await service.recentBillingHistory(getScopedHospitalId(req));
  return res.json({ success: true, data: rows, reports: rows });
}
async function patientReport(req, res) {
  const data = await service.patientReport(req.params.patientId, getScopedHospitalId(req));
  if (!data) return res.status(404).json({ success: false, message: "Patient report not found" });
  return res.json({ success: true, data, report: data });
}
async function generate(req, res) {
  const data = await service.generatePatientReport(req.body?.patient_id, getScopedHospitalId(req));
  if (!data) return res.status(404).json({ success: false, message: "Patient report not found" });
  return res.status(201).json({ success: true, message: "Report generated", data, report: data });
}

module.exports = { appointments, revenue, patientVisits, lab, pharmacy, list, patientReport, generate };
