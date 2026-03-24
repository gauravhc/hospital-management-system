const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const { roleMiddleware, hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler, ok } = require("../../services/module.helper");
const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

const router = express.Router();
router.use(authMiddleware, hospitalScope, roleMiddleware("hospital_admin", "doctor", "super_admin"));

async function listNurses(req, res) {
  const cols = await getTableColumns("nurses");
  if (!cols) return ok(res, [], "Success");

  const idCol = firstExistingColumn(cols, ["id", "nurse_id", "user_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  const firstNameCol = firstExistingColumn(cols, ["first_name"]);
  const lastNameCol = firstExistingColumn(cols, ["last_name"]);
  const emailCol = firstExistingColumn(cols, ["email"]);
  const phoneCol = firstExistingColumn(cols, ["phone", "mobile"]);

  const nameExpr = nameCol
    ? `n.\`${nameCol}\``
    : firstNameCol || lastNameCol
    ? `CONCAT_WS(' ', ${firstNameCol ? `n.\`${firstNameCol}\`` : "NULL"}, ${lastNameCol ? `n.\`${lastNameCol}\`` : "NULL"})`
    : "NULL";

  const select = [
    idCol ? `n.\`${idCol}\` AS id` : "n.id AS id",
    `${nameExpr} AS full_name`,
    emailCol ? `n.\`${emailCol}\` AS email` : "NULL AS email",
    phoneCol ? `n.\`${phoneCol}\` AS phone` : "NULL AS phone",
  ];

  const where = [];
  const params = [];
  if (hospitalCol && req.user?.hospital_id && String(req.user.role || "").toLowerCase() !== "super_admin") {
    where.push(`n.\`${hospitalCol}\` = ?`);
    params.push(req.user.hospital_id);
  }

  const rows = await query(
    `SELECT ${select.join(", ")} FROM nurses n ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY n.id DESC`,
    params
  );
  return ok(res, rows, "Success");
}

async function listPatients(req, res) {
  const cols = await getTableColumns("patients");
  if (!cols) return ok(res, [], "Success");

  const idCol = firstExistingColumn(cols, ["id", "patient_id", "user_id"]);
  const hospitalCol = firstExistingColumn(cols, ["hospital_id"]);
  const nameCol = firstExistingColumn(cols, ["full_name", "name"]);
  const firstNameCol = firstExistingColumn(cols, ["first_name"]);
  const lastNameCol = firstExistingColumn(cols, ["last_name"]);
  const emailCol = firstExistingColumn(cols, ["email"]);
  const phoneCol = firstExistingColumn(cols, ["phone", "mobile"]);

  const nameExpr = nameCol
    ? `p.\`${nameCol}\``
    : firstNameCol || lastNameCol
    ? `CONCAT_WS(' ', ${firstNameCol ? `p.\`${firstNameCol}\`` : "NULL"}, ${lastNameCol ? `p.\`${lastNameCol}\`` : "NULL"})`
    : "NULL";

  const select = [
    idCol ? `p.\`${idCol}\` AS id` : "p.id AS id",
    `${nameExpr} AS full_name`,
    emailCol ? `p.\`${emailCol}\` AS email` : "NULL AS email",
    phoneCol ? `p.\`${phoneCol}\` AS phone` : "NULL AS phone",
  ];

  const where = [];
  const params = [];
  if (hospitalCol && req.user?.hospital_id && String(req.user.role || "").toLowerCase() !== "super_admin") {
    // Legacy data sometimes has patients with NULL hospital_id; include them for assignment.
    where.push(`(p.\`${hospitalCol}\` = ? OR p.\`${hospitalCol}\` IS NULL)`);
    params.push(req.user.hospital_id);
  }

  const rows = await query(
    `SELECT ${select.join(", ")} FROM patients p ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY p.id DESC`,
    params
  );
  return ok(res, rows, "Success");
}

router.get("/nurses", asyncHandler(listNurses));
router.get("/patients", asyncHandler(listPatients));

module.exports = router;
