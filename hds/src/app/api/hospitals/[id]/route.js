import { NextResponse } from "next/server";
import db from "@/lib/db";

const getHospitalId = async (req, context) => {
  const resolvedParams = await context?.params;
  let hospitalId = resolvedParams?.id;
  if (!hospitalId) {
    const segments = req.nextUrl.pathname.split("/").filter(Boolean);
    hospitalId = segments[segments.length - 1];
  }
  return hospitalId;
};

export async function PUT(req, context) {
  try {
    const hospitalId = await getHospitalId(req, context);
    const { name, address, gst_number, certification, phone } = await req.json();

    if (!name || !address || !gst_number || !certification || !phone) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `
      UPDATE hospitals
      SET name = ?, address = ?, gst_number = ?, certification = ?, phone = ?
      WHERE id = ?
      `,
      [name, address, gst_number, certification, phone, hospitalId]
    );

    if (!result.affectedRows) {
      return NextResponse.json(
        { success: false, message: "Hospital not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Hospital updated successfully" });
  } catch (error) {
    console.error("HOSPITALS PUT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update hospital" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  try {
    const hospitalId = await getHospitalId(req, context);
    const [result] = await db.query("DELETE FROM hospitals WHERE id = ?", [hospitalId]);

    if (!result.affectedRows) {
      return NextResponse.json(
        { success: false, message: "Hospital not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Hospital deleted successfully" });
  } catch (error) {
    console.error("HOSPITALS DELETE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete hospital" },
      { status: 500 }
    );
  }
}
