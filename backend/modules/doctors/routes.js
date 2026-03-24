const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "profile_images");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `doctor_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
});

const router = express.Router();
router.get("/hospital/:hospitalId", asyncHandler(controller.listByHospital));
router.use(authMiddleware, hospitalScope);

router.get("/", asyncHandler(controller.list));
router.post("/", roleMiddleware("hospital_admin"), asyncHandler(controller.create));
router.put("/availability", roleMiddleware("hospital_admin", "doctor", "super_admin"), asyncHandler(controller.updateAvailability));
router.get("/me/profile", roleMiddleware("doctor"), asyncHandler(controller.getProfile));
router.put("/me/profile", roleMiddleware("doctor"), asyncHandler(controller.updateSelfProfile));
router.put("/me/profile-image", roleMiddleware("doctor"), upload.single("profile_image"), asyncHandler(controller.updateProfile));
router.get("/profile", roleMiddleware("doctor"), asyncHandler(controller.getProfile));
router.put("/profile", roleMiddleware("doctor"), upload.single("profile_image"), asyncHandler(controller.updateProfile));
router.get("/:id", asyncHandler(controller.getById));
router.put("/:id", roleMiddleware("hospital_admin"), asyncHandler(controller.update));
router.delete("/:id", roleMiddleware("hospital_admin"), asyncHandler(controller.remove));
router.get("/:id/appointments", asyncHandler(controller.appointments));
router.get("/:id/schedule", asyncHandler(controller.schedule));
router.put("/:id/schedule", roleMiddleware("hospital_admin", "doctor"), asyncHandler(controller.updateSchedule));

module.exports = router;
