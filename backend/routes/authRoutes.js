const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/login", authController.login);
router.post("/register-patient", authController.registerPatient);
router.post("/create-doctor", authMiddleware(["hospital_admin", "super_admin"]), authController.createDoctor);
router.post("/create-nurse", authMiddleware(["hospital_admin", "super_admin"]), authController.createNurse);
router.post("/create-hospital-admin", authMiddleware(["super_admin"]), authController.createHospitalAdmin);
router.post("/create-super-admin", authMiddleware(["super_admin"]), authController.createSuperAdmin);

router.get("/login", (req, res) => {
  res.send("Login route working");
});

module.exports = router;
