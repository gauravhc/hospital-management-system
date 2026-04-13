const { query } = require("../../config/database");
const bcrypt = require("bcryptjs");
const { getTableColumns, getHospitalColumn, firstExistingColumn } = require("../../services/dbMeta");

async function staff(hospitalId, filters = {}) {
  const cols = await getTableColumns("staff");
  if (!cols) {
    throw new Error("Staff table not found");
  }

  const where = [];
  const params = [];
  const hospitalCol = await getHospitalColumn("staff");
  const departmentCol = firstExistingColumn(cols, ["department"]);
  const roleCol = firstExistingColumn(cols, ["role"]);
  const nameCol = firstExistingColumn(cols, ["name", "full_name"]);
  const phoneCol = firstExistingColumn(cols, ["phone", "mobile"]);
  const orderCol = firstExistingColumn(cols, ["created_at", "updated_at", "id"]) || "id";

  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  if (filters.department && departmentCol) {
    where.push(`LOWER(\`${departmentCol}\`) = ?`);
    params.push(String(filters.department).trim().toLowerCase());
  }

  if (filters.role && roleCol) {
    where.push(`LOWER(\`${roleCol}\`) = ?`);
    params.push(String(filters.role).trim().toLowerCase());
  }

  if (filters.q) {
    const search = `%${String(filters.q).trim().toLowerCase()}%`;
    const searchParts = [];
    if (nameCol) searchParts.push(`LOWER(\`${nameCol}\`) LIKE ?`);
    if (cols.has("email")) searchParts.push("LOWER(`email`) LIKE ?");
    if (phoneCol) searchParts.push(`LOWER(\`${phoneCol}\`) LIKE ?`);
    if (searchParts.length) {
      where.push(`(${searchParts.join(" OR ")})`);
      params.push(...searchParts.map(() => search));
    }
  }

  return query(
    `SELECT * FROM staff ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY \`${orderCol}\` DESC`,
    params
  );
}

async function createStaff(payload, hospitalId) {
  const scopedHospitalId = hospitalId ?? payload.hospital_id ?? null;
  if (scopedHospitalId === null) {
    throw new Error("Hospital mapping is missing for this HR session");
  }

  const fullName =
    payload.name ||
    [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim() ||
    null;

  if (!fullName) {
    throw new Error("Employee name is required");
  }

  if (!payload.email) {
    throw new Error("Employee email is required");
  }

  const staffCols = await getTableColumns("staff");
  if (!staffCols) {
    throw new Error("Staff table not found");
  }

  const values = {};
  const email = String(payload.email).trim().toLowerCase();
  const phone = payload.phone ?? payload.mobile ?? null;
  const passwordHash = await bcrypt.hash(String(payload.password || "123456"), 10);
  const roleValue = payload.role || payload.user_role || "staff";

  if (staffCols.has("hospital_id")) values.hospital_id = scopedHospitalId;

  const nameCol = firstExistingColumn(staffCols, ["name", "full_name"]);
  if (nameCol) values[nameCol] = fullName;

  if (staffCols.has("email")) values.email = email;
  if (staffCols.has("phone")) values.phone = phone;
  if (!staffCols.has("phone") && staffCols.has("mobile")) values.mobile = phone;
  if (staffCols.has("role")) values.role = roleValue;
  if (staffCols.has("department")) values.department = payload.department ?? null;
  if (staffCols.has("status")) values.status = payload.status || "active";

  const passwordCol = firstExistingColumn(staffCols, ["password", "password_hash"]);
  if (passwordCol) {
    values[passwordCol] = passwordHash;
  }

  const columns = Object.keys(values);
  if (!columns.length) {
    throw new Error("No writable columns found in staff table");
  }

  return query(
    `INSERT INTO staff (${columns.map((column) => `\`${column}\``).join(", ")})
     VALUES (${columns.map(() => "?").join(", ")})`,
    columns.map((column) => values[column])
  );
}

async function updateStaff(id, payload) {
  const cols = await getTableColumns("staff");
  if (!cols) {
    throw new Error("Staff table not found");
  }

  const updates = [];
  const params = [];
  const nameCol = firstExistingColumn(cols, ["name", "full_name"]);
  const phoneCol = firstExistingColumn(cols, ["phone", "mobile"]);

  if (payload.name !== undefined && nameCol) {
    updates.push(`\`${nameCol}\` = ?`);
    params.push(payload.name || null);
  }
  if (payload.role !== undefined && cols.has("role")) {
    updates.push("`role` = ?");
    params.push(payload.role || null);
  }
  if (payload.phone !== undefined && phoneCol) {
    updates.push(`\`${phoneCol}\` = ?`);
    params.push(payload.phone || null);
  }
  if (payload.email !== undefined && cols.has("email")) {
    updates.push("`email` = ?");
    params.push(payload.email ? String(payload.email).trim().toLowerCase() : null);
  }
  if (payload.department !== undefined && cols.has("department")) {
    updates.push("`department` = ?");
    params.push(payload.department || null);
  }
  if (payload.status !== undefined && cols.has("status")) {
    updates.push("`status` = ?");
    params.push(payload.status || "active");
  }

  if (!updates.length) {
    throw new Error("No changes to update");
  }

  params.push(id);
  return query(`UPDATE staff SET ${updates.join(", ")} WHERE id = ?`, params);
}

