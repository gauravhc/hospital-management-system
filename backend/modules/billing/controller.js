const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function invoices(req, res) { return ok(res, await service.invoices(getScopedHospitalId(req))); }
async function createInvoice(req, res) { await service.createInvoice(req.body, getScopedHospitalId(req)); return ok(res, null, "Invoice created", 201); }
async function getInvoice(req, res) {
  const row = await service.getInvoice(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Invoice not found" });
  return ok(res, row);
}
async function patientInvoices(req, res) { return ok(res, await service.patientInvoices(req.params.patientId)); }

module.exports = { invoices, createInvoice, getInvoice, patientInvoices };
