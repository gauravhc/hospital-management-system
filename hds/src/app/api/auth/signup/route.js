import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { clearTableColumnsCache, emailExists, getTableColumns, insertRoleUser } from "@/lib/authTables";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const saveImageFromDataUrl = async (dataUrl, originalName) => {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) return null;

  const mime = matches[1].toLowerCase();
  const base64 = matches[2];
  const extByMime = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = extByMime[mime];
  if (!ext) return null;

  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) return null;

  const safeBase = String(originalName || "profile")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40) || "profile";
  const fileName = `${Date.now()}_${safeBase}_${crypto.randomBytes(4).toString("hex")}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "patients");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, fileName), buffer);

  return `/uploads/patients/${fileName}`;
};

export async function POST(req) {
  try {
    const {
      email,
      password,
      name,
      age,
      gender,
      bloodGroup,
      phone,
      address,
      state,
      country,
      pincode,
      documentUrl,
      documentDataUrl,
      documentName,
    } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: "Required fields missing" },
        { status: 400 }
      );
    }

    if (await emailExists(email)) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 }
      );
    }

    const patientColsRaw = await getTableColumns("patients");
    if (!patientColsRaw) {
      return NextResponse.json(
        { success: false, message: "Patients table not found" },
        { status: 500 }
      );
    }

    // Ensure patient auth columns exist so patient credentials are stored in patients table.
    if (!patientColsRaw.has("password")) {
      await db.query("ALTER TABLE `patients` ADD COLUMN `password` VARCHAR(255) NULL AFTER `email`");
    }
    if (!patientColsRaw.has("status")) {
      await db.query("ALTER TABLE `patients` ADD COLUMN `status` VARCHAR(20) NULL AFTER `gender`");
    }
    clearTableColumnsCache("patients");

    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await insertRoleUser({
      role: "patient",
      name,
      email,
      passwordHash: hashedPassword,
      phone,
    });
    const userId = created.id;

    const patientCols = await getTableColumns("patients");
    const patientUpdates = [];
    const patientParams = [];
    if (patientCols?.has("address")) {
      patientUpdates.push("`address` = ?");
      patientParams.push(address || null);
    }
    if (patientCols?.has("gender")) {
      patientUpdates.push("`gender` = ?");
      patientParams.push(gender || null);
    }
    if (patientCols?.has("status")) {
      patientUpdates.push("`status` = ?");
      patientParams.push("active");
    }
    if (patientUpdates.length) {
      patientParams.push(userId);
      await db.query(`UPDATE patients SET ${patientUpdates.join(", ")} WHERE id = ?`, patientParams);
    }

    const savedDocumentPath =
      (await saveImageFromDataUrl(documentDataUrl, documentName)) ||
      (documentUrl && String(documentUrl).startsWith("/uploads/") ? documentUrl : null);

    const profileCols = await getTableColumns("patient_profiles");
    if (profileCols) {
      const profileData = {};

      if (profileCols.has("user_id")) profileData.user_id = userId;
      if (profileCols.has("patient_id")) profileData.patient_id = userId;
      if (profileCols.has("age")) profileData.age = age || null;
      if (profileCols.has("gender")) profileData.gender = gender || null;
      if (profileCols.has("blood_group")) profileData.blood_group = bloodGroup || null;
      if (profileCols.has("address")) profileData.address = address || null;
      if (profileCols.has("state")) profileData.state = state || null;
      if (profileCols.has("country")) profileData.country = country || null;
      if (profileCols.has("pincode")) profileData.pincode = pincode || null;
      if (profileCols.has("document_url")) profileData.document_url = savedDocumentPath || null;
      if (profileCols.has("avatar_url")) profileData.avatar_url = savedDocumentPath || null;

      const cols = Object.keys(profileData);
      if (cols.length) {
        await db.query(
          `INSERT INTO patient_profiles (${cols.map((c) => `\`${c}\``).join(", ")})
           VALUES (${cols.map(() => "?").join(", ")})`,
          cols.map((c) => profileData[c])
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Patient registered successfully. Please login.",
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Signup failed" },
      { status: 500 }
    );
  }
}
