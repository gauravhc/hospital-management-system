const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

router.get(
  "/stats",
  authMiddleware(["hospital_admin", "super_admin"]),
  dashboardController.getHospitalAdminStats
);

module.exports = router;
