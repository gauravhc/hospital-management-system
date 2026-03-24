import { NextResponse } from "next/server";
import { appointmentService } from "@/services/backend/appointmentService";

const getParams = async (context) => {
  const params = await context?.params;
  return {
    action: String(params?.action || "").toLowerCase(),
    id: params?.id,
  };
};

const handleMutation = async (req, context, method = "PUT") => {
  const { action, id } = await getParams(context);
  if (!id || !action) {
    return NextResponse.json(
      { success: false, message: "Action and id are required" },
      { status: 400 }
    );
  }

  try {
    if (action === "cancel") {
      const updated = await appointmentService.updateStatus(id, "cancelled");
      if (!updated) {
        return NextResponse.json({ success: false, message: "Appointment not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, appointment: updated });
    }

    if (action === "update") {
      const body = await req.json().catch(() => ({}));
      const date = body?.date;
      if (!date) {
        return NextResponse.json({ success: false, message: "Date is required" }, { status: 400 });
      }
      const updated = await appointmentService.updateAppointmentDate(id, date);
      if (!updated) {
        return NextResponse.json({ success: false, message: "Appointment not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, appointment: updated });
    }

    if (action === "delete") {
      if (method !== "DELETE") {
        return NextResponse.json({ success: false, message: "Use DELETE for this action" }, { status: 405 });
      }
      const removed = await appointmentService.deleteAppointment(id);
      if (!removed) {
        return NextResponse.json({ success: false, message: "Appointment not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, appointment: removed });
    }

    return NextResponse.json({ success: false, message: "Unsupported action" }, { status: 404 });
  } catch (error) {
    console.error("APPOINTMENT ACTION API ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process appointment action" },
      { status: 500 }
    );
  }
};

export async function PUT(req, context) {
  return handleMutation(req, context, "PUT");
}

export async function PATCH(req, context) {
  return handleMutation(req, context, "PATCH");
}

export async function DELETE(req, context) {
  return handleMutation(req, context, "DELETE");
}

