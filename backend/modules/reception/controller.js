const usersService = require("../users/service");
const patientService = require("../patients/service");
const appointmentService = require("../appointments/service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function createPatient(req, res) {
  const body = req.body || {};
  const hospitalId = getScopedHospitalId(req);

  const fullName = body.full_name || body.name || body.fullName || "";
  const email = body.email || "";
  const phone = body.phone || body.mobile || "";

  if (!hospitalId) {
    return res.status(400).json({ success: false, message: "hospital_id is required" });
  }
  if (!fullName || !email || !phone) {
    return res.status(400).json({ success: false, message: "full_name, email and phone are required" });
  }

  const created = await usersService.create(
    {
      role: "patient",
      full_name: fullName,
      name: fullName,
      email,
      phone,
      password: body.password || "123456",
      gender: body.gender || null,
      dob: body.dob || body.date_of_birth || null,
      address: body.address || null,
      blood_group: body.blood_group || body.bloodGroup || null,
      age: body.age ?? null,
    },
    hospitalId
  );

  const patient = created?.id ? await patientService.getById(created.id) : null;
  return ok(
    res,
    {
      id: created?.id ?? null,
      patient: patient || null,
    },
    "Patient registered",
    201
  );
}

async function createAppointment(req, res) {
  const hospitalId = getScopedHospitalId(req);
  const body = req.body || {};

  if (!hospitalId) {
    return res.status(400).json({ success: false, message: "hospital_id is required" });
  }
  if (!body.patient_id || !body.doctor_id || !body.appointment_date || !body.appointment_time) {
    return res.status(400).json({
      success: false,
      message: "patient_id, doctor_id, appointment_date and appointment_time are required",
    });
  }

  const result = await appointmentService.create(body, hospitalId);
  return ok(
    res,
    {
      appointment_id: result?.insertId ?? null,
    },
    "Appointment booked",
    201
  );
}

async function patients(req, res) {
  const hospitalId = getScopedHospitalId(req);
  const rows = await patientService.list(hospitalId);
  return ok(res, rows);
}

module.exports = {
  createPatient,
  createAppointment,
  patients,
};

