const { query, getConnection } = require("../../config/database");
const { getHospitalColumn, getTableColumns, firstExistingColumn } = require("../../services/dbMeta");

async function invoices(hospitalId) {
  const hospitalCol = await getHospitalColumn("invoices");
  return hospitalId && hospitalCol
    ? query(`SELECT * FROM invoices WHERE \`${hospitalCol}\` = ? ORDER BY created_at DESC, id DESC`, [hospitalId])
    : query(`SELECT * FROM invoices ORDER BY created_at DESC, id DESC`);
}

function createInvoice(payload, hospitalId) {
  const subtotal = Number(payload.subtotal ?? payload.total_amount ?? 0);
  const taxAmount = Number(payload.tax_amount ?? 0);
  const discountAmount = Number(payload.discount_amount ?? 0);
  const totalAmount = Number(payload.total_amount ?? subtotal + taxAmount - discountAmount);
  const invoiceNumber = payload.invoice_number || `INV-${Date.now()}`;

  return query(
    `INSERT INTO invoices (invoice_number, patient_id, appointment_id, hospital_id, subtotal, tax_amount, discount_amount, total_amount, due_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoiceNumber,
      payload.patient_id,
      payload.appointment_id || null,
      hospitalId || payload.hospital_id,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      payload.due_date || null,
      payload.status || "issued",
    ]
  );
}

async function getInvoice(id) {
  const rows = await query(`SELECT * FROM invoices WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function patientInvoices(patientId) {
  const paymentCols = await getTableColumns("payments");
  const invoiceItemCols = await getTableColumns("invoice_items");
  const patientCols = await getTableColumns("patients");

  let resolvedPatientId = patientId;
  if (patientCols) {
    const idCol = firstExistingColumn(patientCols, ["id"]);
    const externalIdCol = firstExistingColumn(patientCols, ["patient_id", "patient_id_no"]);

    if (idCol) {
      const rows = await query(`SELECT \`${idCol}\` AS id FROM patients WHERE \`${idCol}\` = ? LIMIT 1`, [patientId]);
      if (rows[0]?.id) {
        resolvedPatientId = rows[0].id;
      } else if (externalIdCol) {
        const externalRows = await query(
          `SELECT \`${idCol}\` AS id FROM patients WHERE \`${externalIdCol}\` = ? LIMIT 1`,
          [patientId]
        );
        if (externalRows[0]?.id) {
          resolvedPatientId = externalRows[0].id;
        }
      }
    }
  }

  const invoiceRows = await query(
    `SELECT i.*
     FROM invoices i
     WHERE i.patient_id = ?
     ORDER BY i.created_at DESC, i.id DESC`,
    [resolvedPatientId]
  );

  if (!invoiceRows.length) return [];

  const invoiceIds = invoiceRows.map((row) => row.id);
  const placeholders = invoiceIds.map(() => "?").join(", ");

  let paymentRows = [];
  let itemRows = [];

  if (paymentCols) {
    paymentRows = await query(
      `SELECT p.*
       FROM payments p
       INNER JOIN (
         SELECT invoice_id, MAX(id) AS latest_id
         FROM payments
         WHERE invoice_id IN (${placeholders})
         GROUP BY invoice_id
       ) latest ON latest.latest_id = p.id`,
      invoiceIds
    );
  }

  if (invoiceItemCols) {
    itemRows = await query(
      `SELECT * FROM invoice_items WHERE invoice_id IN (${placeholders}) ORDER BY id DESC`,
      invoiceIds
    );
  }

  const paymentByInvoiceId = Object.fromEntries(
    paymentRows.map((row) => [String(row.invoice_id), row])
  );
  const itemsByInvoiceId = itemRows.reduce((acc, row) => {
    const key = String(row.invoice_id);
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return invoiceRows.map((row) => {
    const payment = paymentByInvoiceId[String(row.id)] || null;
    return {
      ...row,
      payment_status: row.payment_status || row.status || payment?.status || "unpaid",
      payment_method: row.payment_method || payment?.method || null,
      reference_no: row.reference_no || row.transaction_id || payment?.reference_no || null,
      items: itemsByInvoiceId[String(row.id)] || [],
    };
  });
}

async function updateInvoiceStatus(id, payload = {}) {
  const invoiceCols = await getTableColumns("invoices");
  const paymentCols = await getTableColumns("payments");
  if (!invoiceCols) throw new Error("Invoices table not found");

  const invoice = await getInvoice(id);
  if (!invoice) throw new Error("Invoice not found");

  const normalizeInvoiceStatus = (value) => {
    const normalized = String(value || "").toLowerCase().trim();
    if (normalized === "paid") return "paid";
    if (normalized === "cancelled") return "cancelled";
    if (normalized === "draft") return "draft";
    if (normalized === "issued") return "issued";
    return "unpaid";
  };

  const normalizePaymentStatus = (value) => {
    const normalized = String(value || "").toLowerCase().trim();
    if (normalized === "paid") return "paid";
    if (normalized === "completed") return "completed";
    if (normalized === "partially_paid") return "partially_paid";
    if (normalized === "surgery_paid") return "surgery_paid";
    if (normalized === "bed_paid") return "bed_paid";
    if (normalized === "failed") return "failed";
    if (normalized === "cancelled") return "cancelled";
    return "unpaid";
  };

  const safeNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const totalAmount = safeNumber(invoice.total_amount);
  const surgeryTotal = safeNumber(invoice.surgery_total);
  const bedTotal = safeNumber(invoice.bed_total);
  const requestedScope = String(payload.settlement_scope || payload.payment_scope || "").toLowerCase().trim();
  const requestedStatus = String(payload.payment_status || payload.status || "").toLowerCase().trim();
  const customPaidAmount = safeNumber(payload.paid_amount);

  let nextPaidAmount = safeNumber(invoice.paid_amount);
  let nextPaymentStatus = normalizePaymentStatus(payload.payment_status || payload.status);
  let nextSettlementScope = requestedScope || String(invoice.settlement_scope || "none");

  if (requestedStatus === "paid" || requestedScope === "full_bill") {
    nextPaidAmount = totalAmount;
    nextPaymentStatus = "paid";
    nextSettlementScope = "full_bill";
  } else if (requestedScope === "surgery_only") {
    nextPaidAmount = Math.min(surgeryTotal, totalAmount);
    nextPaymentStatus = nextPaidAmount > 0 ? "surgery_paid" : "unpaid";
    nextSettlementScope = "surgery_only";
  } else if (requestedScope === "bed_only") {
    nextPaidAmount = Math.min(bedTotal, totalAmount);
    nextPaymentStatus = nextPaidAmount > 0 ? "bed_paid" : "unpaid";
    nextSettlementScope = "bed_only";
  } else if (requestedScope === "custom") {
    nextPaidAmount = Math.min(customPaidAmount, totalAmount);
    nextPaymentStatus = nextPaidAmount >= totalAmount ? "paid" : nextPaidAmount > 0 ? "partially_paid" : "unpaid";
    nextSettlementScope = "custom";
  } else if (requestedStatus === "pending" || requestedStatus === "unpaid") {
    nextPaidAmount = 0;
    nextPaymentStatus = requestedStatus || "unpaid";
    nextSettlementScope = requestedScope || "none";
  }

  const nextDueAmount = Math.max(totalAmount - nextPaidAmount, 0);
  const invoiceRowStatus = nextDueAmount <= 0 ? "paid" : "unpaid";

  const invoiceUpdates = [];
  const invoiceParams = [];
  if (invoiceCols.has("status")) {
    invoiceUpdates.push("`status` = ?");
    invoiceParams.push(invoiceRowStatus);
  }
  if (invoiceCols.has("payment_status")) {
    invoiceUpdates.push("`payment_status` = ?");
    invoiceParams.push(nextPaymentStatus);
  }
  if (invoiceCols.has("settlement_scope")) {
    invoiceUpdates.push("`settlement_scope` = ?");
    invoiceParams.push(nextSettlementScope);
  }
  if (invoiceCols.has("paid_amount")) {
    invoiceUpdates.push("`paid_amount` = ?");
    invoiceParams.push(nextPaidAmount);
  }
  if (invoiceCols.has("due_amount")) {
    invoiceUpdates.push("`due_amount` = ?");
    invoiceParams.push(nextDueAmount);
  }
  if (invoiceCols.has("payment_method") && payload.payment_method !== undefined) {
    invoiceUpdates.push("`payment_method` = ?");
    invoiceParams.push(payload.payment_method || null);
  }
  if (invoiceCols.has("transaction_id") && payload.reference_no !== undefined) {
    invoiceUpdates.push("`transaction_id` = ?");
    invoiceParams.push(payload.reference_no || null);
  }
  if (invoiceCols.has("payment_note") && payload.payment_note !== undefined) {
    invoiceUpdates.push("`payment_note` = ?");
    invoiceParams.push(payload.payment_note || null);
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    if (invoiceUpdates.length) {
      await connection.execute(
        `UPDATE invoices SET ${invoiceUpdates.join(", ")} WHERE id = ?`,
        [...invoiceParams, id]
      );
    }

    if (paymentCols) {
      const [paymentRows] = await connection.execute(
        `SELECT * FROM payments WHERE invoice_id = ? ORDER BY id DESC LIMIT 1`,
        [id]
      );

      const amount = nextPaidAmount || safeNumber(payload.amount ?? invoice.total_amount ?? 0);

      if (paymentRows.length) {
        const paymentUpdates = [];
        const paymentParams = [];

        if (paymentCols.has("status")) {
          paymentUpdates.push("`status` = ?");
          paymentParams.push(nextDueAmount <= 0 ? "completed" : nextPaidAmount > 0 ? "partial" : "pending");
        }
        if (paymentCols.has("method") && payload.payment_method !== undefined) {
          paymentUpdates.push("`method` = ?");
          paymentParams.push(payload.payment_method || null);
        }
        if (paymentCols.has("reference_no") && payload.reference_no !== undefined) {
          paymentUpdates.push("`reference_no` = ?");
          paymentParams.push(payload.reference_no || null);
        }
        if (paymentCols.has("amount")) {
          paymentUpdates.push("`amount` = ?");
          paymentParams.push(amount);
        }
        if (paymentCols.has("payment_date") && (payload.status === "paid" || payload.payment_status === "paid")) {
          paymentUpdates.push("`payment_date` = CURRENT_TIMESTAMP");
        }

        if (paymentUpdates.length) {
          await connection.execute(
            `UPDATE payments SET ${paymentUpdates.join(", ")} WHERE id = ?`,
            [...paymentParams, paymentRows[0].id]
          );
        }
      } else {
        const paymentValues = {};
        if (paymentCols.has("invoice_id")) paymentValues.invoice_id = id;
        if (paymentCols.has("hospital_id")) paymentValues.hospital_id = invoice.hospital_id ?? null;
        if (paymentCols.has("patient_id")) paymentValues.patient_id = invoice.patient_id ?? null;
        if (paymentCols.has("amount")) paymentValues.amount = amount;
        if (paymentCols.has("method")) paymentValues.method = payload.payment_method || null;
        if (paymentCols.has("reference_no")) paymentValues.reference_no = payload.reference_no || null;
        if (paymentCols.has("status")) paymentValues.status = nextDueAmount <= 0 ? "completed" : nextPaidAmount > 0 ? "partial" : "pending";
        if (paymentCols.has("payment_date")) paymentValues.payment_date = new Date();

        const insertCols = Object.keys(paymentValues);
        if (insertCols.length) {
          await connection.execute(
            `INSERT INTO payments (${insertCols.map((col) => `\`${col}\``).join(", ")})
             VALUES (${insertCols.map(() => "?").join(", ")})`,
            insertCols.map((col) => paymentValues[col])
          );
        }
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { invoices, createInvoice, getInvoice, patientInvoices, updateInvoiceStatus };
