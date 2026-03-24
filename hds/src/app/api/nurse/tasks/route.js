import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/rbac";
import { getNurseTasks } from "@/lib/nurseTasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { response, user } = await requireApiUser(req, ["nurse", "super_admin"]);
    if (response) return response;

    const tasks = await getNurseTasks(user);
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error("NURSE TASKS GET ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch nurse tasks" }, { status: 500 });
  }
}
