const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
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

router.get("/medicines", roleMiddleware("pharmacist", "doctor", "hospital_admin", "super_admin"), asyncHandler(controller.medicines));
router.post("/medicines", roleMiddleware("pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.createMedicine));
router.put("/medicines/:id", roleMiddleware("pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.updateMedicine));
router.delete("/medicines/:id", roleMiddleware("pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.removeMedicine));

router.post("/prescriptions", roleMiddleware("doctor", "pharmacist", "hospital_admin", "super_admin"), upload.single("prescription_image"), asyncHandler(controller.createPrescription));
router.get("/prescriptions", roleMiddleware("pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.listPrescriptions));
router.get("/prescriptions/:patientId", roleMiddleware("patient", "doctor", "pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.prescriptions));

router.get("/orders", roleMiddleware("pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.orders));
router.post("/orders", roleMiddleware("pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.createOrder));
// Alias for dispensing flow
router.post("/dispense", roleMiddleware("pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.createOrder));
// Alias for stock updates
router.put("/stock", roleMiddleware("pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.updateStock));

router.get("/sales", roleMiddleware("pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.sales));

module.exports = router;
