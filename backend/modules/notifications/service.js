const { query } = require("../../config/database");

function normalizeNotification(row) {
  if (!row) return row;
  return {
    ...row,
    status: row.status || "unread",
  };
}

async function listByUser(userId, { limit = 50, status = "" } = {}) {
  const safeLimit = Math.trunc(Math.max(1, Math.min(200, Number(limit) || 50)));
  const statusValue = String(status || "").trim().toLowerCase();

  if (statusValue === "read" || statusValue === "unread") {
    const rows = await query(
      `SELECT id, user_id, message, status, created_at
       FROM notifications
       WHERE user_id = ? AND status = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ${safeLimit}`,
      [userId, statusValue]
    );
    return rows.map(normalizeNotification);
  }

  const rows = await query(
    `SELECT id, user_id, message, status, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ${safeLimit}`,
    [userId]
  );

  return rows.map(normalizeNotification);
}

async function createNotification(userId, message) {
  if (!userId) return null;
  const msg = String(message || "").trim();
  if (!msg) return null;

  const result = await query(
    `INSERT INTO notifications (user_id, message, status)
     VALUES (?, ?, 'unread')`,
    [userId, msg]
  );
  return result?.insertId ?? null;
}

async function markRead(notificationId, userId) {
  if (!notificationId || !userId) return { changed: 0 };
  const result = await query(
    `UPDATE notifications SET status = 'read'
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
  return { changed: Number(result?.affectedRows || 0) };
}

async function markAllRead(userId) {
  if (!userId) return { changed: 0 };
  const result = await query(
    `UPDATE notifications SET status = 'read'
     WHERE user_id = ? AND (status IS NULL OR status = 'unread')`,
    [userId]
  );
  return { changed: Number(result?.affectedRows || 0) };
}

module.exports = {
  listByUser,
  createNotification,
  markRead,
  markAllRead,
};
