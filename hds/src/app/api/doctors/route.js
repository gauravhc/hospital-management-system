import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";
import { doctors as mockDoctors } from "@/data/mockData";

const firstExistingColumn = (columns, candidates) =>
  candidates.find((c) => columns?.has(c)) || null;

export async function GET() {
  try {
    const cols = await getTableColumns("doctors");
    if (!cols) {
      return NextResponse.json(
        mockDoctors.map((d) => ({
          id: d.id,
          name: d.name,
          department: d.speciality || "General Medicine",
          email: null,
          phone: null,
        }))
      );
    }

    const idCol = firstExistingColumn(cols, ["id", "user_id"]);
    const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
    const deptCol = firstExistingColumn(cols, ["department", "specialization"]);
    const emailCol = cols.has("email") ? "email" : null;
    const phoneCol = firstExistingColumn(cols, ["mobile", "phone"]);

    if (!idCol || !nameCol) return NextResponse.json([]);

    const where = cols.has("status") ? "WHERE LOWER(status) = 'active'" : "";
    const orderBy = cols.has("created_at")
      ? "ORDER BY created_at DESC"
      : `ORDER BY \`${idCol}\` DESC`;

    const [rows] = await db.query(
      `
      SELECT
        \`${idCol}\` AS id,
        \`${nameCol}\` AS name,
        ${deptCol ? `\`${deptCol}\`` : "NULL"} AS department,
        ${emailCol ? `\`${emailCol}\`` : "NULL"} AS email,
        ${phoneCol ? `\`${phoneCol}\`` : "NULL"} AS phone
      FROM doctors
      ${where}
      ${orderBy}
      `
    );

    if (!rows.length) {
      return NextResponse.json(
        mockDoctors.map((d) => ({
          id: d.id,
          name: d.name,
          department: d.speciality || "General Medicine",
          email: null,
          phone: null,
        }))
      );
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error("DOCTORS LIST API ERROR:", error);
    return NextResponse.json(
      mockDoctors.map((d) => ({
        id: d.id,
        name: d.name,
        department: d.speciality || "General Medicine",
        email: null,
        phone: null,
      }))
    );
  }
}
