const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
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

const uploadDir = path.join(__dirname, "..", "..", "uploads", "insurance");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `insurance_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);
    if (!file?.mimetype || !allowed.has(file.mimetype)) {
      return cb(new Error("Only PDF, PNG or JPG files are allowed"));
    }
    cb(null, true);
  },
});

router.post(
  "/insurance",
  upload.fields([
    { name: "aadhaar_photo", maxCount: 1 },
    { name: "pan_photo", maxCount: 1 },
    { name: "insurance_card_photo", maxCount: 1 },
  ]),
  asyncHandler(controller.createPatientInsurance)
);
router.get("/insurance/:patientId", asyncHandler(controller.getPatientInsurance));

module.exports = router;
