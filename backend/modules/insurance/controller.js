const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function claims(req, res) { return ok(res, await service.claims(getScopedHospitalId(req))); }
async function createClaim(req, res) { await service.createClaim(req.body, getScopedHospitalId(req)); return ok(res, null, "Claim submitted", 201); }
async function updateClaim(req, res) { await service.updateClaim(req.params.id, req.body); return ok(res, null, "Claim updated"); }
async function policies(req, res) { return ok(res, await service.policies(getScopedHospitalId(req))); }
async function createPolicy(req, res) { await service.createPolicy(req.body, getScopedHospitalId(req)); return ok(res, null, "Policy created", 201); }

module.exports = { claims, createClaim, updateClaim, policies, createPolicy };
