const express = require("express");
const {
  getDoctorsByHospital,
  getDoctorSlots,
  setDoctorAvailability,
} = require("../controllers/doctorController");

const router = express.Router();

router.get("/hospital/:hospitalId", getDoctorsByHospital);
router.get("/slots/:doctorId/:date", getDoctorSlots);
router.post("/availability", setDoctorAvailability);

module.exports = router;
