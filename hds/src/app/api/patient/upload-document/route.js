import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

import { requireApiUser } from "@/lib/rbac";
import { addPatientDocument } from "@/lib/patientData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

export async function POST(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
    if (response) return response;

    const formData = await req.formData();
    const file = formData.get("file") || formData.get("document");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "Document file is required" }, { status: 400 });
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ success: false, message: "Only PDF, JPG, PNG, and WEBP files are allowed" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
    await fs.mkdir(uploadDir, { recursive: true });

    const extension = path.extname(file.name || "") || ".pdf";
    const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(filePath, buffer);

    const created = await addPatientDocument(user, {
      file_name: fileName,
      original_name: file.name || fileName,
      file_path: `/uploads/documents/${fileName}`,
      mime_type: file.type || null,
      file_size: Number(file.size || 0),
    });

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
      document: created,
    });
  } catch (error) {
    console.error("PATIENT DOCUMENT UPLOAD ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to upload document" }, { status: 500 });
  }
}
