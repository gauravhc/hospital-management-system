const { ok } = require("../../services/module.helper");
const service = require("./service");

async function listMe(req, res) {
  const userId = req.user?.id ?? null;
  if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

  const limit = req.query.limit ?? 50;
  const status = req.query.status ?? "";
  const notifications = await service.listByUser(userId, { limit, status });
  return res.json({ success: true, message: "Success", data: notifications, notifications });
}

async function readOne(req, res) {
  const userId = req.user?.id ?? null;
  const id = req.params.id;
  const updated = await service.markRead(id, userId);
  return ok(res, updated, "Notification updated");
}

async function readAll(req, res) {
  const userId = req.user?.id ?? null;
  const updated = await service.markAllRead(userId);
  return ok(res, updated, "Notifications updated");
}

module.exports = {
  listMe,
  readOne,
  readAll,
};

