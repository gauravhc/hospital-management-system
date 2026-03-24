const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const { getTableColumns, firstExistingColumn } = require("../services/dbMeta");

const ROLE_TABLE_MAP = {
  super_admin: "super_admins",
  hospital_admin: "hospital_admins",
  doctor: "doctors",
  nurse: "nurses",
  patient: "patients",
};

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
    const role = String(decoded.role || "").toLowerCase();
    const table = ROLE_TABLE_MAP[role];
    if (!table) {
      return res.status(401).json({ success: false, message: "Invalid user session" });
    }

    const cols = await getTableColumns(table);
    if (!cols) {
      return res.status(500).json({ success: false, message: "Role table not found" });
    }

    const idCol = firstExistingColumn(cols, ["id", "user_id", `${role}_id`]);
    const emailCol = firstExistingColumn(cols, ["email"]);
    const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
    const statusCol = firstExistingColumn(cols, ["status", "is_active"]);

    if (!idCol) {
      return res.status(500).json({ success: false, message: "Role table missing id column" });
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
      return res.status(401).json({ success: false, message: "Invalid user session" });
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

    req.user = {
      id: rows[0].id,
      email: rows[0].email,
      role,
      hospital_id: rows[0].hospital_id ?? null,
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
