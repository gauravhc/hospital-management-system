import { NextResponse } from "next/server";
import db from "@/lib/db";

const toMinutes = (hhmmss) => {
  const [h = "0", m = "0"] = String(hhmmss || "0:0:0").split(":");
  return Number(h) * 60 + Number(m);
};

const toHHMMSS = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

const buildSlots = (startTime, endTime, stepMinutes = 30) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const slots = [];
  for (let t = start; t + stepMinutes <= end; t += stepMinutes) {
    slots.push(toHHMMSS(t));
  }
  return slots;
};

const getParams = async (req, context) => {
  const params = await context?.params;
  let doctorId = params?.doctorId;
  let date = params?.date;

  if (!doctorId || !date) {
    const segments = req.nextUrl.pathname.split("/").filter(Boolean);
    doctorId = doctorId || segments[segments.length - 2];
    date = date || segments[segments.length - 1];
  }

  return { doctorId, date };
};

export async function GET(req, context) {
  try {
    const { doctorId, date } = await getParams(req, context);
    if (!doctorId || !date) {
      return NextResponse.json(
        { success: false, message: "doctorId and date are required" },
        { status: 400 }
      );
    }

    const [availabilityRows] = await db.query(
      `
      SELECT start_time, end_time
      FROM doctor_availability
      WHERE doctor_id = ?
        AND available_date = ?
      `,
      [doctorId, date]
    );

    if (!availabilityRows.length) {
      return NextResponse.json({ success: true, slots: [] });
    }

    const rawSlots = availabilityRows.flatMap((row) =>
      buildSlots(row.start_time, row.end_time, 30)
    );

    const [bookedRows] = await db.query(
      `
      SELECT appointment_time
      FROM appointments
      WHERE doctor_id = ?
        AND appointment_date = ?
        AND LOWER(COALESCE(status, 'scheduled')) <> 'cancelled'
      `,
      [doctorId, date]
    );

    const bookedSet = new Set(bookedRows.map((r) => String(r.appointment_time)));
    const uniqueSlots = [...new Set(rawSlots)];
    const slots = uniqueSlots.filter((slot) => !bookedSet.has(String(slot)));

    return NextResponse.json({ success: true, slots });
  } catch (error) {
    console.error("DOCTOR SLOTS API ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch doctor slots" },
      { status: 500 }
    );
  }
}

