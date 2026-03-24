import { NextResponse } from "next/server";

import db from "@/lib/db";
import { requireApiUser } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { response, user } = await requireApiUser(req, ["doctor", "super_admin"]);
    if (response) return response;

    const [rows] = await db.query(
      `
        SELECT
          p.id,
          p.full_name,
          p.email,
          p.phone,
          p.gender,
          p.blood_group,
          p.hospital_id,
          MAX(a.appointment_date) AS last_appointment_date,
          MAX(a.appointment_time) AS last_appointment_time,
          COUNT(a.id) AS total_appointments
        FROM appointments a
        INNER JOIN patients p ON p.id = a.patient_id
        WHERE a.doctor_id = ?
        GROUP BY p.id, p.full_name, p.email, p.phone, p.gender, p.blood_group, p.hospital_id
        ORDER BY last_appointment_date DESC, last_appointment_time DESC, p.full_name ASC
      `,
      [user.id]
    );

    return NextResponse.json({ success: true, patients: rows });
  } catch (error) {
    console.error("DOCTOR PATIENTS GET ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch patients" }, { status: 500 });
  }
}
