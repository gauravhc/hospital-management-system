const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function medicines(req, res) { return ok(res, await service.medicines(getScopedHospitalId(req))); }
async function createMedicine(req, res) { await service.createMedicine(req.body, getScopedHospitalId(req)); return ok(res, null, "Medicine created", 201); }
async function updateMedicine(req, res) { await service.updateMedicine(req.params.id, req.body); return ok(res, null, "Medicine updated"); }
async function removeMedicine(req, res) { await service.removeMedicine(req.params.id); return ok(res, null, "Medicine deleted"); }
async function orders(req, res) { return ok(res, await service.orders(getScopedHospitalId(req))); }
async function createOrder(req, res) { await service.createOrder(req.body, getScopedHospitalId(req)); return ok(res, null, "Order created", 201); }

module.exports = { medicines, createMedicine, updateMedicine, removeMedicine, orders, createOrder };
