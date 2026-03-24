import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const [rows] = await db.query(
      `
      SELECT id, name, address, gst_number, certification, phone
      FROM hospitals
      ORDER BY id DESC
      `
    );
    return NextResponse.json({ success: true, hospitals: rows });
  } catch (error) {
    console.error("HOSPITALS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch hospitals" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { name, address, gst_number, certification, phone, email, password } = await req.json();

    if (!name || !address || !gst_number || !certification || !phone || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existing] = await db.query(
      "SELECT id FROM hospital_admins WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );
    if (existing.length) {
      return NextResponse.json(
        { success: false, message: "Hospital admin email already exists" },
        { status: 409 }
      );
    }

    const connection = await db.getConnection();
    let hospitalId = null;
    try {
      await connection.beginTransaction();

      const [hospitalResult] = await connection.query(
        `
        INSERT INTO hospitals (name, address, gst_number, certification, phone)
        VALUES (?, ?, ?, ?, ?)
        `,
        [name, address, gst_number, certification, phone]
      );
      hospitalId = hospitalResult.insertId;

      const hash = await bcrypt.hash(String(password), 10);
      await connection.query(
        `
        INSERT INTO hospital_admins (hospital_id, full_name, email, password, phone)
        VALUES (?, ?, ?, ?, ?)
        `,
        [hospitalId, name, normalizedEmail, hash, phone || null]
      );

      await connection.commit();
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }

    const [createdRows] = await db.query(
      `SELECT id, name, address, gst_number, certification, phone, email FROM hospitals WHERE id = ? LIMIT 1`,
      [hospitalId]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Hospital created successfully",
        hospital: createdRows?.[0] || null,
        id: hospitalId,
        admin_created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("HOSPITALS POST ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create hospital" },
      { status: 500 }
    );
  }
}
