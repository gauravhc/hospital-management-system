const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function list(req, res) {
  const rows = await service.list(getScopedHospitalId(req), {
    role: req.query.role,
    q: req.query.q,
  });
  const users = rows.filter(Boolean).map((row) => ({
    ...row,
    hospital_id: row.hospital_id ?? null,
    name: row.name || row.full_name,
  }));
  return res.json({ success: true, message: "Success", data: users, users });
}
async function create(req, res) {
  await service.create(req.body, getScopedHospitalId(req));
  return ok(res, null, "User created", 201);
}
async function getById(req, res) {
  const role = req.query.role || req.body?.role;
  const row = await service.getById(req.params.id, role);
  if (!row) return res.status(404).json({ success: false, message: "User not found" });
  const user = {
    ...row,
    hospital_id: row.hospital_id ?? null,
    name: row.name || row.full_name,
  };
  return res.json({ success: true, message: "Success", data: user, user });
}
async function update(req, res) { await service.update(req.params.id, req.body); return ok(res, null, "User updated"); }
async function remove(req, res) {
  const role = req.query.role || req.body?.role;
  await service.remove(req.params.id, role);
  return ok(res, null, "User deleted");
}

module.exports = { list, create, getById, update, remove };
