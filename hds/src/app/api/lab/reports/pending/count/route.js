import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

export async function GET(req) {
  try {
    const { response } = await requireApiUser(req, ["patient", "hospital_admin", "super_admin"]);
    if (response) return response;

    const cols = await getTableColumns("lab_reports");
    if (!cols) return NextResponse.json({ count: 0 });

    const hasStatus = cols.has("status");
    const where = hasStatus ? "WHERE LOWER(status) IN ('pending', 'awaiting', 'processing')" : "";
    const [[row]] = await db.query(`SELECT COUNT(*) AS count FROM lab_reports ${where}`);
    return NextResponse.json({ count: Number(row?.count || 0) });
  } catch (error) {
    console.error("LAB PENDING COUNT API ERROR:", error);
    return NextResponse.json({ count: 0 });
  }
}

