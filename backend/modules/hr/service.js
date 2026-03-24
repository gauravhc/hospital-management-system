const { query } = require("../../config/database");
const { createLegacyUserWithRole } = require("../../services/legacyUserSync.service");

function staff(hospitalId) {
  return query(`SELECT * FROM staff WHERE hospital_id = ? ORDER BY id DESC`, [hospitalId]);
}

async function createStaff(payload, hospitalId) {
  return createLegacyUserWithRole(
    {
      hospital_id: hospitalId || payload.hospital_id,
      full_name: payload.name || [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim(),
      email: payload.email,
      password: payload.password || "123456",
      phone: payload.phone || null,
      department: payload.department || null,
      status: payload.status || "active",
      staff_role: payload.role || "staff",
    },
    {
      userRole: payload.user_role || payload.role,
      roleTable: "staff",
    }
  );
}

function updateStaff(id, payload) {
  return query(
    `UPDATE staff
     SET name = COALESCE(?, name),
         role = COALESCE(?, role),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email)
     WHERE id = ?`,
    [payload.name || null, payload.role || null, payload.phone || null, payload.email || null, id]
  );
}

function removeStaff(id) { return query(`DELETE FROM staff WHERE id = ?`, [id]); }
function attendance(hospitalId) { return query(`SELECT * FROM attendance WHERE hospital_id = ? ORDER BY date DESC`, [hospitalId]); }
function createAttendance(payload, hospitalId, markedBy) {
  return query(
    `INSERT INTO attendance (hospital_id, staff_id, date, status)
     VALUES (?, ?, ?, ?)`,
    [hospitalId || payload.hospital_id, payload.user_id || payload.staff_id, payload.date, payload.status || "present"]
  );
}

module.exports = { staff, createStaff, updateStaff, removeStaff, attendance, createAttendance };
