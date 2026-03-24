const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const patientsController = require("../patients/controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const documentsDir = path.join(__dirname, "..", "..", "uploads", "patient_documents");
fs.mkdirSync(documentsDir, { recursive: true });

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

router.use(authMiddleware, roleMiddleware("patient"));

router.get("/documents", asyncHandler(patientsController.listDocuments));
router.post("/documents", documentUpload.single("file"), asyncHandler(patientsController.uploadDocument));
router.delete("/documents/:id", asyncHandler(patientsController.deleteDocument));

module.exports = router;

