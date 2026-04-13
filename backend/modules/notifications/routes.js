const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const { asyncHandler } = require("../../services/module.helper");
const controller = require("./controller");

const router = express.Router();
router.use(authMiddleware);

router.get("/me", asyncHandler(controller.listMe));
router.patch("/:id/read", asyncHandler(controller.readOne));
router.patch("/read-all", asyncHandler(controller.readAll));

module.exports = router;

