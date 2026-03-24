const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/adminAmbulanceController");

const router = express.Router();
router.use(authenticate, authorize("hospital_admin", "super_admin"));

router.get("/ambulance/requests", controller.listRequests);
router.get("/ambulances/available", controller.listAvailableAmbulances);
router.put("/ambulance/requests/:id/assign", controller.assignAmbulance);
router.put("/ambulance/requests/:id/status", controller.updateRequestStatus);

module.exports = router;