function removeStaff(id) { return query(`DELETE FROM staff WHERE id = ?`, [id]); }
async function attendance(hospitalId, filters = {}) {
  const cols = await getTableColumns("attendance");
  if (!cols) {
    throw new Error("Attendance table not found");
  }

  const hospitalCol = await getHospitalColumn("attendance");
  const staffIdCol = firstExistingColumn(cols, ["staff_id", "user_id"]);
  const orderCol = firstExistingColumn(cols, ["date", "created_at", "id"]) || "id";
  const staffCols = await getTableColumns("staff");
  const staffNameCol = firstExistingColumn(staffCols, ["name", "full_name"]);
  const staffRoleCol = firstExistingColumn(staffCols, ["role"]);
  const staffDepartmentCol = firstExistingColumn(staffCols, ["department"]);
  const staffPhoneCol = firstExistingColumn(staffCols, ["phone", "mobile"]);
  const where = [];
  const params = [];
  const select = [
    "a.*",
    staffNameCol ? `s.\`${staffNameCol}\` AS employee_name` : "NULL AS employee_name",
    staffRoleCol ? `s.\`${staffRoleCol}\` AS employee_role` : "NULL AS employee_role",
    staffDepartmentCol ? `s.\`${staffDepartmentCol}\` AS employee_department` : "NULL AS employee_department",
    staffPhoneCol ? `s.\`${staffPhoneCol}\` AS employee_phone` : "NULL AS employee_phone",
    "s.email AS employee_email",
  ];

  if (!staffIdCol) {
    throw new Error("Attendance table is missing employee reference column");
  }

  if (hospitalId && hospitalCol) {
    where.push(`a.\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  } else if (hospitalId) {
    where.push("s.hospital_id = ?");
    params.push(hospitalId);
  }

  if (filters.staff_id) {
    where.push(`a.\`${staffIdCol}\` = ?`);
    params.push(filters.staff_id);
  }

  if (filters.status && cols.has("status")) {
    where.push("LOWER(a.`status`) = ?");
    params.push(String(filters.status).trim().toLowerCase());
  }

  if (filters.date_from) {
    where.push("a.`date` >= ?");
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    where.push("a.`date` <= ?");
    params.push(filters.date_to);
  }

  if (filters.department && staffDepartmentCol) {
    where.push(`LOWER(s.\`${staffDepartmentCol}\`) = ?`);
    params.push(String(filters.department).trim().toLowerCase());
  }

  if (filters.q) {
    const search = `%${String(filters.q).trim().toLowerCase()}%`;
    const searchParts = [];
    if (staffNameCol) searchParts.push(`LOWER(s.\`${staffNameCol}\`) LIKE ?`);
    searchParts.push("LOWER(s.`email`) LIKE ?");
    if (staffPhoneCol) searchParts.push(`LOWER(s.\`${staffPhoneCol}\`) LIKE ?`);
    if (searchParts.length) {
      where.push(`(${searchParts.join(" OR ")})`);
      params.push(...searchParts.map(() => search));
    }
  }

  return query(
    `SELECT ${select.join(", ")}
     FROM attendance a
     JOIN staff s ON a.\`${staffIdCol}\` = s.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY a.\`${orderCol}\` DESC`,
    params
  );
}
async function createAttendance(payload, hospitalId, markedBy) {
  const cols = await getTableColumns("attendance");
  const employeeId = payload.staff_id ?? payload.user_id ?? null;
  const scopedHospitalId = hospitalId ?? payload.hospital_id ?? null;
  const attendanceDate = payload.date ?? null;
  const staffIdCol = firstExistingColumn(cols, ["staff_id", "user_id"]);
  const statusValue = String(payload.status || "present").toLowerCase();

  if (!employeeId) {
    throw new Error("staff_id is required");
  }
  if (scopedHospitalId === null && cols?.has("hospital_id")) {
    throw new Error("Hospital mapping is missing for this HR session");
  }
  if (!attendanceDate) {
    throw new Error("Attendance date is required");
  }
  if (!staffIdCol) {
    throw new Error("Attendance table is missing employee reference column");
  }

  const normalizedStatus = statusValue === "present" ? "present" : "absent";

  if (cols?.has("hospital_id") && cols?.has("marked_by")) {
    return query(
      `INSERT INTO attendance (hospital_id, \`${staffIdCol}\`, date, status, marked_by, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        scopedHospitalId,
        employeeId,
        attendanceDate,
        payload.status || "present",
        markedBy ?? null,
        payload.notes ?? null,
      ]
    );
  }

  if (cols?.has("hospital_id")) {
    return query(
      `INSERT INTO attendance (hospital_id, \`${staffIdCol}\`, date, status)
       VALUES (?, ?, ?, ?)`,
      [scopedHospitalId, employeeId, attendanceDate, normalizedStatus]
    );
  }

  return query(
    `INSERT INTO attendance (\`${staffIdCol}\`, date, status)
     VALUES (?, ?, ?)`,
    [employeeId, attendanceDate, normalizedStatus]
  );
}

async function payroll(hospitalId, filters = {}) {
  const hospitalCol = await getHospitalColumn("payroll_records");
  const where = [];
  const params = [];

  if (hospitalId && hospitalCol) {
    where.push(`pr.\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  if (filters.status) {
    where.push("LOWER(pr.`status`) = ?");
    params.push(String(filters.status).trim().toLowerCase());
  }

  if (filters.pay_period) {
    where.push("LOWER(pr.`pay_period`) LIKE ?");
    params.push(`%${String(filters.pay_period).trim().toLowerCase()}%`);
  }

  if (filters.department) {
    where.push("LOWER(COALESCE(s.`department`, '')) = ?");
    params.push(String(filters.department).trim().toLowerCase());
  }

  if (filters.q) {
    const search = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push("(LOWER(COALESCE(s.`name`, '')) LIKE ? OR LOWER(COALESCE(s.`email`, '')) LIKE ? OR LOWER(COALESCE(pr.`employee_id`, '')) LIKE ?)");
    params.push(search, search, search);
  }

  return query(
    `SELECT pr.*, s.name AS employee_name, s.email AS employee_email, s.role AS employee_role, s.department AS employee_department
     FROM payroll_records pr
     LEFT JOIN staff s ON CAST(s.id AS CHAR) = CAST(pr.employee_id AS CHAR)
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY pr.created_at DESC`,
    params
  );
}

function createPayroll(payload, hospitalId) {
  const scopedHospitalId = hospitalId ?? payload.hospital_id ?? null;
  const employeeId = payload.employee_id ?? payload.user_id ?? null;
  const payPeriod = payload.pay_period ?? null;
  const basicSalary = Number(payload.basic_salary || 0);
  const allowances = Number(payload.allowances || 0);
  const deductions = Number(payload.deductions || 0);
  const netSalary = basicSalary + allowances - deductions;

  if (scopedHospitalId === null) {
    throw new Error("Hospital mapping is missing for this HR session");
  }
  if (!employeeId) {
    throw new Error("employee_id is required");
  }
  if (!payPeriod) {
    throw new Error("pay_period is required");
  }

  return query(
    `INSERT INTO payroll_records (hospital_id, employee_id, pay_period, basic_salary, allowances, deductions, net_salary, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      scopedHospitalId,
      employeeId,
      payPeriod,
      basicSalary,
      allowances,
      deductions,
      netSalary,
      payload.status || "processed",
    ]
  );
}

function updatePayrollStatus(id, status) {
  return query(
    `UPDATE payroll_records
     SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END
     WHERE id = ?`,
    [status, status, id]
  );
}

async function leaves(hospitalId, filters = {}) {
  const cols = await getTableColumns("leave_requests");
  if (!cols) {
    return [];
  }

  const where = [];
  const params = [];

  if (hospitalId && cols.has("hospital_id")) {
    where.push("lr.`hospital_id` = ?");
    params.push(hospitalId);
  }

  if (filters.staff_id) {
    where.push("lr.`staff_id` = ?");
    params.push(filters.staff_id);
  }

  if (filters.status && cols.has("status")) {
    where.push("LOWER(lr.`status`) = ?");
    params.push(String(filters.status).trim().toLowerCase());
  }

  if (filters.department) {
    where.push("LOWER(COALESCE(s.`department`, '')) = ?");
    params.push(String(filters.department).trim().toLowerCase());
  }

  if (filters.date_from) {
    where.push("lr.`start_date` >= ?");
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    where.push("lr.`end_date` <= ?");
    params.push(filters.date_to);
  }

  if (filters.q) {
    const search = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push("(LOWER(COALESCE(s.`name`, '')) LIKE ? OR LOWER(COALESCE(s.`email`, '')) LIKE ? OR LOWER(COALESCE(lr.`leave_type`, '')) LIKE ?)");
    params.push(search, search, search);
  }

  return query(
    `SELECT lr.*, s.name AS employee_name, s.email AS employee_email, s.role AS employee_role, s.department AS employee_department
     FROM leave_requests lr
     LEFT JOIN staff s ON lr.staff_id = s.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY lr.created_at DESC, lr.id DESC`,
    params
  );
}

function createLeave(payload, hospitalId) {
  const staffId = payload.staff_id ?? null;
  const startDate = payload.start_date ?? null;
  const endDate = payload.end_date ?? null;
  const leaveType = payload.leave_type ?? null;
  const scopedHospitalId = hospitalId ?? payload.hospital_id ?? null;

  if (!staffId) throw new Error("staff_id is required");
  if (!startDate || !endDate) throw new Error("Leave date range is required");
  if (!leaveType) throw new Error("leave_type is required");
  if (scopedHospitalId === null) throw new Error("Hospital mapping is missing for this HR session");

  const totalDays = Math.max(
    1,
    Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
  );

  return query(
    `INSERT INTO leave_requests (hospital_id, staff_id, leave_type, start_date, end_date, total_days, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      scopedHospitalId,
      staffId,
      leaveType,
      startDate,
      endDate,
      totalDays,
      payload.reason ?? null,
      payload.status || "pending",
    ]
  );
}

function updateLeaveStatus(id, status, reviewedBy) {
  return query(
    `UPDATE leave_requests
     SET status = ?, reviewed_by = COALESCE(?, reviewed_by)
     WHERE id = ?`,
    [status, reviewedBy ?? null, id]
  );
}

module.exports = { staff, createStaff, updateStaff, removeStaff, attendance, createAttendance, payroll, createPayroll, updatePayrollStatus, leaves, createLeave, updateLeaveStatus };
