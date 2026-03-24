const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function ambulances(req, res) { return ok(res, await service.ambulances(getScopedHospitalId(req))); }
async function available(req, res) {
  const scopedHospitalId = getScopedHospitalId(req);
  const queryHospitalId = req.query?.hospital_id || req.query?.hospitalId || null;
  const hospitalId = scopedHospitalId || queryHospitalId || null;
  return ok(res, await service.availableAmbulances(hospitalId));
}
async function createAmbulance(req, res) { await service.createAmbulance(req.body, getScopedHospitalId(req)); return ok(res, null, "Ambulance created", 201); }
async function createRequest(req, res) { await service.createRequest(req.body, getScopedHospitalId(req)); return ok(res, null, "Ambulance request created", 201); }
async function requests(req, res) { return ok(res, await service.requests(getScopedHospitalId(req))); }

module.exports = { ambulances, available, createAmbulance, createRequest, requests };
