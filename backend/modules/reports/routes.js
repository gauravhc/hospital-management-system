const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/", asyncHandler(controller.list));
router.get("/patient/:patientId", asyncHandler(controller.patientReport));
router.post("/generate", asyncHandler(controller.generate));
router.get("/appointments", asyncHandler(controller.appointments));
router.get("/revenue", asyncHandler(controller.revenue));
router.get("/patient-visits", asyncHandler(controller.patientVisits));
router.get("/lab", asyncHandler(controller.lab));
router.get("/pharmacy", asyncHandler(controller.pharmacy));

module.exports = router;
