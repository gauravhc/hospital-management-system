const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/invoices", asyncHandler(controller.invoices));
router.post("/invoices", asyncHandler(controller.createInvoice));
router.get("/invoices/:id", asyncHandler(controller.getInvoice));
router.get("/patient/:patientId", asyncHandler(controller.patientInvoices));

module.exports = router;
