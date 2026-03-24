import { NextResponse } from "next/server";
import db from "@/lib/db";
import { deleteRoleUser, getTableColumns, updateRoleUser } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

const getUserId = async (req, context) => {
  const resolvedParams = await context?.params;
  let userId = resolvedParams?.id;
  if (!userId) {
    const segments = req.nextUrl.pathname.split("/").filter(Boolean);
    userId = segments[segments.length - 1];
  }
  return userId;
};

const normalizeRole = (role) => String(role || "").toLowerCase().trim().replace(/\s+/g, "_");

const firstExistingColumn = (columns, candidates) =>
  candidates.find((c) => columns?.has(c)) || null;

const resolveTableFromRole = async (role) => {
  const normalizedRole = normalizeRole(role);
  const coreMap = {
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
  if (coreMap[normalizedRole]) return coreMap[normalizedRole];
  return null;
};

const enforceHospitalAdminScope = async ({ actor, targetTable, targetId }) => {
  const actorRole = normalizeRole(actor?.role);
  if (actorRole !== "hospital_admin") return { ok: true };

  if (targetTable === "super_admins" || targetTable === "hospital_admins") {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const cols = await getTableColumns(targetTable);
  if (!cols) return { ok: false, status: 404, message: "Target user table not found" };

  const idCol = firstExistingColumn(cols, ["id", "user_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
  if (!idCol || !hospitalCol) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const [rows] = await db.query(
    `SELECT \`${hospitalCol}\` AS hospital_id FROM \`${targetTable}\` WHERE \`${idCol}\` = ? LIMIT 1`,
    [targetId]
  );

  if (!rows.length) return { ok: false, status: 404, message: "User not found" };

  if (String(rows[0]?.hospital_id ?? "") !== String(actor?.hospital_id ?? "")) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  return { ok: true };
};

export async function PUT(req, context) {
  try {
    const { response, user: actor } = await requireApiUser(req, ["super_admin", "hospital_admin"]);
    if (response) return response;

    const userId = await getUserId(req, context);
    if (!userId || userId === "[id]") {
      return NextResponse.json({ success: false, message: "User id is required" }, { status: 400 });
    }

    const { role, name, email, phone } = await req.json();
    const normalizedRole = normalizeRole(role);
    const trimmedName = String(name || "").trim();
    const trimmedEmail = String(email || "").trim();
    const trimmedPhone = String(phone || "").trim();

    if (!normalizedRole || !trimmedName || !trimmedEmail) {
      return NextResponse.json(
        { success: false, message: "Role, name and email are required" },
        { status: 400 }
      );
    }

    const targetTable = await resolveTableFromRole(normalizedRole);
    if (!targetTable) {
      return NextResponse.json({ success: false, message: `Unsupported role "${normalizedRole}"` }, { status: 400 });
    }

    const scopeCheck = await enforceHospitalAdminScope({ actor, targetTable, targetId: userId });
    if (!scopeCheck.ok) {
      return NextResponse.json({ success: false, message: scopeCheck.message }, { status: scopeCheck.status });
    }
    const cols = await getTableColumns(targetTable);
    if (!cols) {
      return NextResponse.json({ success: false, message: "Target user table not found" }, { status: 404 });
    }

    const idCol = firstExistingColumn(cols, ["id", "user_id"]);
    if (!idCol) {
      return NextResponse.json({ success: false, message: "Invalid table schema" }, { status: 500 });
    }

    // Prevent super admin from editing own role row into inconsistent state by accident.
    if (normalizedRole === "super_admin" && String(actor.id) === String(userId)) {
      return NextResponse.json(
        { success: false, message: "You cannot edit your own super admin record from this table" },
        { status: 400 }
      );
    }

    if (cols.has("email")) {
      const [existing] = await db.query(
        `SELECT \`${idCol}\` AS id FROM \`${targetTable}\` WHERE email = ? AND \`${idCol}\` <> ? LIMIT 1`,
        [trimmedEmail, userId]
      );
      if (existing.length > 0) {
        return NextResponse.json({ success: false, message: "Email already exists" }, { status: 409 });
      }
    }

    const result = await updateRoleUser({
      table: targetTable,
      id: userId,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
    });

    if (!result.affectedRows) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("ADMIN USER PUT API ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  try {
    const { response, user: actor } = await requireApiUser(req, ["super_admin", "hospital_admin"]);
    if (response) return response;

    const userId = await getUserId(req, context);
    if (!userId || userId === "[id]") {
      return NextResponse.json({ success: false, message: "User id is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const normalizedRole = normalizeRole(searchParams.get("role"));
    if (!normalizedRole) {
      return NextResponse.json({ success: false, message: "Role is required" }, { status: 400 });
    }

    if (normalizedRole === "super_admin" && String(actor.id) === String(userId)) {
      return NextResponse.json(
        { success: false, message: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const targetTable = await resolveTableFromRole(normalizedRole);
    if (!targetTable) {
      return NextResponse.json({ success: false, message: `Unsupported role "${normalizedRole}"` }, { status: 400 });
    }

    const scopeCheck = await enforceHospitalAdminScope({ actor, targetTable, targetId: userId });
    if (!scopeCheck.ok) {
      return NextResponse.json({ success: false, message: scopeCheck.message }, { status: scopeCheck.status });
    }
    const result = await deleteRoleUser({ table: targetTable, id: userId });

    if (!result.affectedRows) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("ADMIN USER DELETE API ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete user" },
      { status: 500 }
    );
  }
}
