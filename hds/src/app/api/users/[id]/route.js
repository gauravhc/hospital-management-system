import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import db from "@/lib/db";
import { deleteRoleUser, ensureStatusColumn, getTableColumns } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

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

const getUserId = async (request, context) => {
  const resolvedParams = await context?.params;
  return resolvedParams?.id || request.nextUrl.pathname.split("/").filter(Boolean).pop();
};

export async function PUT(request, context) {
  try {
    const { response } = await requireApiUser(request, ["super_admin"]);
    if (response) return response;

    const id = await getUserId(request, context);
    const body = await request.json();
    const role = normalizeRole(body.role);
    const table = ROLE_TABLE_MAP[role];

    if (!id || !table) {
      return NextResponse.json({ success: false, message: "Invalid user target" }, { status: 400 });
    }

    let columns = await getTableColumns(table);
    if (!columns) {
      return NextResponse.json({ success: false, message: "User table not found" }, { status: 404 });
    }

    if (body.status && !columns.has("status")) {
      columns = await ensureStatusColumn(table);
    }

    const idCol = firstExistingColumn(columns, ["id", "user_id"]);
    const nameCol = firstExistingColumn(columns, ["full_name", "name"]);
    const phoneCol = firstExistingColumn(columns, ["mobile", "phone"]);

    if (!idCol) {
      return NextResponse.json({ success: false, message: "Invalid user schema" }, { status: 500 });
    }

    const updateParts = [];
    const params = [];

    if (nameCol && body.name) {
      updateParts.push(`\`${nameCol}\` = ?`);
      params.push(String(body.name).trim());
    }
    if (columns.has("email") && body.email) {
      updateParts.push("`email` = ?");
      params.push(String(body.email).trim().toLowerCase());
    }
    if (phoneCol && body.phone !== undefined) {
      updateParts.push(`\`${phoneCol}\` = ?`);
      params.push(body.phone ? String(body.phone).trim() : null);
    }
    if (columns.has("hospital_id") && body.hospital_id !== undefined) {
      updateParts.push("`hospital_id` = ?");
      params.push(body.hospital_id ? Number(body.hospital_id) : null);
    }
    if (columns.has("status") && body.status) {
      updateParts.push("`status` = ?");
      params.push(String(body.status).trim().toLowerCase());
    }
    if (columns.has("password") && body.password) {
      updateParts.push("`password` = ?");
      params.push(await bcrypt.hash(String(body.password), 10));
    }

    if (!updateParts.length) {
      return NextResponse.json({ success: false, message: "No changes provided" }, { status: 400 });
    }

    params.push(id);
    const [result] = await db.query(
      `UPDATE \`${table}\` SET ${updateParts.join(", ")} WHERE \`${idCol}\` = ?`,
      params
    );

    if (!result.affectedRows) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("USERS PUT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { response } = await requireApiUser(request, ["super_admin"]);
    if (response) return response;

    const id = await getUserId(request, context);
    const { searchParams } = new URL(request.url);
    const role = normalizeRole(searchParams.get("role"));
    const table = ROLE_TABLE_MAP[role];

    if (!id || !table) {
      return NextResponse.json({ success: false, message: "Invalid user target" }, { status: 400 });
    }

    const result = await deleteRoleUser({ table, id });
    if (!result.affectedRows) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("USERS DELETE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete user" },
      { status: 500 }
    );
  }
}
