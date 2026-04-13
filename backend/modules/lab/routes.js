const express = require("express");
const multer = require("multer");
const path = require("path");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), "uploads", "lab"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const router = express.Router();
const upload = multer({ storage });
router.use(authMiddleware, hospitalScope);

router.get("/tests", asyncHandler(controller.tests));
router.post("/tests", asyncHandler(controller.createTest));
router.get("/reports", asyncHandler(controller.reports));
router.get("/reports/patient/:patientId", asyncHandler(controller.reportsByPatient));
router.post("/reports", asyncHandler(controller.createReport));
router.get("/reports/:id", asyncHandler(controller.getReport));
router.post("/upload-report", upload.single("file"), asyncHandler(controller.uploadReport));
router.post("/reports/:id/upload", upload.single("file"), asyncHandler(controller.uploadReport));

module.exports = router;
