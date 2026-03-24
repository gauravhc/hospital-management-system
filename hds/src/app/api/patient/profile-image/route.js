import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

import { requireApiUser } from "@/lib/rbac";
import { savePatientProfileImage } from "@/lib/patientData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

export async function POST(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
    if (response) return response;

    const formData = await req.formData();
    const file = formData.get("file") || formData.get("image") || formData.get("avatar");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "Image file is required" }, { status: 400 });
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ success: false, message: "Only JPG, PNG, and WEBP images are allowed" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "patients");
    await fs.mkdir(uploadDir, { recursive: true });

    const extension = path.extname(file.name || "") || ".png";
    const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(filePath, buffer);
    await savePatientProfileImage(user, fileName);

    return NextResponse.json({
      success: true,
      message: "Profile image uploaded successfully",
      profile_image: fileName,
      profile_image_url: `/uploads/patients/${fileName}`,
    });
  } catch (error) {
    console.error("PATIENT PROFILE IMAGE POST ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to upload profile image" }, { status: 500 });
  }
}
