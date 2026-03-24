const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/staff", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.staff));
router.post("/staff", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.createStaff));
router.put("/staff/:id", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.updateStaff));
router.delete("/staff/:id", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.removeStaff));
router.get("/attendance", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.attendance));
router.post("/attendance", roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.createAttendance));

module.exports = router;
