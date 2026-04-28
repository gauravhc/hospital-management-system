const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope, roleMiddleware } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/items", roleMiddleware("inventory", "hospital_admin", "super_admin"), asyncHandler(controller.items));
router.post("/items", roleMiddleware("inventory", "hospital_admin", "super_admin"), asyncHandler(controller.createItem));
router.put("/items/:id", roleMiddleware("inventory", "hospital_admin", "super_admin"), asyncHandler(controller.updateItem));
router.delete("/items/:id", roleMiddleware("inventory", "hospital_admin", "super_admin"), asyncHandler(controller.removeItem));
router.get("/low-stock", roleMiddleware("inventory", "pharmacist", "hospital_admin", "super_admin"), asyncHandler(controller.lowStock));
router.get("/batches", roleMiddleware("inventory", "hospital_admin", "super_admin"), asyncHandler(controller.batches));
router.post("/batches", roleMiddleware("inventory", "hospital_admin", "super_admin"), asyncHandler(controller.createBatch));

// Aliases expected by role-based inventory flows
router.post("/item", roleMiddleware("inventory", "hospital_admin", "super_admin"), asyncHandler(controller.createItem));
router.put("/update", roleMiddleware("inventory", "hospital_admin", "super_admin"), asyncHandler(async (req, res) => {
  const id = req.body?.id ?? req.body?.item_id ?? req.body?.itemId;
  if (!id) {
    return res.status(400).json({ success: false, message: "item id is required" });
  }
  req.params.id = id;
  return controller.updateItem(req, res);
}));

module.exports = router;
