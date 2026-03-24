import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";
import { isHospitalAdmin, requireApiUser } from "@/lib/rbac";

const countTable = async (table, hospitalId = null, enforceHospitalScope = false) => {
  const cols = await getTableColumns(table);
  if (!cols) return 0;

  const whereParts = [];
  const params = [];
  if (cols.has("status")) whereParts.push("status='active'");

  if (hospitalId !== null) {
    if (cols.has("hospital_id")) {
      whereParts.push("hospital_id = ?");
      params.push(hospitalId);
    } else if (enforceHospitalScope) {
      return 0;
    }
  }

  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const [[row]] = await db.query(`SELECT COUNT(*) AS count FROM \`${table}\` ${where}`, params);
  return Number(row?.count || 0);
};

export async function GET(req) {
  try {
    const { response, user: actor } = await requireApiUser(req, ["super_admin", "hospital_admin"]);
    if (response) return response;

    const scopeToHospital = isHospitalAdmin(actor);
    const hospitalId = scopeToHospital ? actor.hospital_id ?? null : null;
    if (scopeToHospital && (hospitalId === null || hospitalId === undefined || hospitalId === "")) {
      return NextResponse.json(
        { success: false, message: "Hospital admin is not mapped to any hospital" },
        { status: 403 }
      );
    }

    const [doctors, nurses, hospitalAdmins] = await Promise.all([
      countTable("doctors", hospitalId, scopeToHospital),
      countTable("nurses", hospitalId, scopeToHospital),
      countTable("hospital_admins", hospitalId, scopeToHospital),
    ]);

    return NextResponse.json({
      success: true,
      doctors,
      nurses,
      staff: doctors + nurses + hospitalAdmins,
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
