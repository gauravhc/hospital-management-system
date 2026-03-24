const db = require("../config/db");

const toMinutes = (hhmmss) => {
  const [h = "0", m = "0"] = String(hhmmss || "0:0:0").split(":");
  return Number(h) * 60 + Number(m);
};

const toHHMM = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

const buildSlots = (startTime, endTime, stepMinutes = 30) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const slots = [];
  for (let t = start; t + stepMinutes <= end; t += stepMinutes) {
    slots.push(toHHMM(t));
  }
  return slots;
};

const getDoctorsByHospital = async (req, res) => {
  try {
    const hospitalId = req.params.hospitalId;
    const [rows] = await db.execute(
      `
      SELECT
        COALESCE(doctor_id, id) AS doctor_id,
        hospital_id,
        COALESCE(name, full_name) AS name,
        specialization,
        email,
        phone
      FROM doctors
      WHERE hospital_id = ?
      ORDER BY COALESCE(name, full_name) ASC
      `,
      [hospitalId]
    );

    return res.json({
      success: true,
      doctors: rows,
    });
  } catch (error) {
    console.error("GET DOCTORS BY HOSPITAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
    });
  }
};

const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    const [availabilityRows] = await db.execute(
      `
      SELECT start_time, end_time
      FROM doctor_availability
      WHERE doctor_id = ?
        AND available_date = ?
      `,
      [doctorId, date]
    );

    if (!availabilityRows.length) {
      return res.json({
        success: true,
        slots: [],
      });
    }

    const rawSlots = availabilityRows.flatMap((row) =>
      buildSlots(row.start_time, row.end_time, 30)
    );

    const [bookedRows] = await db.execute(
      `
      SELECT appointment_time
      FROM appointments
      WHERE doctor_id = ?
        AND appointment_date = ?
        AND LOWER(status) <> 'cancelled'
      `,
      [doctorId, date]
    );

    const bookedSet = new Set(bookedRows.map((r) => String(r.appointment_time)));
    const uniqueSlots = [...new Set(rawSlots)];
    const availableSlots = uniqueSlots.filter((slot) => !bookedSet.has(String(slot)));

    return res.json({
      success: true,
      slots: availableSlots,
    });
  } catch (error) {
    console.error("GET DOCTOR SLOTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor slots",
    });
  }
};

const setDoctorAvailability = async (req, res) => {
  try {
    const { doctor_id, available_date, start_time, end_time } = req.body;
    if (!doctor_id || !available_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: "doctor_id, available_date, start_time and end_time are required",
      });
    }

    await db.execute(
      `
      INSERT INTO doctor_availability (doctor_id, available_date, start_time, end_time)
      VALUES (?, ?, ?, ?)
      `,
      [doctor_id, available_date, start_time, end_time]
    );

    return res.status(201).json({
      success: true,
      message: "Doctor availability saved",
    });
  } catch (error) {
    console.error("SET DOCTOR AVAILABILITY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save doctor availability",
    });
  }
};

module.exports = {
  getDoctorsByHospital,
  getDoctorSlots,
  setDoctorAvailability,
};
