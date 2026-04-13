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

async function items(req, res) { return ok(res, await service.items(getScopedHospitalId(req))); }
async function createItem(req, res) {
  const scopedHospitalId = getScopedHospitalId(req, await resolveActorHospitalId(req.user));
  await service.createItem(req.body, scopedHospitalId);
  return ok(res, null, "Inventory item created", 201);
}
async function updateItem(req, res) { await service.updateItem(req.params.id, req.body); return ok(res, null, "Inventory item updated"); }
async function removeItem(req, res) { await service.removeItem(req.params.id); return ok(res, null, "Inventory item deleted"); }
async function lowStock(req, res) { return ok(res, await service.lowStock(getScopedHospitalId(req))); }
async function batches(req, res) { return ok(res, await service.batches(getScopedHospitalId(req, await resolveActorHospitalId(req.user)))); }
async function createBatch(req, res) {
  const scopedHospitalId = getScopedHospitalId(req, await resolveActorHospitalId(req.user));
  await service.createBatch(req.body, scopedHospitalId);
  return ok(res, null, "Stock batch recorded", 201);
}

module.exports = { items, createItem, updateItem, removeItem, lowStock, batches, createBatch };
