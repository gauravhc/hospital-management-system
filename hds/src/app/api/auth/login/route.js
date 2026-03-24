import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "@/lib/db";
import { findUserByEmail, getTableColumns } from "@/lib/authTables";

const normalize = (v) => String(v || "").trim().toLowerCase();

const bootstrapSuperAdminIfNeeded = async ({ email, password }) => {
  const tableCols = await getTableColumns("super_admins");
  if (!tableCols) return null;

  const [[countRow]] = await db.query("SELECT COUNT(*) AS count FROM `super_admins`");
  const hasAnySuperAdmin = Number(countRow?.count || 0) > 0;
  if (hasAnySuperAdmin) return null;

  const allowedEmail = normalize(process.env.ADMIN_EMAIL || "");
  const allowedPassword = String(process.env.ADMIN_PASSWORD || "");

  if (!allowedEmail || !allowedPassword) return null;
  if (normalize(email) !== allowedEmail || String(password || "") !== allowedPassword) {
    return null;
  }

  const idCol = tableCols.has("id") ? "id" : tableCols.has("user_id") ? "user_id" : null;
  const nameCol = tableCols.has("full_name")
    ? "full_name"
    : tableCols.has("name")
      ? "name"
      : null;
  if (!idCol || !tableCols.has("email") || !tableCols.has("password") || !nameCol) return null;

  const values = {
    [nameCol]: process.env.ADMIN_NAME || "Super Admin",
    email: allowedEmail,
    password: await bcrypt.hash(allowedPassword, 10),
  };
  if (tableCols.has("created_at")) values.created_at = new Date();

  const cols = Object.keys(values);
  const [insert] = await db.query(
    `INSERT INTO \`super_admins\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    cols.map((c) => values[c])
  );

  return {
    id: insert.insertId,
    email: allowedEmail,
    password: values.password,
    role: "super_admin",
    hospital_id: null,
  };
};

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password required" },
        { status: 400 }
      );
    }

    let user = await findUserByEmail(email);
    if (!user) {
      user = await bootstrapSuperAdminIfNeeded({ email, password });
    }
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: String(user.role).toLowerCase(),
        hospital_id: user.hospital_id ?? null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const res = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: String(user.role).toLowerCase(),
        hospital_id: user.hospital_id ?? null,
      },
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return res;

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { message: "Login failed" },
      { status: 500 }
    );
  }
}
