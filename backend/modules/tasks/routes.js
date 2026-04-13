const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

// Create task (doctor/admin) - new API
router.post("/", asyncHandler(controller.create));

// Backward compatible endpoint
router.post("/assign", asyncHandler(controller.assign));
router.get("/patient/:patientId", asyncHandler(controller.patientHistory));

// Nurse workflow
router.put("/:id/accept", asyncHandler(controller.accept));
router.put("/:id/start", asyncHandler(controller.start));
router.put("/:id/complete", asyncHandler(controller.complete));

module.exports = router;
