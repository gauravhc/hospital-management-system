const express = require("express");
const controller = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");

const router = express.Router();
router.use(authMiddleware, hospitalScope);

router.get("/items", asyncHandler(controller.items));
router.post("/items", asyncHandler(controller.createItem));
router.put("/items/:id", asyncHandler(controller.updateItem));
router.delete("/items/:id", asyncHandler(controller.removeItem));
router.get("/low-stock", asyncHandler(controller.lowStock));
router.get("/batches", asyncHandler(controller.batches));
router.post("/batches", asyncHandler(controller.createBatch));

module.exports = router;
