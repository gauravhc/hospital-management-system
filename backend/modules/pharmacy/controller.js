const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function medicines(req, res) { return ok(res, await service.medicines(getScopedHospitalId(req), req.query || {})); }
async function createMedicine(req, res) { await service.createMedicine(req.body, getScopedHospitalId(req), req.user || null); return ok(res, null, "Medicine created", 201); }
async function updateMedicine(req, res) { await service.updateMedicine(req.params.id, req.body); return ok(res, null, "Medicine updated"); }
async function removeMedicine(req, res) { await service.removeMedicine(req.params.id); return ok(res, null, "Medicine deleted"); }
async function createPrescription(req, res) {
  const body = req.body || {};
  let items = body.items;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  const payload = {
    ...body,
    items,
    image_url: req.file ? `/uploads/prescriptions/${req.file.filename}` : (body.image_url || null),
  };
  return ok(res, await service.createPrescription(payload, getScopedHospitalId(req), req.user || null), "Prescription created", 201);
}
async function listPrescriptions(req, res) { return ok(res, await service.listPrescriptions(getScopedHospitalId(req), req.query || {})); }
async function prescriptions(req, res) {
  const requestedPatientId = req.params.patientId;
  if (String(req.user?.role || "").toLowerCase().trim() === "patient" && String(requestedPatientId) !== String(req.user?.id)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  return ok(res, await service.prescriptions(requestedPatientId, getScopedHospitalId(req)));
}
async function orders(req, res) { return ok(res, await service.orders(getScopedHospitalId(req))); }
async function createOrder(req, res) { return ok(res, await service.createOrder(req.body, getScopedHospitalId(req)), "Order created", 201); }
async function sales(req, res) { return ok(res, await service.sales(getScopedHospitalId(req))); }
async function updateStock(req, res) {
  const body = req.body || {};
  const id = body.id || body.medicine_id || body.medicineId;
  if (!id) {
    return res.status(400).json({ success: false, message: "medicine id is required" });
  }
  await service.updateMedicine(id, body);
  return ok(res, null, "Stock updated");
}

module.exports = { medicines, createMedicine, updateMedicine, removeMedicine, createPrescription, listPrescriptions, prescriptions, orders, createOrder, sales, updateStock };
