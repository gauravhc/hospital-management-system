const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");
const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

async function resolveActorHospitalId(user) {
  if (!user) return null;
  if (user.hospital_id !== null && user.hospital_id !== undefined) return user.hospital_id;

  const lookupTables = ["staff", "users", "hospital_admins", "doctors", "nurses"];

  for (const table of lookupTables) {
    const cols = await getTableColumns(table);
    if (!cols) continue;

    const idCol = firstExistingColumn(cols, ["id", "user_id"]);
    const emailCol = firstExistingColumn(cols, ["email"]);
    const hospitalCol = firstExistingColumn(cols, ["hospital_id", "hospitalId"]);

    if (!hospitalCol) continue;

    if (idCol && user.id !== null && user.id !== undefined) {
      const rows = await query(
        `SELECT \`${hospitalCol}\` AS hospital_id FROM \`${table}\` WHERE \`${idCol}\` = ? LIMIT 1`,
        [user.id]
      );
      if (rows[0]?.hospital_id) return rows[0].hospital_id;
    }

    if (emailCol && user.email) {
      const rows = await query(
        `SELECT \`${hospitalCol}\` AS hospital_id FROM \`${table}\` WHERE \`${emailCol}\` = ? LIMIT 1`,
        [user.email]
      );
      if (rows[0]?.hospital_id) return rows[0].hospital_id;
    }
  }

  const hospitals = await query(`SELECT id FROM hospitals ORDER BY id ASC LIMIT 1`);
  return hospitals[0]?.id || null;
}

async function getResolvedHospitalId(req) {
  return getScopedHospitalId(req, await resolveActorHospitalId(req.user));
}

async function staff(req, res) { return ok(res, await service.staff(await getResolvedHospitalId(req), req.query)); }
async function createStaff(req, res) { await service.createStaff(req.body, await getResolvedHospitalId(req)); return ok(res, null, "Staff created", 201); }
async function updateStaff(req, res) { await service.updateStaff(req.params.id, req.body); return ok(res, null, "Staff updated"); }
async function removeStaff(req, res) { await service.removeStaff(req.params.id); return ok(res, null, "Staff removed"); }
async function attendance(req, res) { return ok(res, await service.attendance(await getResolvedHospitalId(req), req.query)); }
async function createAttendance(req, res) { await service.createAttendance(req.body, await getResolvedHospitalId(req), req.user.id); return ok(res, null, "Attendance recorded", 201); }
async function payroll(req, res) { return ok(res, await service.payroll(await getResolvedHospitalId(req), req.query)); }
async function createPayroll(req, res) { await service.createPayroll(req.body, await getResolvedHospitalId(req)); return ok(res, null, "Payroll created", 201); }
async function updatePayrollStatus(req, res) { await service.updatePayrollStatus(req.params.id, req.body.status); return ok(res, null, "Payroll status updated"); }
async function leaves(req, res) { return ok(res, await service.leaves(await getResolvedHospitalId(req), req.query)); }
async function createLeave(req, res) { await service.createLeave(req.body, await getResolvedHospitalId(req)); return ok(res, null, "Leave request created", 201); }
async function updateLeaveStatus(req, res) { await service.updateLeaveStatus(req.params.id, req.body.status, req.user.id); return ok(res, null, "Leave status updated"); }

module.exports = { staff, createStaff, updateStaff, removeStaff, attendance, createAttendance, payroll, createPayroll, updatePayrollStatus, leaves, createLeave, updateLeaveStatus };
