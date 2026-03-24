import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/rbac";
import {
  getPatientProfileBundle,
  updatePatientProfile,
} from "@/lib/patientData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const buildProfileResponse = (bundle) => {
  if (!bundle?.patient) return null;

  const { patient, emergency_contact } = bundle;

  return {
    id: patient.id,
    patient_id: patient.id,
    name: patient.full_name || "",
    full_name: patient.full_name || "",
    email: patient.email || "",
    phone: patient.phone || "",
    gender: patient.gender || "",
    dob: patient.dob || null,
    blood_group: patient.blood_group || "",
    height: patient.height || "",
    weight: patient.weight || "",
    address: patient.address || "",
    profile_image: patient.profile_image || "",
    profile_image_url: patient.profile_image ? `/uploads/patients/${patient.profile_image}` : "",
    emergency_contact,
    medical_history: bundle.medical_history,
    documents: bundle.documents,
  };
};

export async function GET(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
    if (response) return response;

    const bundle = await getPatientProfileBundle(user);
    if (!bundle?.patient) {
      return NextResponse.json({ success: false, message: "Patient profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ...buildProfileResponse(bundle),
    });
  } catch (error) {
    console.error("PATIENT PROFILE GET ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch patient profile" }, { status: 500 });
  }
}

const saveProfile = async (req) => {
  const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
  if (response) return response;

  const body = await req.json();
  const patient = await updatePatientProfile(user, body);
  const bundle = await getPatientProfileBundle(user);

  return NextResponse.json({
    success: true,
    message: "Profile updated successfully",
    ...buildProfileResponse({ ...bundle, patient: patient || bundle?.patient }),
  });
};

export async function PUT(req) {
  try {
    return await saveProfile(req);
  } catch (error) {
    console.error("PATIENT PROFILE PUT ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to update patient profile" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    return await saveProfile(req);
  } catch (error) {
    console.error("PATIENT PROFILE POST ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to update patient profile" }, { status: 500 });
  }
}
