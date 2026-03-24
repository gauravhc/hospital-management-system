import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/rbac";
import { getPatientDocuments } from "@/lib/patientData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
    if (response) return response;

    const documents = await getPatientDocuments(user);
    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error("PATIENT DOCUMENTS GET ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch documents" }, { status: 500 });
  }
}
