const { createNotification } = require("./service");

function normalizeDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function normalizeTime(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function safeName(value, fallback) {
  const name = String(value || "").trim();
  return name || fallback;
}

async function notifyAppointmentBooked(appointment) {
  if (!appointment) return;
  const patientId = appointment.patient_id ?? appointment.patientId ?? null;
  const doctorId = appointment.doctor_id ?? appointment.doctorId ?? null;

  const dateValue = normalizeDate(appointment.appointment_date ?? appointment.date);
  const timeValue = normalizeTime(appointment.appointment_time ?? appointment.time);
  const patientName = safeName(appointment.patient_name ?? appointment.patientName, "Patient");
  const doctorName = safeName(appointment.doctor_name ?? appointment.doctorName, "Doctor");

  const patientMsg = `Appointment booked with ${doctorName} on ${dateValue || "--"} at ${timeValue || "--"}.`;
  const doctorMsg = `New appointment booked by ${patientName} on ${dateValue || "--"} at ${timeValue || "--"}.`;

  await Promise.allSettled([
    createNotification(patientId, patientMsg),
    createNotification(doctorId, doctorMsg),
  ]);
}

async function notifyAppointmentStatusChanged(appointment, oldStatus, newStatus) {
  if (!appointment) return;
  const patientId = appointment.patient_id ?? appointment.patientId ?? null;
  const doctorName = safeName(appointment.doctor_name ?? appointment.doctorName, "Doctor");
  const statusValue = String(newStatus || "").trim();
  if (!patientId || !statusValue) return;

  const normalizedOld = String(oldStatus || "").trim().toLowerCase();
  const normalizedNew = String(newStatus || "").trim().toLowerCase();
  if (normalizedOld && normalizedOld === normalizedNew) return;

  const message = `Your appointment with ${doctorName} is now ${statusValue}.`;
  await createNotification(patientId, message);
}

module.exports = {
  notifyAppointmentBooked,
  notifyAppointmentStatusChanged,
};

