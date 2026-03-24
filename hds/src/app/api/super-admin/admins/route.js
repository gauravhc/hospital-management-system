import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { emailExists, getTableColumns, insertRoleUser } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { response } = await requireApiUser(req, ["super_admin"]);
    if (response) return response;

    const cols = await getTableColumns("super_admins");
    if (!cols) return NextResponse.json([]);

    const idCol = cols.has("id") ? "id" : cols.has("user_id") ? "user_id" : null;
    const nameCol = cols.has("full_name") ? "full_name" : cols.has("name") ? "name" : null;

    if (!idCol || !nameCol || !cols.has("email")) return NextResponse.json([]);

    const where = cols.has("status") ? "WHERE status = 'active'" : "";
    const orderBy = cols.has("created_at") ? "ORDER BY created_at DESC" : `ORDER BY ${idCol} DESC`;

    const [rows] = await db.query(
      `
      SELECT
        \`${idCol}\` AS id,
        \`${nameCol}\` AS name,
        email,
        ${cols.has("hospital_id") ? "`hospital_id`" : "NULL"} AS hospital_id
      FROM super_admins
      ${where}
      ${orderBy}
      `
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("SUPER ADMINS GET API ERROR:", error);
    return NextResponse.json({ message: "Failed to fetch super admins" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await requireApiUser(req, ["super_admin"]);
    if (response) return response;

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (await emailExists(email)) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await insertRoleUser({
      role: "super_admin",
      name,
      email,
      passwordHash: hashedPassword,
    });

    return NextResponse.json(
      { id: created.id, name, email, table: created.table },
      { status: 201 }
    );
  } catch (error) {
    console.error("SUPER ADMINS POST API ERROR:", error);
    return NextResponse.json({ message: "Failed to create super admin" }, { status: 500 });
  }
}
