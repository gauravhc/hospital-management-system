const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "profile_images");
const documentsDir = path.join(__dirname, "..", "..", "uploads", "patient_documents");
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(documentsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `patient_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });
const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, documentsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `patient_doc_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
});

const router = express.Router();

router.post("/register", upload.single("profile_image"), asyncHandler(controller.register));

router.use(authMiddleware);

router.get("/", hospitalScope, roleMiddleware("super_admin", "hospital_admin", "doctor", "nurse"), asyncHandler(controller.list));
router.post("/", hospitalScope, roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.create));
router.put("/profile", roleMiddleware("patient"), upload.single("profile_image"), asyncHandler(controller.updateProfile));
router.get("/profile", roleMiddleware("patient"), asyncHandler(controller.getProfile));
router.get("/medical-history", roleMiddleware("patient"), asyncHandler(controller.getMedicalHistory));
router.post("/medical-history", roleMiddleware("patient"), asyncHandler(controller.createMedicalHistory));
router.get("/documents", roleMiddleware("patient"), asyncHandler(controller.listDocuments));
router.post("/documents", roleMiddleware("patient"), documentUpload.single("file"), asyncHandler(controller.uploadDocument));
router.delete("/documents/:id", roleMiddleware("patient"), asyncHandler(controller.deleteDocument));
router.get("/appointments", roleMiddleware("patient"), asyncHandler(controller.listAppointments));
router.get("/bills", roleMiddleware("patient"), asyncHandler(controller.listBills));
router.get("/lab-reports", roleMiddleware("patient"), asyncHandler(controller.listLabReports));

router.get("/:id", hospitalScope, asyncHandler(controller.getById));
router.put("/:id", hospitalScope, roleMiddleware("super_admin", "hospital_admin", "doctor"), asyncHandler(controller.update));
router.delete("/:id", hospitalScope, roleMiddleware("super_admin", "hospital_admin"), asyncHandler(controller.remove));
router.get("/:id/appointments", hospitalScope, asyncHandler(controller.appointments));
router.get("/:id/lab-reports", hospitalScope, asyncHandler(controller.labReports));
router.get("/:id/bills", hospitalScope, asyncHandler(controller.bills));
router.get("/:id/documents", hospitalScope, asyncHandler(controller.documents));

module.exports = router;
