const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.list));
router.post("/", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.create));
router.put("/:id", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.update));
router.delete("/:id", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.remove));

module.exports = router;
