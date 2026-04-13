const bcrypt = require("bcryptjs");
const { getConnection, query } = require("../../config/database");
const { getSchemaMode } = require("../../services/schemaMode.service");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

const HOSPITAL_TYPES = ["Hospital", "Clinic", "Lab", "Pharmacy"];
const VERIFICATION_STATUSES = ["Pending", "Approved", "Rejected"];

function normalizeHospitalType(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Hospital";
  const match = HOSPITAL_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase());
  return match || "Hospital";
}

function normalizeVerificationStatus(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Pending";
  const match = VERIFICATION_STATUSES.find((s) => s.toLowerCase() === raw.toLowerCase());
  return match || "Pending";
}

async function insertHospitalRow(connectionOrQuery, payload) {
  const cols = await getTableColumns("hospitals");
  if (!cols) throw new Error("Hospitals table not found");

  const values = {};
  const add = (name, value) => {
    if (!cols.has(name)) return;
    values[name] = value;
  };

  add("name", payload.name);
  add("address", payload.address || null);
  add("phone", payload.phone || null);
  add("email", payload.email || null);
  add("gst_number", payload.gst_number || null);
  add("certification", payload.certification || null);
  add("license_no", payload.license_no || null);
  add("bed_capacity", payload.bed_capacity ?? 0);
  add("is_active", payload.is_active !== false);
  add("website", payload.website || null);
  add("type_of_hospital", normalizeHospitalType(payload.type_of_hospital || payload.hospital_type));
  add("license_document", payload.license_document || null);
  add("verification_status", normalizeVerificationStatus(payload.verification_status));

  const insertCols = Object.keys(values);
  if (!insertCols.length) throw new Error("No insertable hospital fields found");

  const placeholders = insertCols.map(() => "?").join(", ");
  const sql = `INSERT INTO hospitals (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`;
  const params = insertCols.map((c) => values[c]);

  if (typeof connectionOrQuery.execute === "function") {
    const [result] = await connectionOrQuery.execute(sql, params);
    return result;
  }

  return query(sql, params);
}

async function list() {
  const mode = await getSchemaMode();
  const orderBy = mode === "legacy" ? "id DESC" : "created_at DESC";
  return query(`SELECT * FROM hospitals ORDER BY ${orderBy}`);
}

async function listActive() {
  const cols = await getTableColumns("hospitals");
  const hasActive = cols?.has("is_active");

  const where = hasActive ? "WHERE is_active = 1" : "";
  const rows = await query(
    `SELECT id, name, address FROM hospitals ${where} ORDER BY name ASC, id ASC`
  );
  return rows;
}

async function create(payload) {
  const mode = await getSchemaMode();

  if (mode === "legacy") {
      const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const hospitalResult = await insertHospitalRow(connection, payload);

      const hospitalId = hospitalResult.insertId;

      const adminName =
        payload.admin_name || payload.adminName || payload.admin_email || payload.email || "Hospital Admin";
      const adminEmail = payload.admin_email || payload.adminEmail || payload.email || null;
      const adminPassword = payload.admin_password || payload.adminPassword || payload.password || "Admin@123";
      const adminPhone = payload.admin_phone || payload.phone || null;

      const adminCols = await getTableColumns("hospital_admins");
      if (adminCols) {
        const values = {};
        const nameCol = firstExistingColumn(adminCols, ["full_name", "name"]);
        if (nameCol) values[nameCol] = adminName;
        if (adminCols.has("email")) values.email = adminEmail;
        if (adminCols.has("phone")) values.phone = adminPhone;
        if (adminCols.has("hospital_id")) values.hospital_id = hospitalId;

        const passwordCol = firstExistingColumn(adminCols, ["password", "password_hash"]);
        if (passwordCol) {
          values[passwordCol] = await bcrypt.hash(String(adminPassword), 10);
        }

        const insertCols = Object.keys(values);
        if (insertCols.length) {
          const placeholders = insertCols.map(() => "?").join(", ");
          await connection.execute(
            `INSERT INTO hospital_admins (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
            insertCols.map((c) => values[c])
          );
        }
      }

      const [hospitalRows] = await connection.execute(`SELECT * FROM hospitals WHERE id = ? LIMIT 1`, [
        hospitalId,
      ]);

      await connection.commit();

      return {
        hospital_id: hospitalId,
        hospital: hospitalRows?.[0] || null,
        admin: { email: adminEmail, hospital_id: hospitalId },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  const result = await insertHospitalRow(query, payload);
  const hospitalId = result?.insertId || null;
  const rows = hospitalId ? await query(`SELECT * FROM hospitals WHERE id = ?`, [hospitalId]) : [];
  return { hospital_id: hospitalId, hospital: rows[0] || null };
}

async function getById(id) {
  const rows = await query(`SELECT * FROM hospitals WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function update(id, payload) {
  const cols = await getTableColumns("hospitals");
  if (!cols) throw new Error("Hospitals table not found");

  const sets = [];
  const params = [];

  const add = (col, value) => {
    if (!cols.has(col)) return;
    sets.push(`\`${col}\` = COALESCE(?, \`${col}\`)`);
    params.push(value ?? null);
  };

  add("name", payload.name || null);
  add("address", payload.address || null);
  add("phone", payload.phone || null);
  add("email", payload.email || null);
  add("gst_number", payload.gst_number || null);
  add("certification", payload.certification || null);
  add("license_no", payload.license_no || null);
  add("bed_capacity", payload.bed_capacity ?? null);
  add("is_active", typeof payload.is_active === "boolean" ? payload.is_active : null);
  add("website", payload.website || null);
  add(
    "type_of_hospital",
    payload.type_of_hospital || payload.hospital_type ? normalizeHospitalType(payload.type_of_hospital || payload.hospital_type) : null
  );
  add("license_document", payload.license_document || null);

  if (!sets.length) return { affectedRows: 0 };

  params.push(id);
  return query(`UPDATE hospitals SET ${sets.join(", ")} WHERE id = ?`, params);
}

function remove(id) {
  return query(`DELETE FROM hospitals WHERE id = ?`, [id]);
}

async function setVerificationStatus(id, status) {
  const cols = await getTableColumns("hospitals");
  if (!cols || !cols.has("verification_status")) {
    throw new Error("Hospitals table missing verification_status column");
  }

  const next = normalizeVerificationStatus(status);
  return query(`UPDATE hospitals SET verification_status = ? WHERE id = ?`, [next, id]);
}

module.exports = {
  list,
  listActive,
  create,
  getById,
  update,
  remove,
  setVerificationStatus,
  normalizeVerificationStatus,
};
