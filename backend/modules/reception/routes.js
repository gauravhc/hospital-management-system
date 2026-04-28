const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();

router.use(authMiddleware, hospitalScope, roleMiddleware("register", "hospital_admin", "super_admin"));

router.post("/patient", asyncHandler(controller.createPatient));
router.post("/appointment", asyncHandler(controller.createAppointment));
router.get("/patients", asyncHandler(controller.patients));

module.exports = router;

