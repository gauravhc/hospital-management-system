const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
const claimUploadDir = path.join(__dirname, "..", "..", "uploads", "claim_documents");
fs.mkdirSync(claimUploadDir, { recursive: true });

const claimUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, claimUploadDir),
    filename: (req, file, cb) => {
      const safeName = String(file.originalname || "claim-document").replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
});

router.use(authMiddleware, hospitalScope);

router.get("/claims", asyncHandler(controller.claims));
router.post("/claims", claimUpload.single("attachment"), asyncHandler(controller.createClaim));
router.put("/claims/:id", asyncHandler(controller.updateClaim));
router.get("/insurance/details", asyncHandler(controller.patientInsuranceDetails));
router.get("/insurance/details/:patientId", asyncHandler(controller.patientInsuranceDetails));
router.post("/insurance/details", asyncHandler(controller.createPatientInsuranceDetail));
router.put("/insurance/details/:id", asyncHandler(controller.updatePatientInsuranceDetail));
router.get("/insurance/policies", asyncHandler(controller.policies));
router.post("/insurance/policies", asyncHandler(controller.createPolicy));

const insuranceUploadDir = path.join(__dirname, "..", "..", "uploads", "insurance");
fs.mkdirSync(insuranceUploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, insuranceUploadDir),
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
