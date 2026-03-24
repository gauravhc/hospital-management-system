const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { authenticate, authorize } = require("../middleware/auth");
const {
  getProfile,
  updateProfile,
  uploadProfileImage,
  getMedicalHistory,
  saveMedicalHistory,
  getEmergencyContact,
  saveEmergencyContact,
  getDocuments,
  uploadDocument,
} = require("../controllers/patientProfileController");

const router = express.Router();

const uploadsRoot = path.join(process.cwd(), "uploads");
const patientUploadsDir = path.join(uploadsRoot, "patients");
const documentUploadsDir = path.join(uploadsRoot, "documents");

fs.mkdirSync(patientUploadsDir, { recursive: true });
fs.mkdirSync(documentUploadsDir, { recursive: true });

const buildStorage = (destination) =>
  multer.diskStorage({
    destination: (_, __, cb) => cb(null, destination),
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });

const imageUpload = multer({
  storage: buildStorage(patientUploadsDir),
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const documentUpload = multer({
  storage: buildStorage(documentUploadsDir),
});

router.use(authenticate, authorize("patient", "super_admin"));

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/profile-image", imageUpload.single("file"), uploadProfileImage);
router.get("/medical-history", getMedicalHistory);
router.post("/medical-history", saveMedicalHistory);
router.get("/emergency", getEmergencyContact);
router.post("/emergency", saveEmergencyContact);
router.get("/documents", getDocuments);
router.post("/upload-document", documentUpload.single("file"), uploadDocument);

module.exports = router;
