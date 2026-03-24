const express = require("express");
const {
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
} = require("../controllers/appointmentController");

const router = express.Router();

router.post("/book", bookAppointment);
router.get("/patient/:id", getPatientAppointments);
router.get("/doctor/:id", getDoctorAppointments);
router.put("/status/:id", updateAppointmentStatus);

module.exports = router;
