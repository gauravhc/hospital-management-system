import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

export async function GET(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "hospital_admin", "super_admin"]);
    if (response) return response;

    let table = null;
    let cols = await getTableColumns("claims");
    if (cols) {
      table = "claims";
    } else {
      cols = await getTableColumns("insurance_claims");
      if (cols) table = "insurance_claims";
    }

    if (!table || !cols) return NextResponse.json({ count: 0 });

    const hasStatus = cols.has("status");
    const hasPatientId = cols.has("patient_id");
    const actorRole = String(user?.role || "").toLowerCase();
    const pendingStatuses = table === "claims"
      ? ["submitted", "under_review", "approved", "pending", "active", "in_review"]
      : ["submitted", "approved", "pending", "active", "in_review"];
    const whereParts = [];
    const params = [];
    if (hasStatus) {
      whereParts.push(`LOWER(status) IN (${pendingStatuses.map(() => "?").join(", ")})`);
      params.push(...pendingStatuses);
    }
    if (actorRole === "patient" && hasPatientId && user?.id) {
      whereParts.push("patient_id = ?");
      params.push(user.id);
    }
    const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS count FROM \`${table}\` ${where}`,
      params
    );
    return NextResponse.json({ count: Number(row?.count || 0) });
  } catch (error) {
    console.error("CLAIMS ACTIVE COUNT API ERROR:", error);
    return NextResponse.json({ count: 0 });
  }
}
