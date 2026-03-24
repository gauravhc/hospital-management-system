import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/rbac";
import { updateNurseTask } from "@/lib/nurseTasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getTaskId = async (request, context) => {
  const params = await context?.params;
  return params?.id || request.nextUrl.pathname.split("/").filter(Boolean).pop();
};

export async function PUT(request, context) {
  try {
    const { response, user } = await requireApiUser(request, ["nurse", "super_admin"]);
    if (response) return response;

    const taskId = await getTaskId(request, context);
    const body = await request.json();
    const updatedValue = String(body?.updated_value || "").trim();

    if (!taskId || !updatedValue) {
      return NextResponse.json({ success: false, message: "Task id and updated value are required" }, { status: 400 });
    }

    const result = await updateNurseTask(user, taskId, updatedValue);
    if (!result?.affectedRows) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Task updated successfully" });
  } catch (error) {
    console.error("NURSE UPDATE TASK PUT ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to update nurse task" }, { status: 500 });
  }
}
