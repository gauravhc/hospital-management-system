const { getConnection, query } = require("../../config/database");
const { getHospitalColumn, getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isExpired(expiryDate) {
  if (!expiryDate) return false;
  const value = new Date(expiryDate);
  if (Number.isNaN(value.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return value < today;
}

async function getNameExpr(table, alias, candidates = []) {
  const cols = await getTableColumns(table);
  if (!cols) return "NULL";

  const directNameCol = firstExistingColumn(cols, candidates);
  const firstNameCol = firstExistingColumn(cols, ["first_name"]);
  const lastNameCol = firstExistingColumn(cols, ["last_name"]);

  if (directNameCol) return `${alias}.\`${directNameCol}\``;
  if (firstNameCol || lastNameCol) {
    return `CONCAT_WS(' ', ${firstNameCol ? `${alias}.\`${firstNameCol}\`` : "NULL"}, ${lastNameCol ? `${alias}.\`${lastNameCol}\`` : "NULL"})`;
  }

  return "NULL";
}

async function resolveWritableHospitalId(actor = {}, explicitHospitalId = null) {
  if (explicitHospitalId !== null && explicitHospitalId !== undefined) {
    return explicitHospitalId;
  }

  if (actor?.hospital_id !== null && actor?.hospital_id !== undefined) {
    return actor.hospital_id;
  }

  const actorId = actor?.id ?? null;
  const actorEmail = actor?.email ?? null;

  if (actorId !== null && actorId !== undefined) {
    const userRows = await query(`SELECT hospital_id FROM users WHERE id = ? AND hospital_id IS NOT NULL LIMIT 1`, [actorId]);
    if (userRows[0]?.hospital_id !== undefined && userRows[0]?.hospital_id !== null) {
      return userRows[0].hospital_id;
    }

    const staffRows = await query(`SELECT hospital_id FROM staff WHERE id = ? AND hospital_id IS NOT NULL LIMIT 1`, [actorId]);
    if (staffRows[0]?.hospital_id !== undefined && staffRows[0]?.hospital_id !== null) {
      return staffRows[0].hospital_id;
    }
  }

  if (actorEmail) {
    const userRows = await query(`SELECT hospital_id FROM users WHERE email = ? AND hospital_id IS NOT NULL ORDER BY id DESC LIMIT 1`, [actorEmail]);
    if (userRows[0]?.hospital_id !== undefined && userRows[0]?.hospital_id !== null) {
      return userRows[0].hospital_id;
    }

    const staffRows = await query(`SELECT hospital_id FROM staff WHERE email = ? AND hospital_id IS NOT NULL ORDER BY id DESC LIMIT 1`, [actorEmail]);
    if (staffRows[0]?.hospital_id !== undefined && staffRows[0]?.hospital_id !== null) {
      return staffRows[0].hospital_id;
    }
  }

  const hospitalRows = await query(`SELECT id FROM hospitals ORDER BY id ASC LIMIT 1`);
  if (hospitalRows[0]?.id !== undefined && hospitalRows[0]?.id !== null) {
    return hospitalRows[0].id;
  }

  return null;
}

function validateMedicinePayload(payload = {}, { partial = false } = {}) {
  const name = String(payload.name || "").trim();
  const batchNumber = String(payload.batchNumber || payload.sku || "").trim();
  const quantity = payload.quantity ?? payload.stock_quantity;
  const price = payload.price ?? payload.unit_price;
  const reorderLevel = payload.reorderLevel ?? payload.reorder_level;
  const expiryDate = payload.expiryDate ?? payload.expiry_date;

  if (!partial || payload.name !== undefined) {
    if (!name) throw new Error("Medicine name is required");
  }

  if (!partial || payload.batchNumber !== undefined || payload.sku !== undefined) {
    if (!batchNumber) throw new Error("Batch number is required");
  }

  if (quantity !== undefined && quantity !== null && safeNumber(quantity, NaN) < 0) {
    throw new Error("Quantity cannot be negative");
  }

  if (price !== undefined && price !== null && safeNumber(price, NaN) < 0) {
    throw new Error("Price cannot be negative");
  }

  if (reorderLevel !== undefined && reorderLevel !== null && safeNumber(reorderLevel, NaN) < 0) {
    throw new Error("Reorder level cannot be negative");
  }

  if (expiryDate !== undefined && expiryDate !== null && expiryDate !== "") {
    const parsed = new Date(expiryDate);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid expiry date");
    }
  }
}

async function ensureUniqueBatchNumber(batchNumber, hospitalId, ignoreId = null) {
  if (!batchNumber) return;

  const medicineCols = await getTableColumns("pharmacy_medicines");
  if (!medicineCols) return;

  const batchCol = firstExistingColumn(medicineCols, ["sku", "batchNumber", "batch_number"]);
  const hospitalCol = await getHospitalColumn("pharmacy_medicines");
  if (!batchCol) return;

  const where = [`\`${batchCol}\` = ?`];
  const params = [batchNumber];

  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  if (ignoreId) {
    where.push(`id <> ?`);
    params.push(ignoreId);
  }

  const rows = await query(
    `SELECT id FROM pharmacy_medicines WHERE ${where.join(" AND ")} LIMIT 1`,
    params
  );

  if (rows[0]) {
    throw new Error("Duplicate batch number");
  }
}

async function medicines(hospitalId, filters = {}) {
  const medicineCols = await getTableColumns("pharmacy_medicines");
  if (!medicineCols) return [];

  const hospitalCol = await getHospitalColumn("pharmacy_medicines");
  const nameCol = firstExistingColumn(medicineCols, ["name", "medicine_name", "title"]);
  const batchCol = firstExistingColumn(medicineCols, ["sku", "batchNumber", "batch_number"]);
  const quantityCol = firstExistingColumn(medicineCols, ["stock_quantity", "quantity"]);
  const reorderCol = firstExistingColumn(medicineCols, ["reorder_level", "reorderLevel"]);
  const expiryCol = firstExistingColumn(medicineCols, ["expiry_date", "expiryDate"]);
  const createdAtCol = firstExistingColumn(medicineCols, ["created_at", "updated_at", "id"]);
  const rawSearch = String(filters.search || "").trim();
  const filter = String(filters.filter || "all").trim().toLowerCase();

  const where = [];
  const params = [];

  if (hospitalId && hospitalCol) {
    where.push(`\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  if (rawSearch && nameCol) {
    where.push(`LOWER(\`${nameCol}\`) LIKE ?`);
    params.push(`%${rawSearch.toLowerCase()}%`);
  }

  if (filter === "low-stock" && quantityCol && reorderCol) {
    where.push(`COALESCE(\`${quantityCol}\`, 0) < COALESCE(\`${reorderCol}\`, 0)`);
  }

  if (filter === "expired" && expiryCol) {
    where.push(`\`${expiryCol}\` IS NOT NULL AND DATE(\`${expiryCol}\`) < CURDATE()`);
  }

  if (filter === "expiring-soon" && expiryCol) {
    where.push(`\`${expiryCol}\` IS NOT NULL AND DATE(\`${expiryCol}\`) >= CURDATE() AND DATE(\`${expiryCol}\`) <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)`);
  }

  let sql = `SELECT * FROM pharmacy_medicines`;
  if (where.length) {
    sql += ` WHERE ${where.join(" AND ")}`;
  }

  if (createdAtCol) {
    sql += ` ORDER BY \`${createdAtCol}\` DESC, id DESC`;
  } else {
    sql += ` ORDER BY id DESC`;
  }

  return query(sql, params);
}

async function createMedicine(payload, hospitalId, actor = null) {
  validateMedicinePayload(payload);
  const resolvedHospitalId = await resolveWritableHospitalId(actor, hospitalId || payload.hospital_id || null);
  await ensureUniqueBatchNumber(String(payload.batchNumber || payload.sku || "").trim(), resolvedHospitalId);

  const medicineCols = await getTableColumns("pharmacy_medicines");
  if (!medicineCols) throw new Error("Medicines table not found");

  const values = {};
  if (medicineCols.has("hospital_id")) values.hospital_id = resolvedHospitalId;
  if (medicineCols.has("name")) values.name = String(payload.name || "").trim();
  if (medicineCols.has("sku")) values.sku = String(payload.batchNumber || payload.sku || "").trim();
  if (medicineCols.has("supplier")) values.supplier = payload.supplier || null;
  if (medicineCols.has("category")) values.category = payload.category || payload.supplier || null;
  if (medicineCols.has("unit_price")) values.unit_price = safeNumber(payload.price ?? payload.unit_price);
  if (medicineCols.has("stock_quantity")) values.stock_quantity = safeNumber(payload.quantity ?? payload.stock_quantity);
  if (medicineCols.has("reorder_level")) values.reorder_level = safeNumber(payload.reorderLevel ?? payload.reorder_level);
  if (medicineCols.has("expiry_date")) values.expiry_date = payload.expiryDate || payload.expiry_date || null;

  const cols = Object.keys(values);
  await query(
    `INSERT INTO pharmacy_medicines (${cols.map((col) => `\`${col}\``).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    cols.map((col) => values[col])
  );
}

async function updateMedicine(id, payload) {
  validateMedicinePayload(payload, { partial: true });

  const medicineCols = await getTableColumns("pharmacy_medicines");
  if (!medicineCols) throw new Error("Medicines table not found");

  const existingRows = await query(`SELECT * FROM pharmacy_medicines WHERE id = ? LIMIT 1`, [id]);
  const existing = existingRows[0];
  if (!existing) throw new Error("Medicine not found");

  await ensureUniqueBatchNumber(
    String(payload.batchNumber || payload.sku || existing.sku || "").trim(),
    existing.hospital_id || null,
    id
  );

  const updates = [];
  const params = [];

  if (medicineCols.has("name") && payload.name !== undefined) {
    updates.push("`name` = ?");
    params.push(String(payload.name || "").trim());
  }
  if (medicineCols.has("sku") && (payload.batchNumber !== undefined || payload.sku !== undefined)) {
    updates.push("`sku` = ?");
    params.push(String(payload.batchNumber || payload.sku || "").trim());
  }
  if (medicineCols.has("supplier") && payload.supplier !== undefined) {
    updates.push("`supplier` = ?");
    params.push(payload.supplier || null);
  }
  if (medicineCols.has("category") && (payload.category !== undefined || payload.supplier !== undefined)) {
    updates.push("`category` = ?");
    params.push(payload.category || payload.supplier || null);
  }
  if (medicineCols.has("unit_price") && (payload.price !== undefined || payload.unit_price !== undefined)) {
    updates.push("`unit_price` = ?");
    params.push(safeNumber(payload.price ?? payload.unit_price));
  }
  if (medicineCols.has("stock_quantity") && (payload.quantity !== undefined || payload.stock_quantity !== undefined)) {
    updates.push("`stock_quantity` = ?");
    params.push(safeNumber(payload.quantity ?? payload.stock_quantity));
  }
  if (medicineCols.has("reorder_level") && (payload.reorderLevel !== undefined || payload.reorder_level !== undefined)) {
    updates.push("`reorder_level` = ?");
    params.push(safeNumber(payload.reorderLevel ?? payload.reorder_level));
  }
  if (medicineCols.has("expiry_date") && (payload.expiryDate !== undefined || payload.expiry_date !== undefined)) {
    updates.push("`expiry_date` = ?");
    params.push(payload.expiryDate ?? payload.expiry_date ?? null);
  }

  if (!updates.length) return;

  params.push(id);
  await query(`UPDATE pharmacy_medicines SET ${updates.join(", ")} WHERE id = ?`, params);
}

function removeMedicine(id) {
  return query(`DELETE FROM pharmacy_medicines WHERE id = ?`, [id]);
}

async function prescriptions(patientId, hospitalId) {
  if (!patientId) {
    throw new Error("patient_id is required");
  }

  const patientCols = await getTableColumns("patients");
  const prescriptionCols = await getTableColumns("pharmacy_prescriptions");
  const prescriptionItemCols = await getTableColumns("pharmacy_prescription_items");
  if (!patientCols || !prescriptionCols || !prescriptionItemCols) {
    return [];
  }

  const patientPrimaryIdCol = firstExistingColumn(patientCols, ["id"]);
  const patientExternalIdCol = firstExistingColumn(patientCols, ["patient_id", "patient_id_no"]);
  const hospitalCol = firstExistingColumn(prescriptionCols, ["hospital_id"]);
  const patientCol = firstExistingColumn(prescriptionCols, ["patient_id"]);
  const statusCol = firstExistingColumn(prescriptionCols, ["status"]);
  const notesCol = firstExistingColumn(prescriptionCols, ["notes"]);
  const imageCol = firstExistingColumn(prescriptionCols, ["image_url", "prescription_image_url", "file_url", "attachment_url"]);
  const itemPrescriptionCol = firstExistingColumn(prescriptionItemCols, ["prescription_id"]);
  const itemMedicineCol = firstExistingColumn(prescriptionItemCols, ["medicine_id"]);
  const itemMedicineUuidCol = firstExistingColumn(prescriptionItemCols, ["medicine_uuid", "medicine_ref", "medicine_code"]);
  const itemQuantityCol = firstExistingColumn(prescriptionItemCols, ["quantity", "qty"]);
  const medicineNameExpr = await getNameExpr("pharmacy_medicines", "pm", ["name", "medicine_name", "title"]);

  let resolvedPatientIds = [patientId];
  if (patientPrimaryIdCol || patientExternalIdCol) {
    const patientRows = await query(
      `SELECT
         ${patientPrimaryIdCol ? `\`${patientPrimaryIdCol}\` AS id` : "NULL AS id"},
         ${patientExternalIdCol ? `\`${patientExternalIdCol}\` AS patient_id` : "NULL AS patient_id"}
       FROM patients
       WHERE ${[patientPrimaryIdCol ? `\`${patientPrimaryIdCol}\` = ?` : null, patientExternalIdCol ? `\`${patientExternalIdCol}\` = ?` : null]
         .filter(Boolean)
         .join(" OR ")}
       LIMIT 1`,
      [patientId, patientId].slice(0, [patientPrimaryIdCol, patientExternalIdCol].filter(Boolean).length)
    );

    if (patientRows[0]) {
      resolvedPatientIds = [patientRows[0].id, patientRows[0].patient_id].filter(
        (value, index, arr) => value !== null && value !== undefined && arr.indexOf(value) === index
      );
    }
  }

  const where = [`p.\`${patientCol}\` IN (${resolvedPatientIds.map(() => "?").join(", ")})`];
  const params = [...resolvedPatientIds];

  if (hospitalId && hospitalCol) {
    where.push(`p.\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  if (statusCol) {
    where.push(`LOWER(COALESCE(p.\`${statusCol}\`, 'active')) = 'active'`);
  }

  return query(
    `SELECT
       p.id,
       p.\`${patientCol}\` AS patient_id,
       ${hospitalCol ? `p.\`${hospitalCol}\`` : "NULL"} AS hospital_id,
       ${notesCol ? `p.\`${notesCol}\`` : "NULL"} AS notes,
       ${imageCol ? `p.\`${imageCol}\`` : "NULL"} AS image_url,
       p.created_at,
       pi.id AS item_id,
       ${itemMedicineUuidCol ? `pi.\`${itemMedicineUuidCol}\`` : itemMedicineCol ? `pi.\`${itemMedicineCol}\`` : "NULL"} AS medicine_id,
       ${itemQuantityCol ? `pi.\`${itemQuantityCol}\`` : "1"} AS quantity,
       pi.dosage,
       pi.frequency,
       pi.duration,
       pi.notes AS item_notes,
       ${medicineNameExpr} AS medicine_name,
       pm.unit_price,
       pm.stock_quantity,
       pm.expiry_date
     FROM pharmacy_prescriptions p
     LEFT JOIN pharmacy_prescription_items pi ON pi.\`${itemPrescriptionCol}\` = p.id
     LEFT JOIN pharmacy_medicines pm ON pm.id = ${itemMedicineUuidCol ? `pi.\`${itemMedicineUuidCol}\`` : itemMedicineCol ? `CAST(pi.\`${itemMedicineCol}\` AS CHAR)` : "NULL"}
     WHERE ${where.join(" AND ")}
     ORDER BY p.created_at DESC, pi.id ASC`,
    params
  );
}

async function createPrescription(payload, hospitalId, actor = null) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const resolvedHospitalId = await resolveWritableHospitalId(actor, hospitalId || payload.hospital_id || null);
    if (!resolvedHospitalId) {
      throw new Error("Hospital not found for this prescription");
    }

    const requestedPatientId = payload.patient_id ?? null;
    if (requestedPatientId === null || requestedPatientId === undefined || String(requestedPatientId).trim() === "") {
      throw new Error("Patient is required");
    }

    const patientCols = await getTableColumns("patients");
    const patientPrimaryIdCol = firstExistingColumn(patientCols || new Set(), ["id"]);
    const patientExternalIdCol = firstExistingColumn(patientCols || new Set(), ["patient_id", "patient_id_no"]);
    const patientClauses = [
      patientPrimaryIdCol ? `\`${patientPrimaryIdCol}\` = ?` : null,
      patientExternalIdCol ? `\`${patientExternalIdCol}\` = ?` : null,
    ].filter(Boolean);

    if (!patientClauses.length) {
      throw new Error("Patients table is not configured correctly");
    }

    const [patientRows] = await connection.execute(
      `SELECT ${patientPrimaryIdCol ? `\`${patientPrimaryIdCol}\`` : "id"} AS id, hospital_id
       FROM patients
       WHERE ${patientClauses.join(" OR ")}
       LIMIT 1`,
      [requestedPatientId, requestedPatientId].slice(0, patientClauses.length)
    );
    const patient = patientRows[0];
    if (!patient) {
      throw new Error("Patient not found");
    }
    const patientId = patient.id;

    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const items = rawItems
      .map((item) => ({
        medicine_id: String(item?.medicine_id || item?.id || "").trim(),
        quantity: Math.max(1, safeNumber(item?.quantity || item?.qty || 1, 1)),
        dosage: item?.dosage ? String(item.dosage).trim() : null,
        frequency: item?.frequency ? String(item.frequency).trim() : null,
        duration: item?.duration ? String(item.duration).trim() : null,
        notes: item?.notes ? String(item.notes).trim() : null,
      }))
      .filter((item) => item.medicine_id);

    if (!items.length) {
      throw new Error("Add at least one medicine to create a prescription");
    }

    for (const item of items) {
      const [medicineRows] = await connection.execute(
        `SELECT id, name, stock_quantity, expiry_date FROM pharmacy_medicines WHERE id = ? LIMIT 1`,
        [item.medicine_id]
      );
      const medicine = medicineRows[0];
      if (!medicine) {
        throw new Error(`Medicine ${item.medicine_id} not found`);
      }
    }

    const prescriptionCols = await getTableColumns("pharmacy_prescriptions");
    const prescriptionImageCol = firstExistingColumn(prescriptionCols || new Set(), ["image_url", "prescription_image_url", "file_url", "attachment_url"]);
    const prescriptionValues = {
      hospital_id: resolvedHospitalId,
      patient_id: patientId,
      doctor_id: payload.doctor_id || actor?.id || null,
      status: "active",
      notes: payload.notes ? String(payload.notes).trim() : null,
    };
    if (prescriptionImageCol) {
      prescriptionValues[prescriptionImageCol] = payload.image_url || payload.prescription_image_url || payload.file_url || null;
    }

    const prescriptionInsertCols = Object.keys(prescriptionValues);
    const [prescriptionResult] = await connection.execute(
      `INSERT INTO pharmacy_prescriptions (${prescriptionInsertCols.map((col) => `\`${col}\``).join(", ")}, created_at, updated_at)
       VALUES (${prescriptionInsertCols.map(() => "?").join(", ")}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      prescriptionInsertCols.map((col) => prescriptionValues[col])
    );

    const prescriptionId = prescriptionResult.insertId;
    const prescriptionItemCols = await getTableColumns("pharmacy_prescription_items");
    const itemMedicineCol = firstExistingColumn(prescriptionItemCols || new Set(), ["medicine_id"]);
    const itemMedicineUuidCol = firstExistingColumn(prescriptionItemCols || new Set(), ["medicine_uuid", "medicine_ref", "medicine_code"]);

    for (const item of items) {
      const itemValues = {
        prescription_id: prescriptionId,
        quantity: item.quantity,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        notes: item.notes,
      };

      if (itemMedicineUuidCol) {
        itemValues[itemMedicineUuidCol] = item.medicine_id;
      }
      if (itemMedicineCol && /^\d+$/.test(String(item.medicine_id))) {
        itemValues[itemMedicineCol] = Number(item.medicine_id);
      }

      const cols = Object.keys(itemValues);
      await connection.execute(
        `INSERT INTO pharmacy_prescription_items (${cols.map((col) => `\`${col}\``).join(", ")}, created_at)
         VALUES (${cols.map(() => "?").join(", ")}, CURRENT_TIMESTAMP)`,
        cols.map((col) => itemValues[col])
      );
    }

    await connection.commit();

    return {
      id: prescriptionId,
      patient_id: patientId,
      doctor_id: payload.doctor_id || actor?.id || null,
      hospital_id: resolvedHospitalId,
      notes: payload.notes ? String(payload.notes).trim() : null,
      image_url: payload.image_url || payload.prescription_image_url || payload.file_url || null,
      items,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function orders(hospitalId) {
  const hospitalCol = await getHospitalColumn("pharmacy_orders");
  const orderCols = await getTableColumns("pharmacy_orders");
  const itemCols = await getTableColumns("pharmacy_order_items");
  const patientNameExpr = await getNameExpr("patients", "p", ["full_name", "name"]);
  const doctorNameExpr = await getNameExpr("doctors", "d", ["full_name", "name"]);
  const orderDateCol = firstExistingColumn(orderCols, ["created_at", "order_date", "updated_at", "id"]);
  const orderTotalCol = firstExistingColumn(orderCols, ["total_amount", "grand_total", "amount"]);
  const orderStatusCol = firstExistingColumn(orderCols, ["status", "order_status", "dispense_status"]);
  const orderItemPriceCol = firstExistingColumn(itemCols, ["unit_price", "price", "selling_price", "rate"]);
  const orderItemMedicineUuidCol = firstExistingColumn(itemCols || new Set(), ["medicine_uuid", "medicine_ref", "medicine_code"]);
  const orderItemMedicineCol = firstExistingColumn(itemCols || new Set(), ["medicine_id"]);

  const where = [];
  const params = [];
  if (hospitalId && hospitalCol) {
    where.push(`po.\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  return query(
    `SELECT
       po.*,
       ${patientNameExpr} AS patient_name,
       ${doctorNameExpr} AS doctor_name,
       COALESCE(GROUP_CONCAT(DISTINCT pm.name SEPARATOR ', '), 'No medicines linked') AS medicine_name,
       COALESCE(SUM(poi.quantity), 0) AS quantity,
       COALESCE(${orderTotalCol ? `po.\`${orderTotalCol}\`` : "NULL"}, SUM(COALESCE(poi.quantity, 0) * COALESCE(${orderItemPriceCol ? `poi.\`${orderItemPriceCol}\`` : "0"}, 0)), 0) AS total_amount,
       ${orderStatusCol ? `po.\`${orderStatusCol}\`` : "'recorded'"} AS status,
       ${orderDateCol ? `po.\`${orderDateCol}\`` : "NULL"} AS created_at
     FROM pharmacy_orders po
     LEFT JOIN pharmacy_order_items poi ON poi.order_id = po.id
     LEFT JOIN pharmacy_medicines pm ON pm.id = ${orderItemMedicineUuidCol ? `poi.\`${orderItemMedicineUuidCol}\`` : orderItemMedicineCol ? `CAST(poi.\`${orderItemMedicineCol}\` AS CHAR)` : "NULL"}
     LEFT JOIN patients p ON p.id = po.patient_id
     LEFT JOIN doctors d ON d.id = po.doctor_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY po.id
     ORDER BY ${orderDateCol ? `po.\`${orderDateCol}\`` : "po.id"} DESC, po.id DESC`,
    params
  );
}

async function createOrder(payload, hospitalId) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const patientId = payload.patient_id || null;
    if (!patientId) {
      throw new Error("Invalid patient ID");
    }

    const [[patient]] = await connection.execute(`SELECT * FROM patients WHERE id = ? LIMIT 1`, [patientId]);
    if (!patient) {
      throw new Error("Invalid patient ID");
    }

    let items = Array.isArray(payload.items) ? payload.items : [];

    if (!items.length && payload.prescription_id) {
      const prescriptionItemCols = await getTableColumns("pharmacy_prescription_items");
      const prescriptionItemMedicineUuidCol = firstExistingColumn(prescriptionItemCols || new Set(), ["medicine_uuid", "medicine_ref", "medicine_code"]);
      const prescriptionItemMedicineCol = firstExistingColumn(prescriptionItemCols || new Set(), ["medicine_id"]);
      const [prescriptionItems] = await connection.execute(
        `SELECT
           ${prescriptionItemMedicineUuidCol ? `\`${prescriptionItemMedicineUuidCol}\`` : prescriptionItemMedicineCol ? `\`${prescriptionItemMedicineCol}\`` : "NULL"} AS medicine_id,
           quantity
         FROM pharmacy_prescription_items
         WHERE prescription_id = ?
         ORDER BY id ASC`,
        [payload.prescription_id]
      );
      items = prescriptionItems.map((row) => ({
        medicine_id: row.medicine_id,
        quantity: row.quantity,
      }));
    }

    const normalizedItems = items
      .map((item) => ({
        medicine_id: String(item?.medicine_id || item?.id || "").trim(),
        quantity: Math.max(1, Number(item?.quantity || item?.qty || 1)),
      }))
      .filter((item) => item.medicine_id);

    if (!normalizedItems.length) {
      throw new Error("Prescription is empty");
    }

    const resolvedItems = [];
    for (const item of normalizedItems) {
      const [[medicine]] = await connection.execute(
        `SELECT * FROM pharmacy_medicines WHERE id = ? LIMIT 1`,
        [item.medicine_id]
      );

      if (!medicine) {
        throw new Error(`Medicine ${item.medicine_id} not found`);
      }

      if (isExpired(medicine.expiry_date)) {
        throw new Error(`${medicine.name || "Medicine"} is expired and cannot be dispensed`);
      }

      if (safeNumber(medicine.stock_quantity) < item.quantity) {
        throw new Error(`${medicine.name || "Medicine"} is out of stock for requested quantity`);
      }

      resolvedItems.push({
        ...item,
        medicine,
        unit_price: safeNumber(medicine.unit_price),
        gst_percent: safeNumber(payload.gst_percent, 0),
      });
    }

    const subtotal = resolvedItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    const discountAmount = safeNumber(payload.discount_amount, 0);
    const gstPercent = safeNumber(payload.gst_percent, 0);
    const taxableBase = Math.max(subtotal - discountAmount, 0);
    const taxAmount = Number(((taxableBase * gstPercent) / 100).toFixed(2));
    const totalAmount = Number((taxableBase + taxAmount).toFixed(2));
    const paymentMethod = String(payload.payment_method || payload.method || "cash").toLowerCase();
    const invoiceNumber = `PHARM-${Date.now()}`;

    const orderCols = await getTableColumns("pharmacy_orders");
    const orderValues = {};
    if (orderCols?.has("hospital_id")) orderValues.hospital_id = hospitalId || payload.hospital_id || patient.hospital_id || null;
    if (orderCols?.has("patient_id")) orderValues.patient_id = patientId;
    if (orderCols?.has("doctor_id")) orderValues.doctor_id = payload.doctor_id || null;
    if (orderCols?.has("total_amount")) orderValues.total_amount = totalAmount;
    if (orderCols?.has("grand_total")) orderValues.grand_total = totalAmount;
    if (orderCols?.has("amount")) orderValues.amount = totalAmount;
    if (orderCols?.has("status")) orderValues.status = "dispensed";
    if (orderCols?.has("order_status")) orderValues.order_status = "dispensed";
    if (orderCols?.has("dispense_status")) orderValues.dispense_status = "dispensed";
    if (orderCols?.has("order_date")) orderValues.order_date = new Date();

    const orderInsertCols = Object.keys(orderValues);
    const [orderResult] = await connection.execute(
      `INSERT INTO pharmacy_orders (${orderInsertCols.map((col) => `\`${col}\``).join(", ")})
       VALUES (${orderInsertCols.map(() => "?").join(", ")})`,
      orderInsertCols.map((col) => orderValues[col])
    );

    const orderId = orderResult.insertId;
    const orderItemCols = await getTableColumns("pharmacy_order_items");
    const orderItemMedicineCol = firstExistingColumn(orderItemCols || new Set(), ["medicine_id"]);
    const orderItemMedicineUuidCol = firstExistingColumn(orderItemCols || new Set(), ["medicine_uuid", "medicine_ref", "medicine_code"]);

    for (const item of resolvedItems) {
      const orderItemValues = {
        order_id: orderId,
        quantity: item.quantity,
      };

      if (orderItemCols?.has("unit_price")) orderItemValues.unit_price = item.unit_price;
      if (orderItemCols?.has("gst_percent")) orderItemValues.gst_percent = gstPercent;
      if (orderItemMedicineUuidCol) {
        orderItemValues[orderItemMedicineUuidCol] = item.medicine_id;
      }
      if (orderItemMedicineCol && /^\d+$/.test(String(item.medicine_id))) {
        orderItemValues[orderItemMedicineCol] = Number(item.medicine_id);
      }

      const orderCols = Object.keys(orderItemValues);
      await connection.execute(
        `INSERT INTO pharmacy_order_items (${orderCols.map((col) => `\`${col}\``).join(", ")})
         VALUES (${orderCols.map(() => "?").join(", ")})`,
        orderCols.map((col) => orderItemValues[col])
      );

      await connection.execute(
        `UPDATE pharmacy_medicines
         SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [item.quantity, item.medicine_id]
      );
    }

    const [invoiceResult] = await connection.execute(
      `INSERT INTO invoices (invoice_number, patient_id, hospital_id, subtotal, tax_amount, discount_amount, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        patientId,
        hospitalId || payload.hospital_id || patient.hospital_id || null,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        "paid",
      ]
    );

    const invoiceId = invoiceResult.insertId;

    for (const item of resolvedItems) {
      await connection.execute(
        `INSERT INTO invoice_items (invoice_id, item_name, price, quantity, billing_type, notes, service_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.medicine.name || `Medicine #${item.medicine_id}`,
          item.unit_price,
          item.quantity,
          "pharmacy",
          payload.prescription_id ? `Prescription #${payload.prescription_id}` : null,
          new Date().toISOString().slice(0, 10),
        ]
      );
    }

    const paymentCols = await getTableColumns("payments");
    const paymentValues = {};
    if (paymentCols?.has("hospital_id")) paymentValues.hospital_id = hospitalId || payload.hospital_id || patient.hospital_id || null;
    if (paymentCols?.has("invoice_id")) paymentValues.invoice_id = invoiceId;
    if (paymentCols?.has("patient_id")) paymentValues.patient_id = patientId;
    if (paymentCols?.has("amount")) paymentValues.amount = totalAmount;
    if (paymentCols?.has("payment_method")) paymentValues.payment_method = paymentMethod;
    if (paymentCols?.has("method")) paymentValues.method = paymentMethod;
    if (paymentCols?.has("reference_no")) paymentValues.reference_no = payload.reference_no || null;
    if (paymentCols?.has("transaction_id")) paymentValues.transaction_id = payload.reference_no || null;
    if (paymentCols?.has("status")) paymentValues.status = "completed";
    if (paymentCols?.has("paid_at")) paymentValues.paid_at = new Date();
    if (paymentCols?.has("payment_date")) paymentValues.payment_date = new Date();

    const paymentInsertCols = Object.keys(paymentValues);
    if (paymentInsertCols.length) {
      await connection.execute(
        `INSERT INTO payments (${paymentInsertCols.map((col) => `\`${col}\``).join(", ")})
         VALUES (${paymentInsertCols.map(() => "?").join(", ")})`,
        paymentInsertCols.map((col) => paymentValues[col])
      );
    }

    await connection.commit();

    return {
      order_id: orderId,
      invoice_id: invoiceId,
      invoice: {
        id: invoiceId,
        invoice_number: invoiceNumber,
        patient_id: patientId,
        payment_method: paymentMethod,
        subtotal,
        discount_amount: discountAmount,
        gst_percent: gstPercent,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        issued_at: new Date().toISOString(),
        items: resolvedItems.map((item) => ({
          medicine_id: item.medicine_id,
          medicine_name: item.medicine.name || `Medicine #${item.medicine_id}`,
          quantity: item.quantity,
          unit_price: item.unit_price,
          expiry_date: item.medicine.expiry_date || null,
          line_total: Number((item.quantity * item.unit_price).toFixed(2)),
        })),
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function sales(hospitalId) {
  const hospitalCol = await getHospitalColumn("pharmacy_orders");
  const orderCols = await getTableColumns("pharmacy_orders");
  const itemCols = await getTableColumns("pharmacy_order_items");
  const orderDateCol = firstExistingColumn(orderCols, ["created_at", "order_date", "updated_at", "id"]);
  const orderStatusCol = firstExistingColumn(orderCols, ["status", "order_status", "dispense_status"]);
  const orderItemPriceCol = firstExistingColumn(itemCols, ["unit_price", "price", "selling_price", "rate"]);
  const orderItemMedicineUuidCol = firstExistingColumn(itemCols || new Set(), ["medicine_uuid", "medicine_ref", "medicine_code"]);
  const orderItemMedicineCol = firstExistingColumn(itemCols || new Set(), ["medicine_id"]);
  const where = [];
  const params = [];

  if (hospitalId && hospitalCol) {
    where.push(`po.\`${hospitalCol}\` = ?`);
    params.push(hospitalId);
  }

  return query(
    `SELECT
       po.id,
       po.patient_id,
       ${orderDateCol ? `po.\`${orderDateCol}\`` : "NULL"} AS created_at,
       ${orderItemMedicineUuidCol ? `poi.\`${orderItemMedicineUuidCol}\`` : orderItemMedicineCol ? `poi.\`${orderItemMedicineCol}\`` : "NULL"} AS medicine_id,
       pm.name AS medicine_name,
       poi.quantity,
       (COALESCE(poi.quantity, 0) * COALESCE(${orderItemPriceCol ? `poi.\`${orderItemPriceCol}\`` : "0"}, 0)) AS total_amount,
       ${orderStatusCol ? `po.\`${orderStatusCol}\`` : "'pending'"} AS status
     FROM pharmacy_orders po
     LEFT JOIN pharmacy_order_items poi ON poi.order_id = po.id
     LEFT JOIN pharmacy_medicines pm ON pm.id = ${orderItemMedicineUuidCol ? `poi.\`${orderItemMedicineUuidCol}\`` : orderItemMedicineCol ? `CAST(poi.\`${orderItemMedicineCol}\` AS CHAR)` : "NULL"}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ${orderDateCol ? `po.\`${orderDateCol}\`` : "po.id"} DESC, po.id DESC`,
    params
  );
}

module.exports = {
  medicines,
  createMedicine,
  updateMedicine,
  removeMedicine,
  createPrescription,
  prescriptions,
  orders,
  createOrder,
  sales,
};
