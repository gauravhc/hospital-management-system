const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.create));

module.exports = router;
