import { NextResponse } from "next/server";

import { createPolicy, getPolicies } from "@/lib/insurancePolicies";
import { requireApiUser } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { response } = await requireApiUser(req, ["hospital_admin", "super_admin"]);
    if (response) return response;

    const policies = await getPolicies();
    return NextResponse.json({ success: true, data: policies });
  } catch (error) {
    console.error("INSURANCE POLICIES GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch policies" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { response } = await requireApiUser(req, ["hospital_admin", "super_admin"]);
    if (response) return response;

    const body = await req.json();
    const policy = await createPolicy(body);

    return NextResponse.json(
      {
        success: true,
        message: "Policy created successfully",
        data: policy,
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error.message?.includes("required") ? 400 : 500;
    console.error("INSURANCE POLICIES POST ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create policy" },
      { status }
    );
  }
}
