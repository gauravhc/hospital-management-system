import { NextResponse } from "next/server";
import db from "@/lib/db";
import { deleteRoleUser, getTableColumns, updateRoleUser } from "@/lib/authTables";
import { requireApiUser } from "@/lib/rbac";

const getHospitalId = async (req, context) => {
  const resolvedParams = await context?.params;
  let hospitalId = resolvedParams?.id;

  if (!hospitalId) {
    const segments = req.nextUrl.pathname.split("/").filter(Boolean);
    hospitalId = segments[segments.length - 1];
  }

  return hospitalId;
};

const firstExistingColumn = (columns, candidates) =>
  candidates.find((c) => columns?.has(c)) || null;

const getPhoneColumn = (columns) =>
  firstExistingColumn(columns, [
    "phone",
    "mobile",
    "contact_number",
    "contact_no",
    "contact",
    "phone_number",
  ]);

const getHospitalNameColumn = (columns) =>
  firstExistingColumn(columns, ["hospital_name", "hospital", "organization_name", "org_name"]);

const resolveAdminRecordById = async ({ hospitalId }) => {
  const table = "hospital_admins";
  const cols = await getTableColumns(table);
  if (!cols) return null;

  const idCol = cols.has("id") ? "id" : cols.has("user_id") ? "user_id" : null;
  if (!idCol) return null;

  const selectHospital = cols.has("hospital_id") ? "`hospital_id`" : "NULL";
  const [rows] = await db.query(
    `SELECT \`${idCol}\` AS id, ${selectHospital} AS hospital_id
     FROM \`${table}\`
     WHERE \`${idCol}\` = ?
     LIMIT 1`,
    [hospitalId]
  );

  if (!rows.length) return null;
  return { table, cols, idCol, row: rows[0] };
};

export async function PUT(req, context) {
  try {
    const { response } = await requireApiUser(req, ["super_admin"]);
    if (response) return response;

    const hospitalId = await getHospitalId(req, context);
    if (!hospitalId || hospitalId === "[id]") {
      return NextResponse.json({ message: "Hospital id is required" }, { status: 400 });
    }

    const { name, email, phone, hospital_name, admin_name } = await req.json();
    const trimmedHospitalName = (hospital_name || name || "").trim();
    const trimmedName = (admin_name || trimmedHospitalName).trim();
    const trimmedEmail = (email || "").trim();
    const trimmedPhone = (phone || "").trim();

    if (!trimmedHospitalName || !trimmedEmail) {
      return NextResponse.json(
        { message: "Hospital name and email are required" },
        { status: 400 }
      );
    }

    const resolved = await resolveAdminRecordById({ hospitalId });
    if (!resolved) {
      return NextResponse.json({ message: "Hospital not found" }, { status: 404 });
    }
    const { table, idCol, row } = resolved;

    const [existing] = await db.query(
      `SELECT \`${idCol}\` AS id FROM \`${table}\` WHERE email = ? AND \`${idCol}\` <> ? LIMIT 1`,
      [trimmedEmail, hospitalId]
    );
    if (existing.length > 0) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const result = await updateRoleUser({
      table,
      id: hospitalId,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
    });

    if (!result.affectedRows) {
      return NextResponse.json({ message: "Hospital not found" }, { status: 404 });
    }

    const hospitalNameColInSource = getHospitalNameColumn(resolved.cols);
    if (hospitalNameColInSource) {
      await db.query(
        `UPDATE \`${table}\` SET \`${hospitalNameColInSource}\` = ? WHERE \`${idCol}\` = ?`,
        [trimmedHospitalName, hospitalId]
      );
    }

    const linkedHospitalId = row?.hospital_id ?? null;

    if (linkedHospitalId !== null && linkedHospitalId !== undefined) {
      const hospitalCols = await getTableColumns("hospitals");
      if (hospitalCols) {
        const hospitalIdCol = firstExistingColumn(hospitalCols, ["id", "hospital_id", "user_id"]);
        const hospitalNameCol = firstExistingColumn(hospitalCols, ["name", "hospital_name", "title"]);
        const hospitalPhoneCol = getPhoneColumn(hospitalCols);

        if (hospitalIdCol && hospitalNameCol) {
          const updateParts = [`\`${hospitalNameCol}\` = ?`];
          const updateParams = [trimmedHospitalName];
          if (hospitalPhoneCol) {
            updateParts.push(`\`${hospitalPhoneCol}\` = ?`);
            updateParams.push(trimmedPhone || null);
          }
          updateParams.push(linkedHospitalId);
          await db.query(
            `UPDATE hospitals SET ${updateParts.join(", ")} WHERE \`${hospitalIdCol}\` = ?`,
            updateParams
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SUPER ADMIN HOSPITAL PUT API ERROR:", error);
    return NextResponse.json(
      { message: "Failed to update hospital" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  try {
    const { response } = await requireApiUser(req, ["super_admin"]);
    if (response) return response;

    const hospitalId = await getHospitalId(req, context);
    if (!hospitalId || hospitalId === "[id]") {
      return NextResponse.json({ message: "Hospital id is required" }, { status: 400 });
    }

    const resolved = await resolveAdminRecordById({ hospitalId });
    if (!resolved) {
      return NextResponse.json({ message: "Hospital not found" }, { status: 404 });
    }

    const linkedHospitalId = resolved.row?.hospital_id ?? null;
    const result = await deleteRoleUser({ table: resolved.table, id: hospitalId });
    if (!result.affectedRows) {
      return NextResponse.json({ message: "Hospital not found" }, { status: 404 });
    }

    // Keep DB in sync with dashboard expectations: remove linked hospital row when
    // this was the last admin for that hospital.
    let hospitalDeleted = false;
    if (linkedHospitalId !== null && linkedHospitalId !== undefined) {
      let hasAnyAdmin = false;
      const hospitalAdminsCols = await getTableColumns("hospital_admins");
      if (hospitalAdminsCols?.has("hospital_id")) {
        const [rows] = await db.query(
          `SELECT 1 AS ok FROM hospital_admins WHERE hospital_id = ? LIMIT 1`,
          [linkedHospitalId]
        );
        if (rows.length) hasAnyAdmin = true;
      }

      if (!hasAnyAdmin) {
        const hospitalCols = await getTableColumns("hospitals");
        const hospitalIdCol = firstExistingColumn(hospitalCols, ["id", "hospital_id", "user_id"]);
        if (hospitalIdCol) {
          try {
            const [delRes] = await db.query(
              `DELETE FROM hospitals WHERE \`${hospitalIdCol}\` = ?`,
              [linkedHospitalId]
            );
            hospitalDeleted = Boolean(delRes?.affectedRows);
          } catch (err) {
            // If constrained by FK, fallback to soft-delete when supported.
            if (
              (err?.code === "ER_ROW_IS_REFERENCED_2" || err?.code === "ER_ROW_IS_REFERENCED") &&
              hospitalCols?.has("status")
            ) {
              await db.query(
                `UPDATE hospitals SET \`status\` = 'inactive' WHERE \`${hospitalIdCol}\` = ?`,
                [linkedHospitalId]
              );
            } else {
              throw err;
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, hospital_deleted: hospitalDeleted });
  } catch (error) {
    console.error("SUPER ADMIN HOSPITAL DELETE API ERROR:", error);
    return NextResponse.json(
      { message: "Failed to delete hospital" },
      { status: 500 }
    );
  }
}
