const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function list(req, res) { return ok(res, await service.list(getScopedHospitalId(req))); }
async function create(req, res) { await service.create(req.body, getScopedHospitalId(req)); return ok(res, null, "Nurse created", 201); }
async function update(req, res) { await service.update(req.params.id, req.body); return ok(res, null, "Nurse updated"); }
async function remove(req, res) { await service.remove(req.params.id); return ok(res, null, "Nurse deleted"); }
async function tasks(req, res) { return ok(res, await service.tasks(req.params.id)); }
async function createTask(req, res) {
  await service.createTask(req.params.id, req.body, getScopedHospitalId(req), req.user?.id || null);
  return ok(res, null, "Task created", 201);
}


module.exports = { list, create, update, remove, tasks, createTask };
