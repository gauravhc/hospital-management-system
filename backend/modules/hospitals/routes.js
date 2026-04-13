const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "..", "uploads", "hospitals");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `hospital_license_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);
    if (!file?.mimetype || !allowed.has(file.mimetype)) {
      return cb(new Error("Only PDF, PNG or JPG files are allowed"));
    }
    cb(null, true);
  },
});

router.get("/list", asyncHandler(controller.listActive));
router.get("/", asyncHandler(controller.list));
router.get("/:id/license", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.getLicense));
router.put("/:id/verify", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.verify));
router.get("/:id", asyncHandler(controller.getById));

router.post("/", authMiddleware, roleMiddleware("super_admin"), upload.single("license_document"), asyncHandler(controller.create));
router.put("/:id", authMiddleware, roleMiddleware("super_admin", "hospital_admin"), upload.single("license_document"), asyncHandler(controller.update));
router.delete("/:id", authMiddleware, roleMiddleware("super_admin"), asyncHandler(controller.remove));

module.exports = router;
