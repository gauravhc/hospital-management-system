import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { emailExists, getTableColumns, insertRoleUser } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const firstExistingColumn = (columns, candidates) =>
  candidates.find((c) => columns?.has(c)) || null;

const getPhoneColumn = (columns) =>
  firstExistingColumn(columns, [
    "mobile",
    "phone",
    "contact_number",
    "contact_no",
    "contact",
    "phone_number",
  ]);

const resolveHospitalContext = async () => {
  const hospitalCols = await getTableColumns("hospitals");
  if (!hospitalCols) {
    return { hospitalCols: null, hospitalIdCol: null, hospitalNameCol: null };
  }

  const hospitalIdCol = firstExistingColumn(hospitalCols, ["id", "hospital_id", "user_id"]);
  const hospitalNameCol = firstExistingColumn(hospitalCols, ["name", "hospital_name", "title"]);

  return { hospitalCols, hospitalIdCol, hospitalNameCol };
};

export async function GET(req) {
  try {
    const { response } = await requireApiUser(req, ["super_admin"]);
    if (response) return response;

    const adminCols = await getTableColumns("hospital_admins");
    if (!adminCols) return NextResponse.json([]);

    const idCol = adminCols.has("id") ? "id" : adminCols.has("user_id") ? "user_id" : null;
    const nameCol = adminCols.has("full_name")
      ? "full_name"
      : adminCols.has("name")
        ? "name"
        : null;
    const phoneCol = getPhoneColumn(adminCols);
    if (!idCol || !nameCol || !adminCols.has("email")) {
      return NextResponse.json([]);
    }
    const where = adminCols.has("status") ? "WHERE status = 'active'" : "";
    const orderBy = adminCols.has("created_at")
      ? "ORDER BY created_at DESC"
      : `ORDER BY ${idCol} DESC`;
    const hasAdminHospitalId = adminCols.has("hospital_id");
    const [rows] = await db.query(
      `
      SELECT
        \`${idCol}\` AS id,
        \`${nameCol}\` AS name,
        email,
        ${phoneCol ? `\`${phoneCol}\`` : "NULL"} AS phone,
        ${hasAdminHospitalId ? "`hospital_id`" : "NULL"} AS hospital_id
      FROM hospital_admins
      ${where}
      ${orderBy}
      `
    );

    let hospitalNameById = new Map();
    let hospitalPhoneById = new Map();
    const { hospitalCols, hospitalIdCol, hospitalNameCol } = await resolveHospitalContext();
    if (hospitalIdCol && hospitalNameCol) {
      const hospitalPhoneCol = getPhoneColumn(hospitalCols);
      const [hospitalRows] = await db.query(
        `SELECT \`${hospitalIdCol}\` AS id, \`${hospitalNameCol}\` AS name, ${hospitalPhoneCol ? `\`${hospitalPhoneCol}\`` : "NULL"} AS phone FROM hospitals`
      );
      hospitalNameById = new Map(hospitalRows.map((h) => [String(h.id), h.name]));
      hospitalPhoneById = new Map(hospitalRows.map((h) => [String(h.id), h.phone]));
    }

    const payload = rows.map((row) => {
      const hospitalName =
        row.hospital_id !== null && row.hospital_id !== undefined
          ? hospitalNameById.get(String(row.hospital_id)) || row.name
          : row.name;
      const hospitalPhone =
        row.hospital_id !== null && row.hospital_id !== undefined
          ? hospitalPhoneById.get(String(row.hospital_id))
          : null;

      return {
        ...row,
        admin_name: row.name,
        hospital_name: hospitalName || row.name,
        phone: row.phone || hospitalPhone || null,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("SUPER ADMIN HOSPITALS GET API ERROR:", error);
    return NextResponse.json(
      { message: "Failed to fetch hospitals" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { response } = await requireApiUser(req, ["super_admin"]);
    if (response) return response;

    const { name, email, phone, password, hospital_id, hospital_name, admin_name } = await req.json();
    const resolvedHospitalName = String(hospital_name || name || "").trim();
    const resolvedAdminName = String(admin_name || resolvedHospitalName).trim();
    const trimmedEmail = String(email || "").trim();
    const trimmedPhone = String(phone || "").trim();

    if (!resolvedHospitalName || !trimmedEmail) {
      return NextResponse.json(
        { message: "Hospital name and email are required" },
        { status: 400 }
      );
    }

    if (await emailExists(trimmedEmail)) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 }
      );
    }

    const selectedPassword = String(password || process.env.HOSPITAL_ADMIN_DEFAULT_PASSWORD || "Admin@123");
    const hashedPassword = await bcrypt.hash(selectedPassword, 10);

    let resolvedHospitalId = hospital_id ?? null;
    const { hospitalCols, hospitalIdCol, hospitalNameCol } = await resolveHospitalContext();
    if (hospitalCols && hospitalIdCol && hospitalNameCol) {
      const hospitalPhoneCol = firstExistingColumn(hospitalCols, [
        "phone",
        "mobile",
        "contact_number",
        "contact_no",
        "contact",
        "phone_number",
      ]);
      if (resolvedHospitalId !== null && resolvedHospitalId !== undefined && String(resolvedHospitalId).trim()) {
        const [existingHospital] = await db.query(
          `SELECT \`${hospitalIdCol}\` AS id FROM hospitals WHERE \`${hospitalIdCol}\` = ? LIMIT 1`,
          [resolvedHospitalId]
        );
        if (!existingHospital.length) {
          return NextResponse.json({ message: "Invalid hospital selected" }, { status: 400 });
        }

        const updateParts = [`\`${hospitalNameCol}\` = ?`];
        const updateParams = [resolvedHospitalName];
        if (hospitalPhoneCol) {
          updateParts.push(`\`${hospitalPhoneCol}\` = ?`);
          updateParams.push(trimmedPhone || null);
        }
        updateParams.push(resolvedHospitalId);
        await db.query(
          `UPDATE hospitals SET ${updateParts.join(", ")} WHERE \`${hospitalIdCol}\` = ?`,
          updateParams
        );
      } else {
        const [existingByName] = await db.query(
          `SELECT \`${hospitalIdCol}\` AS id FROM hospitals WHERE LOWER(\`${hospitalNameCol}\`) = LOWER(?) LIMIT 1`,
          [resolvedHospitalName]
        );

        if (existingByName.length) {
          resolvedHospitalId = existingByName[0].id;
          const updateParts = [];
          const updateParams = [];
          if (hospitalPhoneCol) {
            updateParts.push(`\`${hospitalPhoneCol}\` = ?`);
            updateParams.push(trimmedPhone || null);
          }
          if (updateParts.length) {
            updateParams.push(resolvedHospitalId);
            await db.query(
              `UPDATE hospitals SET ${updateParts.join(", ")} WHERE \`${hospitalIdCol}\` = ?`,
              updateParams
            );
          }
        } else {
          const hospitalValues = { [hospitalNameCol]: resolvedHospitalName };
          if (hospitalPhoneCol && trimmedPhone) hospitalValues[hospitalPhoneCol] = trimmedPhone;
          if (hospitalCols.has("status")) hospitalValues.status = "active";
          if (hospitalCols.has("created_at")) hospitalValues.created_at = new Date();

          const insertCols = Object.keys(hospitalValues);
          const [hospitalInsert] = await db.query(
            `INSERT INTO hospitals (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${insertCols.map(() => "?").join(", ")})`,
            insertCols.map((c) => hospitalValues[c])
          );
          resolvedHospitalId = hospitalInsert.insertId;
        }
      }
    }

    const created = await insertRoleUser({
      role: "hospital_admin",
      name: resolvedAdminName,
      email: trimmedEmail,
      passwordHash: hashedPassword,
      phone: trimmedPhone,
      hospitalId: resolvedHospitalId,
    });

    return NextResponse.json(
      {
        id: created.id,
        name: resolvedAdminName,
        admin_name: resolvedAdminName,
        hospital_name: resolvedHospitalName,
        hospital_id: resolvedHospitalId,
        email: trimmedEmail,
        phone: trimmedPhone || null,
        table: created.table,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SUPER ADMIN HOSPITALS POST API ERROR:", error);
    return NextResponse.json(
      { message: "Failed to create hospital admin" },
      { status: 500 }
    );
  }
}
