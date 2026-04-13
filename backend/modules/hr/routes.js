const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/staff", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.staff));
router.post("/staff", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.createStaff));
router.put("/staff/:id", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.updateStaff));
router.delete("/staff/:id", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.removeStaff));
router.get("/attendance", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.attendance));
router.post("/attendance", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.createAttendance));
router.get("/payroll", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.payroll));
router.post("/payroll", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.createPayroll));
router.put("/payroll/:id/status", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.updatePayrollStatus));
router.get("/leaves", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.leaves));
router.post("/leaves", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.createLeave));
router.put("/leaves/:id/status", roleMiddleware("super_admin", "hospital_admin", "hr"), asyncHandler(controller.updateLeaveStatus));

module.exports = router;
