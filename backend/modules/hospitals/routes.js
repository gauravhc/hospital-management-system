const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();

router.get("/list", asyncHandler(controller.listActive));
router.get("/", asyncHandler(controller.list));
router.get("/:id", asyncHandler(controller.getById));

router.post("/", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.create));
router.put("/:id", authMiddleware, roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.update));
router.delete("/:id", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.remove));

module.exports = router;
