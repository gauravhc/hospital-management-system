const service = require("./service");
const { ok } = require("../../services/module.helper");

async function list(req, res) {
  const rows = await service.list();
  return res.json({ success: true, message: "Success", data: rows, admins: rows });
}

async function create(req, res) {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  await service.create(req.body);
  return ok(res, null, "Super admin created", 201);
}

async function update(req, res) {
  await service.update(req.params.id, req.body);
  return ok(res, null, "Super admin updated");
}

async function remove(req, res) {
  await service.remove(req.params.id);
  return ok(res, null, "Super admin deleted");
}

module.exports = { list, create, update, remove };
