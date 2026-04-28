const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const { getTableColumns, firstExistingColumn } = require("../services/dbMeta");

const ROLE_TABLE_MAP = {
  super_admin: ["super_admins"],
  hospital_admin: ["hospital_admins"],
  doctor: ["doctors"],
  nurse: ["nurses"],
  patient: ["patients"],
  register: ["staff", "receptionists"],
  admin: ["staff"],
  pharmacist: ["staff"],
  insurance: ["staff"],
  lab: ["staff"],
  labtechnician: ["staff"],
  inventory: ["staff"],
  inventorymanager: ["staff"],
  accountant: ["staff"],
  hr: ["staff"],
  hrmanager: ["staff"],
};

function normalizeSessionRole(value) {
  const role = String(value || "").toLowerCase().trim();
  if (role === "reception" || role === "receptionist") return "register";
  if (role === "labtechnician" || role === "lab_technician" || role === "lab technician") return "lab";
  if (role === "inventorymanager" || role === "inventory_manager") return "inventory";
  if (role === "hrmanager" || role === "hr_manager" || role === "hr manager") return "hr";
  if (role === "insurance_manager" || role === "insurance manager" || role === "insurancemanager") return "insurance";
  if (role === "superadmin" || role === "super-admin") return "super_admin";
  if (role === "administrator") return "hospital_admin";
  return role;
}

async function findSharedUserSession(decodedRole, decodedId) {
  const usersCols = await getTableColumns("users");
  if (!usersCols) return null;

  const idCol = firstExistingColumn(usersCols, ["id", "user_id"]);
  const emailCol = firstExistingColumn(usersCols, ["email", "username"]);
  const hospitalCol = firstExistingColumn(usersCols, ["hospital_id"]);
  const statusCol = firstExistingColumn(usersCols, ["status"]);
  const roleCol = firstExistingColumn(usersCols, ["role"]);

  if (!idCol || !roleCol) return null;

  const select = [
    `\`${idCol}\` AS id`,
    emailCol ? `\`${emailCol}\` AS email` : "NULL AS email",
    hospitalCol ? `\`${hospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
    statusCol ? `\`${statusCol}\` AS status` : "NULL AS status",
    `LOWER(\`${roleCol}\`) AS role`,
  ];

  const rows = await query(
    `SELECT ${select.join(", ")} FROM \`users\` WHERE \`${idCol}\` = ? LIMIT 1`,
    [decodedId]
  );
  if (!rows.length) return null;

  const row = rows[0];
  if (normalizeSessionRole(row.role) !== normalizeSessionRole(decodedRole)) {
    return null;
  }

  if (statusCol && row.status && String(row.status).toLowerCase() !== "active") {
    return null;
  }

  return row;
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = normalizeSessionRole(decoded.role);
    const tables = ROLE_TABLE_MAP[role];
    if (!tables || !tables.length) {
      return res.status(401).json({ success: false, message: "Invalid user session" });
    }

    let sessionUser = null;

    for (const table of tables) {
      const cols = await getTableColumns(table);
      if (!cols) {
        continue;
      }

      const idCol = firstExistingColumn(cols, ["id", "user_id", `${role}_id`]);
      const emailCol = firstExistingColumn(cols, ["email"]);
      const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
      const statusCol = firstExistingColumn(cols, ["status", "is_active"]);

      if (!idCol) {
        continue;
      }

      const select = [
        `\`${idCol}\` AS id`,
        emailCol ? `\`${emailCol}\` AS email` : "NULL AS email",
        hospitalCol ? `\`${hospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
        statusCol ? `\`${statusCol}\` AS status` : "NULL AS status",
      ];

      const rows = await query(
        `SELECT ${select.join(", ")} FROM \`${table}\` WHERE \`${idCol}\` = ? LIMIT 1`,
        [decoded.id]
      );

      if (!rows.length) {
        continue;
      }

      if (statusCol) {
        if (statusCol === "is_active") {
          if (!rows[0].status || Number(rows[0].status) !== 1) {
            return res.status(401).json({ success: false, message: "Invalid user session" });
          }
        } else if (rows[0].status && String(rows[0].status).toLowerCase() !== "active") {
          return res.status(401).json({ success: false, message: "Invalid user session" });
        }
      }

      sessionUser = rows[0];
      break;
    }

    if (!sessionUser) {
      sessionUser = await findSharedUserSession(role, decoded.id);
    }

    if (!sessionUser) {
      return res.status(401).json({ success: false, message: "Invalid user session" });
    }

    req.user = {
      id: sessionUser.id,
      email: sessionUser.email,
      role,
      hospital_id:
        sessionUser.hospital_id ??
        decoded.hospital_id ??
        decoded.hospitalId ??
        null,
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
