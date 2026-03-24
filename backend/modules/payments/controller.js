const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function create(req, res) { await service.create(req.body, getScopedHospitalId(req)); return ok(res, null, "Payment recorded", 201); }
async function history(req, res) { return ok(res, await service.history(getScopedHospitalId(req))); }
async function getById(req, res) {
  const row = await service.getById(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Payment not found" });
  return ok(res, row);
}

module.exports = { create, history, getById };
