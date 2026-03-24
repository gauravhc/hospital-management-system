const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/medicines", asyncHandler(controller.medicines));
router.post("/medicines", asyncHandler(controller.createMedicine));
router.put("/medicines/:id", asyncHandler(controller.updateMedicine));
router.delete("/medicines/:id", asyncHandler(controller.removeMedicine));
router.get("/orders", asyncHandler(controller.orders));
router.post("/orders", asyncHandler(controller.createOrder));

module.exports = router;
