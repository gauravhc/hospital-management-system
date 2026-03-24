const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/", asyncHandler(controller.ambulances));
router.get("/available", asyncHandler(controller.available));
router.post("/", asyncHandler(controller.createAmbulance));
router.post("/request", asyncHandler(controller.createRequest));
router.get("/requests", asyncHandler(controller.requests));

module.exports = router;
