const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.list));
router.post("/", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.create));
router.get("/:id", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.getById));
router.put("/:id", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.update));
router.delete("/:id", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.remove));

module.exports = router;
