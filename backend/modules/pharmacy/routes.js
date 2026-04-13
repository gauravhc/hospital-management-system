const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "..", "uploads", "prescriptions");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const safeName = String(file.originalname || "prescription-image").replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
});

router.use(authMiddleware, hospitalScope);

router.get("/medicines", asyncHandler(controller.medicines));
router.post("/medicines", asyncHandler(controller.createMedicine));
router.put("/medicines/:id", asyncHandler(controller.updateMedicine));
router.delete("/medicines/:id", asyncHandler(controller.removeMedicine));
router.post("/prescriptions", upload.single("prescription_image"), asyncHandler(controller.createPrescription));
router.get("/prescriptions/:patientId", asyncHandler(controller.prescriptions));
router.get("/orders", asyncHandler(controller.orders));
router.post("/orders", asyncHandler(controller.createOrder));
router.get("/sales", asyncHandler(controller.sales));

module.exports = router;
