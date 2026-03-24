const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/ambulanceController");

// patient creates request
router.post("/request", auth, controller.createRequest);

// ambulance staff updates trip
router.put("/status/:id", auth, controller.updateStatus);

// patient sees request status
router.get("/my-requests", auth, controller.getPatientRequests);

module.exports = router;