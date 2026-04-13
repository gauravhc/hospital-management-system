const { query } = require("../../config/database");
const { getConnection } = require("../../config/database");
const { getHospitalColumn } = require("../../services/dbMeta");

async function items(hospitalId) {
  const hospitalCol = await getHospitalColumn("inventory_items");
  return hospitalId && hospitalCol
    ? query(`SELECT * FROM inventory_items WHERE \`${hospitalCol}\` = ? ORDER BY created_at DESC`, [hospitalId])
    : query(`SELECT * FROM inventory_items ORDER BY created_at DESC`);
}
function createItem(payload, hospitalId) {
  return query(
    `INSERT INTO inventory_items (hospital_id, name, sku, category, quantity, reorder_level, unit, unit_cost, supplier_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      hospitalId ?? payload.hospital_id ?? null,
      payload.name ?? null,
      payload.sku ?? null,
      payload.category ?? null,
      payload.quantity ?? 0,
      payload.reorder_level ?? 0,
      payload.unit ?? null,
      payload.unit_cost ?? 0,
      payload.supplier_name ?? null,
    ]
  );
}
function updateItem(id, payload) {
  return query(
    `UPDATE inventory_items
     SET name = COALESCE(?, name), sku = COALESCE(?, sku), category = COALESCE(?, category), quantity = COALESCE(?, quantity),
         reorder_level = COALESCE(?, reorder_level), unit = COALESCE(?, unit), unit_cost = COALESCE(?, unit_cost), supplier_name = COALESCE(?, supplier_name)
     WHERE id = ?`,
    [payload.name || null, payload.sku || null, payload.category || null, payload.quantity, payload.reorder_level, payload.unit || null, payload.unit_cost, payload.supplier_name || null, id]
  );
}
function removeItem(id) { return query(`DELETE FROM inventory_items WHERE id = ?`, [id]); }
async function lowStock(hospitalId) {
  const params = [];
  let sql = `SELECT * FROM inventory_items WHERE quantity <= reorder_level`;
  const hospitalCol = await getHospitalColumn("inventory_items");
  if (hospitalId && hospitalCol) {
    sql += ` AND \`${hospitalCol}\` = ?`;
    params.push(hospitalId);
  }
  return query(sql, params);
}
async function batches(hospitalId) {
  const hospitalCol = await getHospitalColumn("inventory_stock_batches");
  const params = [];
  let whereSql = "";

  if (hospitalId && hospitalCol) {
    whereSql = `WHERE b.\`${hospitalCol}\` = ?`;
    params.push(hospitalId);
  }

  return query(
    `SELECT
       b.*,
       i.name AS item_name,
       i.sku AS item_sku,
       i.category AS item_category,
       i.quantity AS current_quantity,
       i.unit AS item_unit
     FROM inventory_stock_batches b
     LEFT JOIN inventory_items i ON i.id = b.item_id
     ${whereSql}
     ORDER BY b.created_at DESC, b.id DESC`,
    params
  );
}

async function createBatch(payload, hospitalId) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const itemId = payload.item_id || payload.itemId;
    const quantityAdded = Math.max(1, Number(payload.quantity_added || payload.quantity || 0));

    const [[item]] = await connection.execute(
      `SELECT * FROM inventory_items WHERE id = ? LIMIT 1`,
      [itemId]
    );

    if (!item) {
      throw new Error("Inventory item not found");
    }

    const scopedHospitalId = hospitalId ?? item.hospital_id ?? null;
    if (!scopedHospitalId) {
      throw new Error("Hospital not found for stock batch");
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO inventory_stock_batches
       (hospital_id, item_id, batch_code, supplier_name, supplier_email, received_date, expiry_date, quantity_added, unit_cost, location, shelf, minimum_level, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scopedHospitalId,
        itemId,
        payload.batch_code || payload.batchCode || null,
        payload.supplier_name || payload.supplierName || payload.supplier || null,
        payload.supplier_email || payload.supplierEmail || null,
        payload.received_date || payload.receivedDate || null,
        payload.expiry_date || payload.expiryDate || null,
        quantityAdded,
        Number(payload.unit_cost || payload.unitCost || item.unit_cost || 0),
        payload.location || null,
        payload.shelf || null,
        Number(payload.minimum_level || payload.minimum || item.reorder_level || 0),
        payload.note || null,
      ]
    );

    await connection.execute(
      `UPDATE inventory_items
       SET quantity = quantity + ?, reorder_level = ?, unit_cost = ?, supplier_name = COALESCE(?, supplier_name)
       WHERE id = ?`,
      [
        quantityAdded,
        Number(payload.minimum_level || payload.minimum || item.reorder_level || 0),
        Number(payload.unit_cost || payload.unitCost || item.unit_cost || 0),
        payload.supplier_name || payload.supplierName || payload.supplier || null,
        itemId,
      ]
    );

    await connection.commit();
    return { id: insertResult.insertId || null };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { items, createItem, updateItem, removeItem, lowStock, batches, createBatch };
