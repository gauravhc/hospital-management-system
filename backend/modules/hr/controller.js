const service = require("./service");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

async function staff(req, res) { return ok(res, await service.staff(getScopedHospitalId(req))); }
async function createStaff(req, res) { await service.createStaff(req.body, getScopedHospitalId(req)); return ok(res, null, "Staff created", 201); }
async function updateStaff(req, res) { await service.updateStaff(req.params.id, req.body); return ok(res, null, "Staff updated"); }
async function removeStaff(req, res) { await service.removeStaff(req.params.id); return ok(res, null, "Staff removed"); }
async function attendance(req, res) { return ok(res, await service.attendance(getScopedHospitalId(req))); }
async function createAttendance(req, res) { await service.createAttendance(req.body, getScopedHospitalId(req), req.user.id); return ok(res, null, "Attendance recorded", 201); }

module.exports = { staff, createStaff, updateStaff, removeStaff, attendance, createAttendance };
