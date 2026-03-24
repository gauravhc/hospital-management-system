import { NextResponse } from "next/server";
import { getTableColumns } from "@/lib/authTables";
import { isHospitalAdmin, requireApiUser } from "@/lib/rbac";

const countFromTable = async ({
  table,
  hospitalId = null,
  enforceHospitalScope = false,
  activeOnly = false,
}) => {
  const cols = await getTableColumns(table);
  if (!cols) return 0;

  const whereParts = [];
  const params = [];

  if (activeOnly && cols.has("status")) {
    whereParts.push("LOWER(status) = 'active'");
  }

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
    const { response, user: actor } = await requireApiUser(req, ["hospital_admin", "super_admin"]);
    if (response) return response;

    const scopeToHospital = isHospitalAdmin(actor);
    const hospitalId = scopeToHospital ? actor.hospital_id ?? null : null;
    if (scopeToHospital && (hospitalId === null || hospitalId === undefined || hospitalId === "")) {
      return NextResponse.json(
        { message: "Hospital admin is not mapped to any hospital" },
        { status: 403 }
      );
    }

    const doctorsTotal = await countFromTable({
      table: "doctors",
      hospitalId,
      enforceHospitalScope: scopeToHospital,
      activeOnly: false,
    });
    const doctorsPresent = await countFromTable({
      table: "doctors",
      hospitalId,
      enforceHospitalScope: scopeToHospital,
      activeOnly: true,
    });

    const nursesTotal = await countFromTable({
      table: "nurses",
      hospitalId,
      enforceHospitalScope: scopeToHospital,
      activeOnly: false,
    });
    const nursesPresent = await countFromTable({
      table: "nurses",
      hospitalId,
      enforceHospitalScope: scopeToHospital,
      activeOnly: true,
    });

    const labTotal = 0;
    const labPresent = 0;
    const pharmacyTotal = 0;
    const pharmacyPresent = 0;
    const inventoryTotal = 0;
    const inventoryPresent = 0;
    const accountsTotal = 0;
    const accountsPresent = 0;

    const managementTotal = await countFromTable({
      table: "hospital_admins",
      hospitalId,
      enforceHospitalScope: scopeToHospital,
      activeOnly: false,
    });
    const managementPresent = await countFromTable({
      table: "hospital_admins",
      hospitalId,
      enforceHospitalScope: scopeToHospital,
      activeOnly: true,
    });

    const registerTotal = 0;
    const registerPresent = 0;

    return NextResponse.json({
      total: {
        doctor: doctorsTotal,
        nurse: nursesTotal,
        lab: labTotal,
        pharmacy: pharmacyTotal,
        inventory: inventoryTotal,
        accounts: accountsTotal,
        "top management": managementTotal,
        "register / front desk": registerTotal,
        "it & systems": 0,
        "security & transport": 0,
        "housekeeping & sanitation": 0,
        catering: 0,
      },
      present: {
        doctor: doctorsPresent,
        nurse: nursesPresent,
        lab: labPresent,
        pharmacy: pharmacyPresent,
        inventory: inventoryPresent,
        accounts: accountsPresent,
        "top management": managementPresent,
        "register / front desk": registerPresent,
        "it & systems": 0,
        "security & transport": 0,
        "housekeeping & sanitation": 0,
        catering: 0,
      },
    });
  } catch (error) {
    console.error("HR DASHBOARD STATS ERROR:", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
