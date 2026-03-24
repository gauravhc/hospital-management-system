const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { roleMiddleware, hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope, roleMiddleware("nurse"));

router.get("/profile", asyncHandler(controller.profile));
router.get("/tasks", asyncHandler(controller.tasks));
router.put("/tasks/:id", asyncHandler(controller.updateTask));
router.post("/vitals", asyncHandler(controller.addVitals));
router.get("/vitals/:patientId", asyncHandler(controller.vitals));

module.exports = router;

