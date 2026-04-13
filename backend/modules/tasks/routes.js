const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.post("/assign", asyncHandler(controller.assign));
router.get("/patient/:patientId", asyncHandler(controller.patientHistory));

module.exports = router;
