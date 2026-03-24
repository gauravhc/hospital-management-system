const service = require("./service");
const { ok } = require("../../services/module.helper");

async function list(req, res) {
  const rows = await service.list();
  return res.json({ success: true, message: "Success", data: rows, hospitals: rows });
}

async function listActive(req, res) {
  const rows = await service.listActive();
  return res.json({ success: true, message: "Success", data: rows, hospitals: rows });
}
async function create(req, res) {
  const { name, email, phone, address, gst_number, certification } = req.body || {};
  if (!name || !email || !phone || !address || !gst_number || !certification) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  const result = await service.create(req.body);
  return res.status(201).json({
    success: true,
    message: "Hospital created",
    hospital: result?.hospital || null,
    hospital_id: result?.hospital_id ?? null,
  });
}
async function getById(req, res) {
  const row = await service.getById(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Hospital not found" });
  return res.json({ success: true, message: "Success", data: row, hospital: row });
}
async function update(req, res) { await service.update(req.params.id, req.body); return ok(res, null, "Hospital updated"); }
async function remove(req, res) { await service.remove(req.params.id); return ok(res, null, "Hospital deleted"); }

module.exports = { list, listActive, create, getById, update, remove };
