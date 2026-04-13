import { NextResponse } from "next/server";

import { createClaim, getClaims } from "@/lib/insuranceData";
import { isHospitalAdmin, requireApiUser } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { response, user } = await requireApiUser(req, ["hospital_admin", "super_admin"]);
    if (response) return response;

    const claims = await getClaims();

    return NextResponse.json({ success: true, data: claims });
  } catch (error) {
    console.error("CLAIMS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch claims" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { response, user } = await requireApiUser(req, ["hospital_admin", "super_admin"]);
    if (response) return response;

    const body = await req.json();
    const claim = await createClaim(body);

    return NextResponse.json(
      {
        success: true,
        message: "Insurance claim submitted successfully",
        data: claim,
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error.message?.includes("required") ? 400 : 500;
    console.error("CLAIMS POST ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create claim" },
      { status }
    );
  }
}
