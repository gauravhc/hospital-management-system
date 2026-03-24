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
];

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
      const staffRole = String(rows[0]?.staff_role || "").trim().toLowerCase();
      return { ...rows[0], role: staffRole || "staff" };
    }

    return { ...rows[0], role: entry.role };
  }

  return null;
}

async function login(email, password) {
  const user = await findRoleUserByEmail(String(email || "").trim().toLowerCase());
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
