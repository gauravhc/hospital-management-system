const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function items(req, res) { return ok(res, await service.items(getScopedHospitalId(req))); }
async function createItem(req, res) { await service.createItem(req.body, getScopedHospitalId(req)); return ok(res, null, "Inventory item created", 201); }
async function updateItem(req, res) { await service.updateItem(req.params.id, req.body); return ok(res, null, "Inventory item updated"); }
async function removeItem(req, res) { await service.removeItem(req.params.id); return ok(res, null, "Inventory item deleted"); }
async function lowStock(req, res) { return ok(res, await service.lowStock(getScopedHospitalId(req))); }

module.exports = { items, createItem, updateItem, removeItem, lowStock };
