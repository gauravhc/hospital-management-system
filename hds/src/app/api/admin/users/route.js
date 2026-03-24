import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";
import { isHospitalAdmin, requireApiUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ROLE_TABLE_MAP = {
  doctor: "doctors",
  nurse: "nurses",
  patient: "patients",
  hospital_admin: "hospital_admins",
  super_admin: "super_admins",
  pharmacist: "staff",
  labtechnician: "staff",
  receptionist: "staff",
  inventorymanager: "staff",
  accountant: "staff",
  admin: "staff",
};

const normalizeRole = (role) => String(role || "").toLowerCase().trim().replace(/\s+/g, "_");

const buildSelectSql = (table, columns, roleLabel) => {
  const idCol = columns.has("id") ? "id" : columns.has("user_id") ? "user_id" : null;
  const nameCol = columns.has("full_name") ? "full_name" : columns.has("name") ? "name" : null;
  const emailCol = columns.has("email") ? "email" : null;
  const hospitalCol = columns.has("hospital_id") ? "hospital_id" : null;
  const deptCol = columns.has("department") ? "department" : null;
  const specCol = columns.has("specialization") ? "specialization" : null;
  const mobileCol = columns.has("mobile") ? "mobile" : columns.has("phone") ? "phone" : null;
  const statusCol = columns.has("status") ? "status" : null;
  const createdCol = columns.has("created_at") ? "created_at" : null;
  const roleCol = columns.has("role") ? "role" : null;

  if (!idCol || !nameCol || !emailCol) return null;

  return `
    SELECT
      \`${idCol}\` AS id,
      \`${nameCol}\` AS full_name,
      \`${emailCol}\` AS email,
      ${roleCol ? `\`${roleCol}\`` : `'${roleLabel}'`} AS role,
      ${hospitalCol ? `\`${hospitalCol}\`` : "NULL"} AS hospital_id,
      ${deptCol ? `\`${deptCol}\`` : "NULL"} AS department,
      ${specCol ? `\`${specCol}\`` : "NULL"} AS specialization,
      ${mobileCol ? `\`${mobileCol}\`` : "NULL"} AS mobile,
      ${statusCol ? `\`${statusCol}\`` : "'active'"} AS status,
      ${createdCol ? `\`${createdCol}\`` : "NOW()"} AS created_at
    FROM \`${table}\`
  `;
};

const runTableQuery = async ({
  table,
  roleLabel,
  q,
  hospitalId = null,
  enforceHospitalScope = false,
  roleFilter = null,
}) => {
  const cols = await getTableColumns(table);
  if (!cols) return [];

  const baseSelect = buildSelectSql(table, cols, roleLabel);
  if (!baseSelect) return [];

  const whereParts = [];
  const params = [];

  if (cols.has("status")) {
    whereParts.push("(status IS NULL OR LOWER(status) = 'active')");
  }
  if (q) {
    whereParts.push("(LOWER(full_name) LIKE ? OR LOWER(email) LIKE ?)");
    const search = `%${q.toLowerCase()}%`;
    params.push(search, search);
  }
  if (roleFilter && cols.has("role")) {
    whereParts.push("LOWER(role) = ?");
    params.push(String(roleFilter).toLowerCase());
  }
  if (hospitalId !== null) {
    if (cols.has("hospital_id")) {
      whereParts.push("hospital_id = ?");
      params.push(hospitalId);
    } else if (enforceHospitalScope) {
      return [];
    }
  }

  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const sql = `SELECT * FROM (${baseSelect}) t ${where}`;
  const [rows] = await db.query(sql, params);
  return rows;
};

export async function GET(request) {
  try {
    const { response, user: actor } = await requireApiUser(request, ["super_admin", "hospital_admin"]);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const rawRole = searchParams.get("role");
    const q = searchParams.get("q");
    const normalizedRole = normalizeRole(rawRole);
    const scopeToHospital = isHospitalAdmin(actor);
    const hospitalId = scopeToHospital ? actor.hospital_id ?? null : null;

    if (scopeToHospital && (hospitalId === null || hospitalId === undefined || hospitalId === "")) {
      return NextResponse.json(
        { success: false, message: "Hospital admin is not mapped to any hospital" },
        { status: 403 }
      );
    }

    const users = [];

    if (normalizedRole && normalizedRole !== "all") {
      const table = ROLE_TABLE_MAP[normalizedRole];
      if (table) {
        users.push(
          ...(await runTableQuery({
            table,
            roleLabel: normalizedRole,
            q,
            hospitalId,
            enforceHospitalScope: scopeToHospital,
            roleFilter: table === "staff" ? normalizedRole : null,
          }))
        );
      } else {
        return NextResponse.json(
          { success: false, message: `Unsupported role "${normalizedRole}"` },
          { status: 400 }
        );
      }
    } else {
      const allSources = [
        { table: "hospital_admins", roleLabel: "hospital_admin" },
        { table: "doctors", roleLabel: "doctor" },
        { table: "nurses", roleLabel: "nurse" },
        { table: "staff", roleLabel: "staff" },
        { table: "patients", roleLabel: "patient" },
        { table: "super_admins", roleLabel: "super_admin" },
      ];

      for (const source of allSources) {
        users.push(
          ...(await runTableQuery({
            ...source,
            q,
            hospitalId,
            enforceHospitalScope: scopeToHospital,
          }))
        );
      }
    }

    // Deduplicate in case of accidental duplicates.
    const deduped = [];
    const seen = new Set();
    for (const u of users) {
      const key = `${String(u?.email || "").toLowerCase()}::${normalizeRole(u?.role)}::${u?.hospital_id ?? ""}`;
      if (!String(u?.email || "").trim()) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(u);
    }

    deduped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ success: true, users: deduped });
  } catch (error) {
    console.error("ADMIN USERS API ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
