const express = require("express");
const multer = require("multer");
const path = require("path");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), "uploads", "lab"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const router = express.Router();
const upload = multer({ storage });
router.use(authMiddleware, hospitalScope);

router.get("/tests", roleMiddleware("lab", "doctor", "hospital_admin", "super_admin"), asyncHandler(controller.tests));
router.post("/tests", roleMiddleware("lab", "hospital_admin", "super_admin"), asyncHandler(controller.createTest));
router.get("/reports", asyncHandler(controller.reports));
router.get("/reports/patient/:patientId", asyncHandler(controller.reportsByPatient));
router.post("/reports", roleMiddleware("lab", "hospital_admin", "super_admin"), asyncHandler(controller.createReport));
// Aliases for role-based lab flows
router.post("/result", roleMiddleware("lab", "hospital_admin", "super_admin"), asyncHandler(controller.createReport));
router.post("/report", roleMiddleware("lab", "hospital_admin", "super_admin"), asyncHandler(controller.createReport));
router.get("/reports/:id", asyncHandler(controller.getReport));
router.post("/upload-report", roleMiddleware("lab", "hospital_admin", "super_admin"), upload.single("file"), asyncHandler(controller.uploadReport));
router.post("/reports/:id/upload", roleMiddleware("lab", "hospital_admin", "super_admin"), upload.single("file"), asyncHandler(controller.uploadReport));

module.exports = router;
