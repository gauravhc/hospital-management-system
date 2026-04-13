const bcrypt = require("bcryptjs");
const { getConnection } = require("../config/database");

const USER_ROLE_MAP = new Set([
  "admin",
  "doctor",
  "nurse",
  "pharmacist",
  "reception",
  "lab",
  "patient",
  "super_admin",
  "hospital_admin",
]);

function normalizeFullName(payload = {}) {
  return (
    payload.full_name ||
    payload.name ||
    [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim()
  );
}

function normalizeUserRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return USER_ROLE_MAP.has(normalized) ? normalized : "admin";
}

async function createLegacyUserWithRole(payload, options = {}) {
  const connection = options.connection || (await getConnection());
  const ownsConnection = !options.connection;

  try {
    if (ownsConnection) {
      await connection.beginTransaction();
    }

    const fullName = normalizeFullName(payload);
    const email = String(payload.email || "").trim().toLowerCase();
    const phone = payload.phone || payload.mobile || null;
    const hospitalId = payload.hospital_id ?? payload.hospitalId ?? null;
    const rawRole = options.userRole || payload.role;
    const userRole = normalizeUserRole(rawRole);
    const passwordHash = payload.passwordHash || (await bcrypt.hash(payload.password || "123456", 10));

    const [userColumns] = await connection.execute(`SHOW COLUMNS FROM users`);
    const availableUserColumns = new Set(userColumns.map((column) => column.Field));
    const userValues = {};

    if (availableUserColumns.has("full_name")) userValues.full_name = fullName;
    if (availableUserColumns.has("name")) userValues.name = fullName;
    if (availableUserColumns.has("first_name")) userValues.first_name = payload.first_name || fullName;
    if (availableUserColumns.has("last_name")) userValues.last_name = payload.last_name || ".";
    if (availableUserColumns.has("email")) userValues.email = email;
    if (availableUserColumns.has("username")) userValues.username = email;
    if (availableUserColumns.has("password")) userValues.password = passwordHash;
    if (availableUserColumns.has("password_hash")) userValues.password_hash = passwordHash;
    if (availableUserColumns.has("mobile")) userValues.mobile = phone;
    if (availableUserColumns.has("phone")) userValues.phone = phone;
    if (availableUserColumns.has("role")) userValues.role = userRole;
    if (availableUserColumns.has("department")) userValues.department = payload.department ?? null;
    if (availableUserColumns.has("specialization")) userValues.specialization = payload.specialization ?? null;
    if (availableUserColumns.has("status")) userValues.status = payload.status || "active";
    if (availableUserColumns.has("hospital_id")) userValues.hospital_id = hospitalId;

    const userInsertColumns = Object.keys(userValues);
    const [userResult] = await connection.execute(
      `INSERT INTO users (${userInsertColumns.map((column) => `\`${column}\``).join(", ")})
       VALUES (${userInsertColumns.map(() => "?").join(", ")})`,
      userInsertColumns.map((column) => userValues[column])
    );

    const userId = userResult.insertId;

    switch (options.roleTable) {
      case "hospital_admins": {
        await connection.execute(
          `INSERT INTO hospital_admins (hospital_id, full_name, email, password, phone)
           VALUES (?, ?, ?, ?, ?)`,
          [hospitalId, fullName, email, passwordHash, phone]
        );
        break;
      }
      case "doctors": {
        await connection.execute(
          `INSERT INTO doctors (hospital_id, full_name, email, phone, specialization, password)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [hospitalId, fullName, email, phone, payload.specialization || null, passwordHash]
        );
        break;
      }
      case "nurses": {
        await connection.execute(
          `INSERT INTO nurses (hospital_id, full_name, email, phone, password)
           VALUES (?, ?, ?, ?, ?)`,
          [hospitalId, fullName, email, phone, passwordHash]
        );
        break;
      }
      case "patients": {
        await connection.execute(
          `INSERT INTO patients (hospital_id, full_name, email, password, phone, address, dob, gender, status, profile_image, blood_group)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            hospitalId,
            fullName,
            email,
            passwordHash,
            phone,
            payload.address || null,
            payload.dob || payload.date_of_birth || null,
            payload.gender || null,
            payload.status || "active",
            payload.profile_image || null,
            payload.blood_group || null,
          ]
        );
        break;
      }
      case "staff": {
        const [staffColumns] = await connection.execute(`SHOW COLUMNS FROM staff`);
        const available = new Set(staffColumns.map((column) => column.Field));
        const values = {};

        if (available.has("hospital_id")) values.hospital_id = hospitalId;
        if (available.has("name")) values.name = fullName;
        if (available.has("full_name")) values.full_name = fullName;
        if (available.has("role")) values.role = payload.staff_role || rawRole || "staff";
        if (available.has("phone")) values.phone = phone;
        if (available.has("mobile")) values.mobile = phone;
        if (available.has("email")) values.email = email;
        if (available.has("password")) values.password = passwordHash;
        if (available.has("password_hash")) values.password_hash = passwordHash;
        if (available.has("department")) values.department = payload.department ?? null;
        if (available.has("status")) values.status = payload.status || "active";

        const columns = Object.keys(values);
        await connection.execute(
          `INSERT INTO staff (${columns.map((column) => `\`${column}\``).join(", ")})
           VALUES (${columns.map(() => "?").join(", ")})`,
          columns.map((column) => values[column])
        );
        break;
      }
      default:
        break;
    }

    if (ownsConnection) {
      await connection.commit();
    }

    return {
      user_id: userId,
      hospital_id: hospitalId,
      email,
      role: userRole,
      full_name: fullName,
    };
  } catch (error) {
    if (ownsConnection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (ownsConnection) {
      connection.release();
    }
  }
}

module.exports = {
  createLegacyUserWithRole,
  normalizeFullName,
  normalizeUserRole,
};
