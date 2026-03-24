const db = require("../config/db");

const bookAppointment = async (req, res) => {
  try {
    const { patient_id, hospital_id, doctor_id, appointment_date, appointment_time } = req.body;

    if (!patient_id || !hospital_id || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: "patient_id, hospital_id, doctor_id, appointment_date and appointment_time are required",
      });
    }

    const [result] = await db.execute(
      `
      INSERT INTO appointments
      (patient_id, hospital_id, doctor_id, appointment_date, appointment_time)
      VALUES (?, ?, ?, ?, ?)
      `,
      [patient_id, hospital_id, doctor_id, appointment_date, appointment_time]
    );

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("BOOK APPOINTMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to book appointment",
    });
  }
};

const getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.params.id;

    const [rows] = await db.execute(
      `
      SELECT * FROM appointments
      WHERE patient_id = ?
      ORDER BY appointment_date DESC
      `,
      [patientId]
    );

    return res.json({
      success: true,
      appointments: rows,
    });
  } catch (error) {
    console.error("GET PATIENT APPOINTMENTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient appointments",
    });
  }
};

const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.params.id;

    const [rows] = await db.execute(
      `
      SELECT * FROM appointments
      WHERE doctor_id = ?
      ORDER BY appointment_date DESC
      `,
      [doctorId]
    );

    return res.json({
      success: true,
      appointments: rows,
    });
  } catch (error) {
    console.error("GET DOCTOR APPOINTMENTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor appointments",
    });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    const [result] = await db.execute(
      `
      UPDATE appointments
      SET status = ?
      WHERE id = ?
      `,
      [status, appointmentId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    return res.json({
      success: true,
      message: "Appointment status updated",
    });
  } catch (error) {
    console.error("UPDATE APPOINTMENT STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update appointment status",
    });
  }
};

module.exports = {
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
};
