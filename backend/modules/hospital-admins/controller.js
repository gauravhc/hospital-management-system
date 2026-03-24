const service = require("./service");
const { ok } = require("../../services/module.helper");

async function create(req, res) {
  const { name, email, password, hospital_id } = req.body || {};
  if (!name || !email || !password || !hospital_id) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  await service.create(req.body);
  return ok(res, null, "Hospital admin created", 201);
}

module.exports = { create };
