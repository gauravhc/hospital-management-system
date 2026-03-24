import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/rbac";
import { getPatientMedicalHistory, savePatientMedicalHistory } from "@/lib/patientData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
    if (response) return response;

    const medicalHistory = await getPatientMedicalHistory(user);
    if (!medicalHistory) {
      return NextResponse.json({ success: false, message: "Patient record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...medicalHistory });
  } catch (error) {
    console.error("PATIENT MEDICAL HISTORY GET ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch medical history" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
    if (response) return response;

    const body = await req.json();
    const medicalHistory = await savePatientMedicalHistory(user, body);

    return NextResponse.json({
      success: true,
      message: "Medical history saved successfully",
      ...medicalHistory,
    });
  } catch (error) {
    console.error("PATIENT MEDICAL HISTORY POST ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to save medical history" }, { status: 500 });
  }
}
