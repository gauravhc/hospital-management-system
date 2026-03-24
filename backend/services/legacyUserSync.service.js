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

    const [userResult] = await connection.execute(
      `INSERT INTO users (full_name, email, password, mobile, role, department, specialization, status, hospital_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        email,
        passwordHash,
        phone,
        userRole,
        payload.department || null,
        payload.specialization || null,
        payload.status || "active",
        hospitalId,
      ]
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
        await connection.execute(
          `INSERT INTO staff (hospital_id, name, role, phone, email)
           VALUES (?, ?, ?, ?, ?)`,
          [hospitalId, fullName, payload.staff_role || rawRole || "staff", phone, email]
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
