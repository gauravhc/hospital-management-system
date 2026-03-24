import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import db from "@/lib/db";

const normalizeDate = (value) => {
  if (!value) return null;
  const raw = String(value);
  return raw.includes("T") ? raw.split("T")[0] : raw;
};

const deriveNameFromEmail = (email) => {
  const local = String(email || "").split("@")[0] || "Patient";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Patient";
};

const resolvePatientRecord = async ({
  patientId,
  patientEmail,
  patientName,
  patientPhone,
  hospitalId,
}) => {
  let patient = null;

  if (patientId) {
    const [rows] = await db.query("SELECT * FROM patients WHERE id = ? LIMIT 1", [patientId]);
    patient = rows[0] || null;
  }

  if (!patient && patientEmail) {
    const [rows] = await db.query(
      "SELECT * FROM patients WHERE LOWER(email) = LOWER(?) ORDER BY id DESC LIMIT 1",
      [patientEmail]
    );
    patient = rows[0] || null;
  }

  if (patient) {
    await db.query(
      `
        UPDATE patients
        SET hospital_id = ?, full_name = ?, phone = COALESCE(?, phone), status = 'active'
        WHERE id = ?
      `,
      [
        hospitalId,
        patientName || patient.full_name || deriveNameFromEmail(patient.email),
        patientPhone || null,
        patient.id,
      ]
    );
    return patient.id;
  }

  if (!patientEmail) {
    throw new Error("Logged in patient details are required to create the hospital patient record");
  }

  const passwordHash = await bcrypt.hash(`temp-${Date.now()}`, 10);
  const [insert] = await db.query(
    `
      INSERT INTO patients (hospital_id, full_name, email, password, phone, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `,
    [
      hospitalId,
      patientName || deriveNameFromEmail(patientEmail),
      patientEmail,
      passwordHash,
      patientPhone || null,
    ]
  );

  return insert.insertId;
};

export async function POST(req) {
  try {
    const {
      patient_id,
      patient_email,
      patient_name,
      patient_phone,
      hospital_id,
      doctor_id,
      appointment_date,
      appointment_time,
      department,
      service,
      comments,
    } = await req.json();

    if (!hospital_id || !doctor_id || !appointment_date || !appointment_time) {
      return NextResponse.json(
        {
          success: false,
          message: "hospital_id, doctor_id, appointment_date and appointment_time are required",
        },
        { status: 400 }
      );
    }

    const finalPatientId = await resolvePatientRecord({
      patientId: patient_id ? Number(patient_id) : null,
      patientEmail: patient_email || null,
      patientName: patient_name || null,
      patientPhone: patient_phone || null,
      hospitalId: Number(hospital_id),
    });

    const [result] = await db.query(
      `
      INSERT INTO appointments
      (patient_id, hospital_id, doctor_id, appointment_date, appointment_time, status)
      VALUES (?, ?, ?, ?, ?, 'scheduled')
      `,
      [
        finalPatientId,
        Number(hospital_id),
        Number(doctor_id),
        normalizeDate(appointment_date),
        appointment_time,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Appointment booked successfully",
        id: result.insertId,
        patient_id: finalPatientId,
        meta: {
          department: department || "",
          service: service || "",
          comments: comments || "",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("APPOINTMENTS BOOK API ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to book appointment" },
      { status: 500 }
    );
  }
}
