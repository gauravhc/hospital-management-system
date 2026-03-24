import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import db from "@/lib/db";
import { emailExists, getTableColumns, insertRoleUser } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ROLE_TABLE_MAP = {
  doctor: "doctors",
  nurse: "nurses",
  patient: "patients",
  hospital_admin: "hospital_admins",
  super_admin: "super_admins",
};

const normalizeRole = (role) => String(role || "").toLowerCase().trim().replace(/\s+/g, "_");

const firstExistingColumn = (columns, candidates) =>
  candidates.find((c) => columns?.has(c)) || null;

const buildSelectSql = (table, columns, roleLabel) => {
  const idCol = columns.has("id") ? "id" : columns.has("user_id") ? "user_id" : null;
  const nameCol = columns.has("full_name") ? "full_name" : columns.has("name") ? "name" : null;
  const emailCol = columns.has("email") ? "email" : null;
  const hospitalCol = columns.has("hospital_id") ? "hospital_id" : null;
  const statusCol = columns.has("status") ? "status" : null;

  if (!idCol || !nameCol || !emailCol) return null;

  return `
    SELECT
      \`${idCol}\` AS id,
      \`${nameCol}\` AS name,
      \`${emailCol}\` AS email,
      '${roleLabel}' AS role,
      ${hospitalCol ? `\`${hospitalCol}\`` : "NULL"} AS hospital_id,
      ${statusCol ? `\`${statusCol}\`` : "'active'"} AS status,
      NOW() AS created_at
    FROM \`${table}\`
  `;
};

const runTableQuery = async ({ table, roleLabel, q, roleFilter }) => {
  const columns = await getTableColumns(table);
  if (!columns) return [];

  if (roleFilter && roleFilter !== "all" && roleFilter !== roleLabel) {
    return [];
  }

  const baseSelect = buildSelectSql(table, columns, roleLabel);
  if (!baseSelect) return [];

  const whereParts = [];
  const params = [];

  if (q) {
    whereParts.push("(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)");
    const search = `%${q.toLowerCase()}%`;
    params.push(search, search);
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const [rows] = await db.query(`SELECT * FROM (${baseSelect}) role_users ${whereSql}`, params);
  return rows;
};

export async function GET(request) {
  try {
    const { response } = await requireApiUser(request, ["super_admin"]);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim();
    const roleFilter = normalizeRole(searchParams.get("role") || "all");

    const users = [];
    for (const [roleLabel, table] of Object.entries(ROLE_TABLE_MAP)) {
      users.push(...(await runTableQuery({ table, roleLabel, q, roleFilter })));
    }

    const safeUsers = users.filter(Boolean);
    const [hospitals] = await db.query("SELECT id, name FROM hospitals");
    const hospitalMap = new Map(hospitals.map((hospital) => [String(hospital.id), hospital.name]));

    const deduped = [];
    const seen = new Set();
    for (const user of safeUsers) {
      const key = `${user.role}:${user.id}:${String(user.email || "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push({
        ...user,
        status: String(user.status || "active").toLowerCase(),
        hospital_id: user.hospital_id ?? null,
        hospital: user.hospital_id ? hospitalMap.get(String(user.hospital_id)) || "--" : "--",
      });
    }

    return NextResponse.json({ success: true, users: deduped });
  } catch (error) {
    console.error("USERS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { response } = await requireApiUser(request, ["super_admin"]);
    if (response) return response;

    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = normalizeRole(body.role);
    const hospitalId = body.hospital_id ? Number(body.hospital_id) : null;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "name, email, password and role are required" },
        { status: 400 }
      );
    }

    if (!ROLE_TABLE_MAP[role]) {
      return NextResponse.json(
        { success: false, message: "Unsupported role" },
        { status: 400 }
      );
    }

    if (role !== "super_admin" && !hospitalId) {
      return NextResponse.json(
        { success: false, message: "hospital_id is required for this role" },
        { status: 400 }
      );
    }

    if (await emailExists(email)) {
      return NextResponse.json(
        { success: false, message: "Email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await insertRoleUser({
      role,
      name,
      email,
      passwordHash,
      hospitalId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: {
          id: created.id,
          name,
          email,
          role,
          hospital_id: hospitalId,
          status: "active",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("USERS POST ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
