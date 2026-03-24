const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/", asyncHandler(controller.list));
router.post("/", roleMiddleware("hospital_admin"), asyncHandler(controller.create));
router.put("/:id", roleMiddleware("hospital_admin"), asyncHandler(controller.update));
router.delete("/:id", roleMiddleware("hospital_admin"), asyncHandler(controller.remove));
router.get("/:id/tasks", asyncHandler(controller.tasks));
router.post("/:id/tasks", roleMiddleware("hospital_admin", "nurse"), asyncHandler(controller.createTask));

module.exports = router;
