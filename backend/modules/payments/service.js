const { getConnection, query } = require("../../config/database");
const { getHospitalColumn } = require("../../services/dbMeta");

async function create(payload, hospitalId) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [[invoice]] = await connection.execute(`SELECT * FROM invoices WHERE id = ? LIMIT 1`, [payload.invoice_id]);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const amount = Number(payload.amount || 0);
    if (amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    await connection.execute(
      `INSERT INTO payments (hospital_id, invoice_id, patient_id, amount, payment_method, reference_no, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        hospitalId || payload.hospital_id || invoice.hospital_id || null,
        payload.invoice_id,
        invoice.patient_id || null,
        amount,
        payload.payment_method || payload.method || "cash",
        payload.reference_no || null,
        payload.status || "completed",
      ]
    );

    const [[summary]] = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid
       FROM payments
       WHERE invoice_id = ? AND status = 'completed'`,
      [payload.invoice_id]
    );

    const totalPaid = Number(summary?.total_paid || 0);
    const invoiceTotal = Number(invoice.total_amount || 0);
    const nextStatus = totalPaid >= invoiceTotal ? "paid" : "issued";

    await connection.execute(`UPDATE invoices SET status = ? WHERE id = ?`, [nextStatus, payload.invoice_id]);
    await connection.commit();

    return {
      invoice_id: payload.invoice_id,
      total_paid: totalPaid,
      total_amount: invoiceTotal,
      status: nextStatus,
      balance: Math.max(invoiceTotal - totalPaid, 0),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function history(hospitalId) {
  const hospitalCol = await getHospitalColumn("payments");
  return hospitalId && hospitalCol
    ? query(`SELECT * FROM payments WHERE \`${hospitalCol}\` = ? ORDER BY paid_at DESC, id DESC`, [hospitalId])
    : query(`SELECT * FROM payments ORDER BY paid_at DESC, id DESC`);
}

async function getById(id) {
  const rows = await query(`SELECT * FROM payments WHERE id = ?`, [id]);
  return rows[0] || null;
}

module.exports = { create, history, getById };
