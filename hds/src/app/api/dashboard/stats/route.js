import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

const countTable = async (table) => {
  const cols = await getTableColumns(table);
  if (!cols) return 0;

  const where = cols.has("status") ? "WHERE status = 'active'" : "";
  const [[row]] = await db.query(`SELECT COUNT(*) AS count FROM \`${table}\` ${where}`);
  return Number(row?.count || 0);
};

export async function GET(req) {
  try {
    const { response } = await requireApiUser(req, ["super_admin"]);
    if (response) return response;

    const [hospitals, hospitalAdmins, doctors, nurses, patients] = await Promise.all([
      countTable("hospitals"),
      countTable("hospital_admins"),
      countTable("doctors"),
      countTable("nurses"),
      countTable("patients"),
    ]);

    return NextResponse.json({
      hospitals,
      admins: hospitalAdmins,
      staff: hospitalAdmins + doctors + nurses + patients,
    });
  } catch (error) {
    console.error("SUPER ADMIN STATS API ERROR:", error);
    return NextResponse.json(
      { message: "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
