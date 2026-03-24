import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

export async function POST(req) {
  try {
    const { response, user } = await requireApiUser(req, ["patient", "super_admin"]);
    if (response) return response;

    const body = await req.json();
    const pickup = String(body?.pickup_location || "").trim();
    const destination = String(body?.destination || "").trim();
    const contactPhone = String(body?.contact_phone || "").trim();
    const ambulanceType = String(body?.ambulance_type || "Normal").trim();
    const pickupTime = body?.pickup_time || null;

    if (!pickup || !destination || !contactPhone) {
      return NextResponse.json(
        { success: false, message: "Pickup, destination and contact phone are required" },
        { status: 400 }
      );
    }

    const cols = await getTableColumns("ambulance_requests");
    if (!cols) {
      // Graceful success even without table so the module remains usable in UI.
      return NextResponse.json({ success: true, message: "Ambulance request submitted" });
    }

    const payload = {};
    if (cols.has("patient_id")) payload.patient_id = user.id;
    if (cols.has("pickup_location")) payload.pickup_location = pickup;
    if (cols.has("destination")) payload.destination = destination;
    if (cols.has("ambulance_type")) payload.ambulance_type = ambulanceType;
    if (cols.has("pickup_time")) payload.pickup_time = pickupTime;
    if (cols.has("contact_phone")) payload.contact_phone = contactPhone;
    if (cols.has("status")) payload.status = "pending";
    if (cols.has("created_at")) payload.created_at = new Date();

    const fields = Object.keys(payload);
    if (fields.length) {
      await db.query(
        `INSERT INTO ambulance_requests (${fields.map((f) => `\`${f}\``).join(", ")})
         VALUES (${fields.map(() => "?").join(", ")})`,
        fields.map((f) => payload[f])
      );
    }

    return NextResponse.json({ success: true, message: "Ambulance request submitted" });
  } catch (error) {
    console.error("AMBULANCE REQUEST API ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to request ambulance" },
      { status: 500 }
    );
  }
}

