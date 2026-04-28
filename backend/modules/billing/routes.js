const express = require("express");
const controller = require("./controller");
const paymentController = require("../payments/controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/invoices", roleMiddleware("accountant", "hospital_admin", "super_admin"), asyncHandler(controller.invoices));
router.post("/invoices", roleMiddleware("accountant", "hospital_admin", "super_admin"), asyncHandler(controller.createInvoice));
// Aliases expected by role-based billing flows
router.post("/invoice", roleMiddleware("accountant", "hospital_admin", "super_admin"), asyncHandler(controller.createInvoice));
router.post("/payment", roleMiddleware("accountant", "hospital_admin", "super_admin"), asyncHandler(paymentController.create));
router.get("/invoices/:id", asyncHandler(controller.getInvoice));
router.put("/invoices/:id/status", asyncHandler(controller.updateInvoiceStatus));
router.get("/patient/:patientId", asyncHandler(controller.patientInvoices));

module.exports = router;
