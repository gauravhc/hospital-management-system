import { NextResponse } from "next/server";
import db from "@/lib/db";
import { deleteRoleUser, getTableColumns, updateRoleUser } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

const getAdminId = async (req, context) => {
  const resolvedParams = await context?.params;
  let adminId = resolvedParams?.id;
  if (!adminId) {
    const segments = req.nextUrl.pathname.split("/").filter(Boolean);
    adminId = segments[segments.length - 1];
  }
  return adminId;
};

export async function PUT(req, context) {
  try {
    const { response } = await requireApiUser(req, ["super_admin"]);
    if (response) return response;

    const adminId = await getAdminId(req, context);
    if (!adminId || adminId === "[id]") {
      return NextResponse.json({ message: "Admin id is required" }, { status: 400 });
    }

    const { name, email } = await req.json();
    const trimmedName = (name || "").trim();
    const trimmedEmail = (email || "").trim();
    if (!trimmedName || !trimmedEmail) {
      return NextResponse.json({ message: "Name and email are required" }, { status: 400 });
    }

    const cols = await getTableColumns("super_admins");
    if (!cols) {
      return NextResponse.json({ message: "super_admins table not found" }, { status: 500 });
    }
    const idCol = cols.has("id") ? "id" : cols.has("user_id") ? "user_id" : null;
    if (!idCol) {
      return NextResponse.json({ message: "Invalid super_admins schema" }, { status: 500 });
    }

    const [existing] = await db.query(
      `SELECT \`${idCol}\` AS id FROM super_admins WHERE email = ? AND \`${idCol}\` <> ? LIMIT 1`,
      [trimmedEmail, adminId]
    );
    if (existing.length > 0) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const result = await updateRoleUser({
      table: "super_admins",
      id: adminId,
      name: trimmedName,
      email: trimmedEmail,
      phone: null,
    });

    if (!result.affectedRows) {
      return NextResponse.json({ message: "Super admin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SUPER ADMIN PUT API ERROR:", error);
    return NextResponse.json({ message: "Failed to update super admin" }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  try {
    const { response, user } = await requireApiUser(req, ["super_admin"]);
    if (response) return response;

    const adminId = await getAdminId(req, context);
    if (!adminId || adminId === "[id]") {
      return NextResponse.json({ message: "Admin id is required" }, { status: 400 });
    }

    // Prevent deleting own super admin account from dashboard.
    if (String(user.id) === String(adminId)) {
      return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 });
    }

    const result = await deleteRoleUser({ table: "super_admins", id: adminId });
    if (!result.affectedRows) {
      return NextResponse.json({ message: "Super admin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SUPER ADMIN DELETE API ERROR:", error);
    return NextResponse.json({ message: "Failed to delete super admin" }, { status: 500 });
  }
}
