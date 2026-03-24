import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/rbac";
import { getPatientEmergencyContact, savePatientEmergencyContact } from "@/lib/patientData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
    if (response) return response;

    const emergencyContact = await getPatientEmergencyContact(user);
    if (!emergencyContact) {
      return NextResponse.json({ success: false, message: "Patient record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...emergencyContact });
  } catch (error) {
    console.error("PATIENT EMERGENCY GET ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch emergency contact" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
    if (response) return response;

    const body = await req.json();
    const emergencyContact = await savePatientEmergencyContact(user, body);

    return NextResponse.json({
      success: true,
      message: "Emergency contact saved successfully",
      ...emergencyContact,
    });
  } catch (error) {
    console.error("PATIENT EMERGENCY POST ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to save emergency contact" }, { status: 500 });
  }
}
