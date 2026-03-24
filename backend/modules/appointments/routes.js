const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware);

router.get("/", hospitalScope, asyncHandler(controller.list));
router.post("/", hospitalScope, asyncHandler(controller.create));
router.get("/doctor/:doctorId", hospitalScope, asyncHandler(controller.byDoctor));
router.get("/patient/:patientId", hospitalScope, asyncHandler(controller.byPatient));
router.get("/:id", hospitalScope, asyncHandler(controller.getById));
router.put("/:id", hospitalScope, asyncHandler(controller.update));
router.delete("/:id", hospitalScope, asyncHandler(controller.remove));

module.exports = router;
