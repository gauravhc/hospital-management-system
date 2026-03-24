import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

export async function GET(req) {
  try {
    const { response } = await requireApiUser(req, ["patient", "hospital_admin", "super_admin"]);
    if (response) return response;

    const cols = await getTableColumns("insurance_claims");
    if (!cols) return NextResponse.json({ count: 0 });

    const hasStatus = cols.has("status");
    const where = hasStatus
      ? "WHERE LOWER(status) IN ('active', 'submitted', 'in_review', 'pending')"
      : "";
    const [[row]] = await db.query(`SELECT COUNT(*) AS count FROM insurance_claims ${where}`);
    return NextResponse.json({ count: Number(row?.count || 0) });
  } catch (error) {
    console.error("CLAIMS ACTIVE COUNT API ERROR:", error);
    return NextResponse.json({ count: 0 });
  }
}

