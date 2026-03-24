import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";
import { doctors as mockDoctors } from "@/data/mockData";

const firstExistingColumn = (columns, candidates) =>
  candidates.find((c) => columns?.has(c)) || null;

const getDoctorId = async (req, context) => {
  const resolvedParams = await context?.params;
  let doctorId = resolvedParams?.id;

  if (!doctorId) {
    const segments = req.nextUrl.pathname.split("/").filter(Boolean);
    doctorId = segments[segments.length - 1];
  }

  return doctorId;
};

export async function GET(req, context) {
  try {
    const doctorId = await getDoctorId(req, context);
    if (!doctorId || doctorId === "[id]") {
      return NextResponse.json({ message: "Doctor id is required" }, { status: 400 });
    }

    const cols = await getTableColumns("doctors");
    if (!cols) {
      const fallback = mockDoctors.find((d) => String(d.id) === String(doctorId));
      if (!fallback) return NextResponse.json({ message: "Doctor not found" }, { status: 404 });
      return NextResponse.json({
        id: fallback.id,
        name: fallback.name,
        department: fallback.speciality || "General Medicine",
        email: null,
        phone: null,
      });
    }

    const idCol = firstExistingColumn(cols, ["id", "user_id"]);
    const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
    const deptCol = firstExistingColumn(cols, ["department", "specialization"]);
    const emailCol = cols.has("email") ? "email" : null;
    const phoneCol = firstExistingColumn(cols, ["mobile", "phone"]);

    if (!idCol || !nameCol) {
      return NextResponse.json({ message: "Doctor not found" }, { status: 404 });
    }

    const whereStatus = cols.has("status") ? "AND LOWER(status) = 'active'" : "";
    const [rows] = await db.query(
      `
      SELECT
        \`${idCol}\` AS id,
        \`${nameCol}\` AS name,
        ${deptCol ? `\`${deptCol}\`` : "NULL"} AS department,
        ${emailCol ? `\`${emailCol}\`` : "NULL"} AS email,
        ${phoneCol ? `\`${phoneCol}\`` : "NULL"} AS phone
      FROM doctors
      WHERE \`${idCol}\` = ?
      ${whereStatus}
      LIMIT 1
      `,
      [doctorId]
    );

    if (!rows.length) {
      const fallback = mockDoctors.find((d) => String(d.id) === String(doctorId));
      if (!fallback) return NextResponse.json({ message: "Doctor not found" }, { status: 404 });
      return NextResponse.json({
        id: fallback.id,
        name: fallback.name,
        department: fallback.speciality || "General Medicine",
        email: null,
        phone: null,
      });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("DOCTOR DETAIL API ERROR:", error);
    return NextResponse.json({ message: "Failed to fetch doctor" }, { status: 500 });
  }
}
