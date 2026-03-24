import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import {
  clearTableColumnsCache,
  emailExists,
  getTableColumns,
  insertRoleUser,
} from "@/lib/authTables";
import { isHospitalAdmin, isSuperAdmin, requireApiUser } from "@/lib/rbac";

const SUPPORTED_ROLES = new Set([
  "patient",
  "doctor",
  "nurse",
  "hospital_admin",
  "super_admin",
]);

export async function POST(req) {
  try {
    const { response, user: actor } = await requireApiUser(req, ["super_admin", "hospital_admin"]);
    if (response) return response;

    const body = await req.json();

    const {
      name,
      email,
      password,
      role,
      department,
      specialization,
      mobile,
      alt_mobile,
      join_date,
      address_line1,
      address_line2,
      district,
      state,
      pincode,
      bank_name,
      account_number,
      ifsc_code,
      hospital_id,
    } = body;

    const missing = {};
    if (!name) missing.name = name;
    if (!email) missing.email = email;
    if (!password) missing.password = password;
    if (!role) missing.role = role;
    if (!mobile) missing.mobile = mobile;

    if (Object.keys(missing).length > 0) {
      return NextResponse.json(
        { success: false, message: "Required fields missing", missing },
        { status: 400 }
      );
    }

    if (await emailExists(email)) {
      return NextResponse.json(
        { success: false, message: "Email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const normalizedRole = String(role || "").toLowerCase().trim();
    if (!SUPPORTED_ROLES.has(normalizedRole)) {
      return NextResponse.json(
        { success: false, message: `Unsupported role "${normalizedRole}".` },
        { status: 400 }
      );
    }

    const blockedForHospitalAdmin = ["super_admin", "hospital_admin"];
    if (isHospitalAdmin(actor) && blockedForHospitalAdmin.includes(normalizedRole)) {
      return NextResponse.json(
        { success: false, message: "Hospital admin cannot create admin-level users" },
        { status: 403 }
      );
    }

    const effectiveHospitalId = isSuperAdmin(actor)
      ? hospital_id ?? null
      : actor.hospital_id ?? null;

    // Ensure patient credentials are stored in patients table (not users fallback).
    if (normalizedRole === "patient") {
      const patientColsRaw = await getTableColumns("patients");
      if (!patientColsRaw) {
        return NextResponse.json(
          { success: false, message: "Patients table not found" },
          { status: 500 }
        );
      }
      if (!patientColsRaw.has("password")) {
        await db.query("ALTER TABLE `patients` ADD COLUMN `password` VARCHAR(255) NULL AFTER `email`");
      }
      if (!patientColsRaw.has("status")) {
        await db.query("ALTER TABLE `patients` ADD COLUMN `status` VARCHAR(20) NULL AFTER `gender`");
      }
      clearTableColumnsCache("patients");
    }

    if (isHospitalAdmin(actor) && !effectiveHospitalId) {
      return NextResponse.json(
        { success: false, message: "Hospital admin is not mapped to any hospital" },
        { status: 403 }
      );
    }

    if (isHospitalAdmin(actor)) {
      const targetTableMap = {
        patient: "patients",
        doctor: "doctors",
        nurse: "nurses",
        hospital_admin: "hospital_admins",
        super_admin: "super_admins",
      };
      const targetCols = await getTableColumns(targetTableMap[normalizedRole]);
      if (!targetCols?.has("hospital_id")) {
        return NextResponse.json(
          {
            success: false,
            message: `Hospital admin cannot create role "${normalizedRole}" because it is not hospital-scoped`,
          },
          { status: 403 }
        );
      }
    }

    const created = await insertRoleUser({
      role,
      name,
      email,
      passwordHash: hashedPassword,
      phone: mobile,
      hospitalId: effectiveHospitalId,
      department,
      specialization,
      joinDate: join_date,
    });

    const staffCols = await getTableColumns("staff_profiles");
    if (staffCols && (staffCols.has("user_id") || staffCols.has("staff_id"))) {
      const profileData = {};
      if (staffCols.has("user_id")) profileData.user_id = created.id;
      if (staffCols.has("staff_id")) profileData.staff_id = created.id;
      if (staffCols.has("address_line1")) profileData.address_line1 = address_line1 || null;
      if (staffCols.has("address_line2")) profileData.address_line2 = address_line2 || null;
      if (staffCols.has("district")) profileData.district = district || null;
      if (staffCols.has("state")) profileData.state = state || null;
      if (staffCols.has("pincode")) profileData.pincode = pincode || null;
      if (staffCols.has("bank_name")) profileData.bank_name = bank_name || null;
      if (staffCols.has("account_number")) profileData.account_number = account_number || null;
      if (staffCols.has("ifsc_code")) profileData.ifsc_code = ifsc_code || null;
      if (staffCols.has("alt_mobile")) profileData.alt_mobile = alt_mobile || null;

      const cols = Object.keys(profileData);
      if (cols.length) {
        await db.query(
          `INSERT INTO staff_profiles (${cols.map((c) => `\`${c}\``).join(", ")})
           VALUES (${cols.map(() => "?").join(", ")})`,
          cols.map((c) => profileData[c])
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Staff created successfully",
      userId: created.id,
      table: created.table,
      role: created.role,
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
