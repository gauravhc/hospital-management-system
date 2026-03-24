const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();

router.post("/login", asyncHandler(controller.login));
router.post("/register", asyncHandler(controller.register));
router.post("/signup", asyncHandler(controller.register));
router.post("/logout", authMiddleware, asyncHandler(controller.logout));
router.get("/profile", authMiddleware, asyncHandler(controller.profile));
router.put("/change-password", authMiddleware, asyncHandler(controller.changePassword));

module.exports = router;
