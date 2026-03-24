const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function appointments(req, res) { return ok(res, await service.appointments(getScopedHospitalId(req))); }
async function revenue(req, res) { return ok(res, await service.revenue(getScopedHospitalId(req))); }
async function patientVisits(req, res) { return ok(res, await service.patientVisits(getScopedHospitalId(req))); }
async function lab(req, res) { return ok(res, await service.lab(getScopedHospitalId(req))); }
async function pharmacy(req, res) { return ok(res, await service.pharmacy(getScopedHospitalId(req))); }

module.exports = { appointments, revenue, patientVisits, lab, pharmacy };
