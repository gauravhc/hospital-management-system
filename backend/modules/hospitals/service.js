const bcrypt = require("bcryptjs");
const { getConnection, query } = require("../../config/database");
const { getSchemaMode } = require("../../services/schemaMode.service");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

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

      const [hospitalResult] = await connection.execute(
        `INSERT INTO hospitals (name, address, phone, gst_number, certification, email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          payload.name,
          payload.address || null,
          payload.phone || null,
          payload.gst_number || null,
          payload.certification || null,
          payload.email || null,
        ]
      );

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

  const result = await query(
    `INSERT INTO hospitals (name, address, phone, email, gst_number, certification, license_no, bed_capacity, is_active, website)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.name,
      payload.address || null,
      payload.phone || null,
      payload.email || null,
      payload.gst_number || null,
      payload.certification || null,
      payload.license_no || null,
      payload.bed_capacity || 0,
      payload.is_active !== false,
      payload.website || null,
    ]
  );

  const hospitalId = result?.insertId || null;
  const rows = hospitalId ? await query(`SELECT * FROM hospitals WHERE id = ?`, [hospitalId]) : [];
  return { hospital_id: hospitalId, hospital: rows[0] || null };
}

async function getById(id) {
  const rows = await query(`SELECT * FROM hospitals WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function update(id, payload) {
  const mode = await getSchemaMode();
  if (mode === "legacy") {
    return query(
      `UPDATE hospitals
       SET name = COALESCE(?, name),
           address = COALESCE(?, address),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           gst_number = COALESCE(?, gst_number),
           certification = COALESCE(?, certification)
       WHERE id = ?`,
      [
        payload.name || null,
        payload.address || null,
        payload.phone || null,
        payload.email || null,
        payload.gst_number || null,
        payload.certification || null,
        id,
      ]
    );
  }

  return query(
    `UPDATE hospitals
     SET name = ?, address = ?, phone = ?, email = ?, gst_number = ?, certification = ?, license_no = ?, bed_capacity = ?, is_active = ?, website = ?
     WHERE id = ?`,
    [
      payload.name,
      payload.address || null,
      payload.phone || null,
      payload.email || null,
      payload.gst_number || null,
      payload.certification || null,
      payload.license_no || null,
      payload.bed_capacity || 0,
      payload.is_active !== false,
      payload.website || null,
      id,
    ]
  );
}

function remove(id) {
  return query(`DELETE FROM hospitals WHERE id = ?`, [id]);
}

module.exports = { list, listActive, create, getById, update, remove };
