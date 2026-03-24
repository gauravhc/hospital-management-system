const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.post("/", asyncHandler(controller.create));
router.get("/history", asyncHandler(controller.history));
router.get("/:id", asyncHandler(controller.getById));

module.exports = router;
