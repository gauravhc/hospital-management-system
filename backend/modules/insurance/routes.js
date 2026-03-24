const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/claims", asyncHandler(controller.claims));
router.post("/claims", asyncHandler(controller.createClaim));
router.put("/claims/:id", asyncHandler(controller.updateClaim));
router.get("/insurance/policies", asyncHandler(controller.policies));
router.post("/insurance/policies", asyncHandler(controller.createPolicy));

module.exports = router;
