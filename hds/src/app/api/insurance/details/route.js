import { NextResponse } from "next/server";

import { createInsuranceDetail, getInsuranceDetails } from "@/lib/insuranceData";
import { requireApiUser } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { response, user } = await requireApiUser(req, ["hospital_admin", "super_admin"]);
    if (response) return response;

    const details = await getInsuranceDetails({ hospitalId: user?.hospital_id || null });
    return NextResponse.json({ success: true, data: details });
  } catch (error) {
    console.error("INSURANCE DETAILS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch insurance details" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { response, user } = await requireApiUser(req, ["hospital_admin", "super_admin"]);
    if (response) return response;

    const body = await req.json();
    const detail = await createInsuranceDetail({ ...body, hospital_id: user?.hospital_id || body?.hospital_id || null });

    return NextResponse.json(
      {
        success: true,
        message: "Insurance detail saved successfully",
        data: detail,
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error.message?.includes("required") ? 400 : 500;
    console.error("INSURANCE DETAILS POST ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save insurance detail" },
      { status }
    );
  }
}
