const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");
const userService = require("../users/service");

const ROLE_LOGIN_ORDER = [
  { role: "super_admin", table: "super_admins" },
  { role: "hospital_admin", table: "hospital_admins" },
  { role: "doctor", table: "doctors" },
  { role: "nurse", table: "nurses" },
  { role: "staff", table: "staff" },
  { role: "patient", table: "patients" },
  { role: "reception", table: "receptionists" }, 
];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAppRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "administrator") return "hospital_admin";
  if (role === "superadmin" || role === "super-admin") return "super_admin";
  if (role === "reception" || role === "receptionist" || role === "register") return "register";
  if (role === "labtechnician" || role === "lab_technician" || role === "lab technician") return "lab";
  if (role === "inventorymanager" || role === "inventory_manager") return "inventory";
  if (role === "hrmanager" || role === "hr_manager" || role === "hr manager") return "hr";
  if (role === "insurance_manager" || role === "insurance manager" || role === "insurancemanager") return "insurance";
  return role;
}

function normalizeProfileImage(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("profile_images/")) return raw.slice("profile_images/".length);
  if (raw.startsWith("/uploads/profile_images/")) return raw.slice("/uploads/profile_images/".length);
  if (raw.startsWith("uploads/profile_images/")) return raw.slice("uploads/profile_images/".length);
  if (raw.startsWith("uploads/")) return raw.replace(/^uploads\//, "");
  if (raw.startsWith("/uploads/")) return raw.replace(/^\/uploads\//, "");
  return raw;
}

function buildUploadUrl(profileImage) {
  if (!profileImage) return "";
  if (/^https?:\/\//i.test(profileImage)) return profileImage;
  if (profileImage.includes("/")) return `/uploads/${profileImage}`;
  return `/uploads/profile_images/${profileImage}`;
}

async function resolveUserImageFromUsersTable(email) {
  const cols = await getTableColumns("users");
  if (!cols) return "";
  const emailCol = firstExistingColumn(cols, ["email", "username"]);
  const imageCol = firstExistingColumn(cols, ["profile_image_url", "profile_image", "avatar_url", "photo_url"]);
  if (!emailCol || !imageCol) return "";

  const rows = await query(
    `SELECT \`${imageCol}\` AS image FROM \`users\` WHERE \`${emailCol}\` = ? LIMIT 1`,
    [email]
  );

  return normalizeProfileImage(rows[0]?.image || "");
}

async function findRoleUserByEmail(email) {
  for (const entry of ROLE_LOGIN_ORDER) {
    const cols = await getTableColumns(entry.table);
    if (!cols) continue;

    const idCol = firstExistingColumn(cols, ["id", "user_id", `${entry.role}_id`]);
    const emailCol = firstExistingColumn(cols, ["email"]);
    const passwordCol = firstExistingColumn(cols, ["password", "password_hash"]);
    const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
    const statusCol = firstExistingColumn(cols, ["status"]);
    const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
    const imageCol = firstExistingColumn(cols, ["profile_image_url", "profile_image", "avatar_url", "photo_url"]);
    const roleCol = entry.role === "staff" ? firstExistingColumn(cols, ["role"]) : null;

    if (!idCol || !emailCol || !passwordCol) continue;

    const select = [
      `\`${idCol}\` AS id`,
      `\`${emailCol}\` AS email`,
      `\`${passwordCol}\` AS password`,
      hospitalCol ? `\`${hospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
      statusCol ? `\`${statusCol}\` AS status` : "NULL AS status",
      nameCol ? `\`${nameCol}\` AS name` : "NULL AS name",
      imageCol ? `\`${imageCol}\` AS profile_image` : "NULL AS profile_image",
      roleCol ? `\`${roleCol}\` AS staff_role` : "NULL AS staff_role",
    ];

    const rows = await query(
      `SELECT ${select.join(", ")} FROM \`${entry.table}\` WHERE \`${emailCol}\` = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) continue;

    if (entry.role === "staff") {
      const staffRole = normalizeAppRole(rows[0]?.staff_role || "staff");
      return { ...rows[0], role: staffRole || "staff" };
    }

    return { ...rows[0], role: normalizeAppRole(entry.role) };
  }

  return null;
}

async function findSharedUserByEmail(email) {
  const userCols = await getTableColumns("users");
  const roleCols = await getTableColumns("roles");
  if (!userCols) return null;

  const idCol = firstExistingColumn(userCols, ["id", "user_id"]);
  const emailCol = firstExistingColumn(userCols, ["email", "username"]);
  const passwordCol = firstExistingColumn(userCols, ["password_hash", "password"]);
  const hospitalCol = firstExistingColumn(userCols, ["hospital_id"]);
  const statusCol = firstExistingColumn(userCols, ["status"]);
  const fullNameCol = firstExistingColumn(userCols, ["full_name", "name"]);
  const firstNameCol = firstExistingColumn(userCols, ["first_name"]);
  const lastNameCol = firstExistingColumn(userCols, ["last_name"]);
  const imageCol = firstExistingColumn(userCols, ["profile_image_url", "profile_image", "avatar_url", "photo_url"]);
  const directRoleCol = firstExistingColumn(userCols, ["role"]);
  const roleIdCol = firstExistingColumn(userCols, ["role_id"]);
  const roleNameCol = firstExistingColumn(roleCols, ["name"]);
  const rolePkCol = firstExistingColumn(roleCols, ["id"]);

  if (!idCol || !emailCol || !passwordCol) {
    return null;
  }

  const nameSelect = fullNameCol
    ? `u.\`${fullNameCol}\` AS name`
    : firstNameCol && lastNameCol
      ? `TRIM(CONCAT(COALESCE(u.\`${firstNameCol}\`, ''), ' ', COALESCE(u.\`${lastNameCol}\`, ''))) AS name`
      : firstNameCol
        ? `u.\`${firstNameCol}\` AS name`
        : "NULL AS name";

  const roleSelect = directRoleCol
    ? `LOWER(u.\`${directRoleCol}\`) AS role`
    : roleIdCol && roleNameCol && rolePkCol
      ? `LOWER(r.\`${roleNameCol}\`) AS role`
      : "NULL AS role";

  const select = [
    `u.\`${idCol}\` AS id`,
    `u.\`${emailCol}\` AS email`,
    `u.\`${passwordCol}\` AS password`,
    hospitalCol ? `u.\`${hospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
    statusCol ? `u.\`${statusCol}\` AS status` : "NULL AS status",
    imageCol ? `u.\`${imageCol}\` AS profile_image` : "NULL AS profile_image",
    nameSelect,
    roleSelect,
  ];

  const joinClause =
    !directRoleCol && roleIdCol && roleNameCol && rolePkCol
      ? ` LEFT JOIN \`roles\` r ON u.\`${roleIdCol}\` = r.\`${rolePkCol}\``
      : "";

  const rows = await query(
    `SELECT ${select.join(", ")}
     FROM \`users\` u
     ${joinClause}
     WHERE LOWER(u.\`${emailCol}\`) = ?
     LIMIT 1`,
    [String(email || "").trim().toLowerCase()]
  );

  if (!rows.length) return null;
  return {
    ...rows[0],
    role: normalizeAppRole(rows[0]?.role),
  };
}

async function bootstrapSuperAdminIfNeeded(email, password) {
  const allowedEmail = normalizeEmail(process.env.SUPER_ADMIN_EMAIL);
  const allowedPassword = String(process.env.SUPER_ADMIN_PASSWORD || "");
  const safeEmail = normalizeEmail(email);
  const safePassword = String(password || "");

  if (!allowedEmail || !allowedPassword) return null;
  if (safeEmail !== allowedEmail || safePassword !== allowedPassword) return null;

  const existingRoleUser = await findRoleUserByEmail(safeEmail);
  if (existingRoleUser) return existingRoleUser;

  const existingSharedUser = await findSharedUserByEmail(safeEmail);
  if (existingSharedUser) return existingSharedUser;

  const superAdminCols = await getTableColumns("super_admins");
  if (superAdminCols) {
    const nameCol = firstExistingColumn(superAdminCols, ["full_name", "name"]);
    const emailCol = firstExistingColumn(superAdminCols, ["email"]);
    const passwordCol = firstExistingColumn(superAdminCols, ["password", "password_hash"]);

    if (nameCol && emailCol && passwordCol) {
      const values = {
        [nameCol]: "Super Admin",
        [emailCol]: allowedEmail,
        [passwordCol]: await bcrypt.hash(allowedPassword, 10),
      };

      const insertCols = Object.keys(values);
      await query(
        `INSERT INTO \`super_admins\` (${insertCols.map((c) => `\`${c}\``).join(", ")})
         VALUES (${insertCols.map(() => "?").join(", ")})`,
        insertCols.map((c) => values[c])
      );

      return findRoleUserByEmail(safeEmail);
    }
  }

  const userCols = await getTableColumns("users");
  if (!userCols) return null;

  const nameCol = firstExistingColumn(userCols, ["full_name", "name"]);
  const emailCol = firstExistingColumn(userCols, ["email", "username"]);
  const passwordCol = firstExistingColumn(userCols, ["password", "password_hash"]);
  const roleCol = firstExistingColumn(userCols, ["role"]);

  if (!nameCol || !emailCol || !passwordCol || !roleCol) return null;

  const values = {
    [nameCol]: "Super Admin",
    [emailCol]: allowedEmail,
    [passwordCol]: await bcrypt.hash(allowedPassword, 10),
    [roleCol]: "super_admin",
  };

  if (userCols.has("status")) values.status = "active";

  const insertCols = Object.keys(values);
  await query(
    `INSERT INTO \`users\` (${insertCols.map((c) => `\`${c}\``).join(", ")})
     VALUES (${insertCols.map(() => "?").join(", ")})`,
    insertCols.map((c) => values[c])
  );

  return findSharedUserByEmail(safeEmail);
}

async function login(email, password) {
  const safeEmail = String(email || "").trim().toLowerCase();
  const user =
    await findRoleUserByEmail(safeEmail) ||
    await findSharedUserByEmail(safeEmail) ||
    await bootstrapSuperAdminIfNeeded(safeEmail, password);
  if (!user) return null;

  if (user.status && String(user.status).toLowerCase() !== "active") return null;

  const matched = await bcrypt.compare(String(password || ""), user.password || "");
  if (!matched) return null;

  const token = jwt.sign(
    { id: user.id, role: user.role, hospital_id: user.hospital_id ?? null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  const normalizedImage =
    normalizeProfileImage(user.profile_image) ||
    (await resolveUserImageFromUsersTable(user.email));
  const profileImageUrl = buildUploadUrl(normalizedImage);

  return {
    token,
    user: {
      id: user.id,
      hospital_id: user.hospital_id ?? null,
      email: user.email,
      role: user.role,
      name: user.name || null,
      profile_image: normalizedImage || "",
      profile_image_url: profileImageUrl || "",
    },
  };
}

async function register(payload) {
  const role = payload.role || "patient";
  return userService.create(
    {
      ...payload,
      role,
    },
    payload.hospital_id || null
  );
}

async function getProfile(userId, role) {
  return userService.getById(userId, role);
}

async function changePassword(userId, role, currentPassword, newPassword) {
  const table = ROLE_LOGIN_ORDER.find((entry) => entry.role === String(role || "").toLowerCase())?.table;
  if (!table) throw new Error("Role not supported");

  const cols = await getTableColumns(table);
  if (!cols) throw new Error("Role table not found");

  const idCol = firstExistingColumn(cols, ["id", "user_id", `${role}_id`]);
  const passwordCol = firstExistingColumn(cols, ["password", "password_hash"]);
  if (!idCol || !passwordCol) throw new Error("Role table missing password column");

  const rows = await query(`SELECT \`${passwordCol}\` AS password FROM \`${table}\` WHERE \`${idCol}\` = ?`, [userId]);
  if (!rows.length) throw new Error("User not found");

  const matched = await bcrypt.compare(String(currentPassword || ""), rows[0].password || "");
  if (!matched) throw new Error("Current password is incorrect");

  const passwordHash = await bcrypt.hash(String(newPassword || ""), 10);
  await query(`UPDATE \`${table}\` SET \`${passwordCol}\` = ? WHERE \`${idCol}\` = ?`, [passwordHash, userId]);
}

module.exports = { login, register, getProfile, changePassword };
