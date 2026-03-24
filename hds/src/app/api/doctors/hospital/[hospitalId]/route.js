import { NextResponse } from "next/server";

import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";

const firstExistingColumn = (columns, candidates) =>
  candidates.find((c) => columns?.has(c)) || null;

const getHospitalId = async (req, context) => {
  const params = await context?.params;
  let hospitalId = params?.hospitalId;
  if (!hospitalId) {
    const segments = req.nextUrl.pathname.split("/").filter(Boolean);
    hospitalId = segments[segments.length - 1];
  }
  return hospitalId;
};

export async function GET(req, context) {
  try {
    const hospitalId = await getHospitalId(req, context);
    if (!hospitalId) {
      return NextResponse.json(
        { success: false, message: "hospitalId is required" },
        { status: 400 }
      );
    }

    const cols = await getTableColumns("doctors");
    if (!cols) {
      return NextResponse.json({ success: true, doctors: [] });
    }

    const idCol = firstExistingColumn(cols, ["doctor_id", "id", "user_id"]);
    const nameCol = firstExistingColumn(cols, ["name", "full_name"]);
    const deptCol = firstExistingColumn(cols, ["department", "specialization"]);
    const phoneCol = firstExistingColumn(cols, ["phone", "mobile"]);

    if (!idCol || !nameCol || !cols.has("hospital_id")) {
      return NextResponse.json({ success: true, doctors: [] });
    }

    const [rows] = await db.query(
      `
      SELECT
        \`${idCol}\` AS doctor_id,
        hospital_id,
        \`${nameCol}\` AS name,
        ${deptCol ? `\`${deptCol}\`` : "NULL"} AS department,
        ${cols.has("email") ? "`email`" : "NULL"} AS email,
        ${phoneCol ? `\`${phoneCol}\`` : "NULL"} AS phone
      FROM doctors
      WHERE hospital_id = ?
      ORDER BY \`${nameCol}\` ASC
      `,
      [hospitalId]
    );

    return NextResponse.json({
      success: true,
      doctors: rows,
    });
  } catch (error) {
    console.error("DOCTORS BY HOSPITAL API ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}
