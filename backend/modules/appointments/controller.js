const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");
const { query } = require("../../config/database");
const sendWhatsApp = require("../../utils/whatsapp");
const { notifyAppointmentBooked, notifyAppointmentStatusChanged } = require("../notifications/appointmentEvents");

function normalizeAppointment(row) {
  if (!row) return row;
  return {
    ...row,
    patientName: row.patientName || row.patient_name || row.patient,
    doctorName: row.doctorName || row.doctor_name || row.doctor,
    date: row.date || row.appointment_date,
    time: row.time || row.appointment_time,
    paymentStatus: row.paymentStatus || row.payment_status,
    patientEmail: row.patientEmail || row.patient_email,
    patientPhone: row.patientPhone || row.patient_phone,
    patientGender: row.patientGender || row.patient_gender,
    patientBloodGroup: row.patientBloodGroup || row.patient_blood_group,
  };
}

async function resolveDoctorIdByUserId(userId) {
  if (!userId) return null;
  const doctors = await query(`SELECT id FROM doctors WHERE id = ? LIMIT 1`, [userId]);
  return doctors[0]?.id || null;
}

async function resolvePatientIdByUserId(userId) {
  if (!userId) return null;
  const patients = await query(`SELECT id FROM patients WHERE id = ? LIMIT 1`, [userId]);
  return patients[0]?.id || null;
}

async function list(req, res) {
  const hospitalId = getScopedHospitalId(req);
  const role = String(req.query.role || "").toLowerCase();
  const userId = req.query.userId || req.query.user_id || null;

  if (role === "doctor" && userId) {
    const doctorId = await resolveDoctorIdByUserId(userId);
    const rows = doctorId ? await service.byDoctor(doctorId) : [];
    const appointments = rows.map(normalizeAppointment);
    return res.json({ success: true, message: "Success", data: appointments, appointments });
  }

  if (role === "patient" && userId) {
    const patientId = await resolvePatientIdByUserId(userId);
    const rows = patientId ? await service.byPatient(patientId) : [];
    const appointments = rows.map(normalizeAppointment);
    return res.json({ success: true, message: "Success", data: appointments, appointments });
  }

  if (!role && req.user?.role === "doctor") {
    const doctorId = await resolveDoctorIdByUserId(req.user.id);
    const rows = doctorId ? await service.byDoctor(doctorId) : [];
    const appointments = rows.map(normalizeAppointment);
    return res.json({ success: true, message: "Success", data: appointments, appointments });
  }

  if (!role && req.user?.role === "patient") {
    const patientId = await resolvePatientIdByUserId(req.user.id);
    const rows = patientId ? await service.byPatient(patientId) : [];
    const appointments = rows.map(normalizeAppointment);
    return res.json({ success: true, message: "Success", data: appointments, appointments });
  }

  const rows = await service.list(hospitalId);
  const appointments = rows.map(normalizeAppointment);
  return res.json({ success: true, message: "Success", data: appointments, appointments });
}
async function create(req, res) {
  const payload = req.body || {};
  const hospitalId = getScopedHospitalId(req);

  if (!payload.patient_id || !payload.doctor_id || !payload.appointment_date || !payload.appointment_time) {
    return res.status(400).json({
      success: false,
      message: "patient_id, doctor_id, appointment_date and appointment_time are required",
    });
  }

  const result = await service.create(payload, hospitalId);
  const appointmentId = result?.insertId;

  if (appointmentId) {
    try {
      const appointment = await service.getById(appointmentId);
      const patientName = appointment?.patient_name || appointment?.patientName || "Patient";
      const doctorName = appointment?.doctor_name || appointment?.doctorName || "Doctor";
      const patientPhone = appointment?.patient_phone || appointment?.patientPhone || "";
      const dateValue = appointment?.appointment_date || appointment?.date || payload.appointment_date;
      const timeValue = appointment?.appointment_time || appointment?.time || payload.appointment_time;

      if (patientPhone) {
        const message = `Appointment Confirmed!\n\nPatient: ${patientName}\nDoctor: ${doctorName}\nDate: ${dateValue}\nTime: ${timeValue}\n\nThank you for choosing our hospital.`;
        await sendWhatsApp(patientPhone, message);
      } else {
        console.warn("WhatsApp skipped: patient phone not found for appointment", appointmentId);
      }

      // In-app notifications (patient + doctor)
      await notifyAppointmentBooked(appointment);
    } catch (err) {
      // WhatsApp failures must not break appointment creation.
      console.error("WhatsApp notification skipped:", err?.message || err);
    }
  }

  return ok(res, { id: appointmentId }, "Appointment created", 201);
}
async function getById(req, res) {
  const row = await service.getById(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Appointment not found" });
  const normalized = normalizeAppointment(row);
  return res.json({ success: true, message: "Success", data: normalized, appointment: normalized });
}
async function update(req, res) {
  const id = req.params.id;
  const before = await service.getById(id);
  const oldStatus = before?.status ?? null;

  await service.update(id, req.body);

  const newStatus = req.body?.status ?? null;
  if (before && newStatus) {
    try {
      await notifyAppointmentStatusChanged({ ...before, status: newStatus }, oldStatus, newStatus);
    } catch (err) {
      console.error("Appointment notification skipped:", err?.message || err);
    }
  }

  return ok(res, null, "Appointment updated");
}
async function remove(req, res) { await service.remove(req.params.id); return ok(res, null, "Appointment deleted"); }
async function byDoctor(req, res) {
  const rows = await service.byDoctor(req.params.doctorId);
  const appointments = rows.map(normalizeAppointment);
  return res.json({ success: true, message: "Success", data: appointments, appointments });
}
async function byPatient(req, res) {
  const rows = await service.byPatient(req.params.patientId);
  const appointments = rows.map(normalizeAppointment);
  return res.json({ success: true, message: "Success", data: appointments, appointments });
}

module.exports = { list, create, getById, update, remove, byDoctor, byPatient };
