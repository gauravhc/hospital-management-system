const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const { roleMiddleware, hospitalScope } = require("../../middleware/roleMiddleware");
const { asyncHandler } = require("../../services/module.helper");
const service = require("./service");

const router = express.Router();

// Patient creates request + views latest status
router.post(
  "/request",
  authMiddleware,
  roleMiddleware("patient"),
  asyncHandler(async (req, res) => {
    const result = await service.createPatientRequest(req.user, req.body || {});
    return res.status(201).json({ success: true, message: "Ambulance request created", data: result });
  })
);

router.get(
  "/my-request",
  authMiddleware,
  roleMiddleware("patient"),
  asyncHandler(async (req, res) => {
    const row = await service.latestPatientRequest(req.user);
    return res.json({ success: true, data: row });
  })
);

// Hospital admin views requests for their hospital
router.get(
  "/hospital-requests",
  authMiddleware,
  hospitalScope,
  roleMiddleware("hospital_admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const status = req.query?.status ? String(req.query.status) : null;
    const rows = await service.hospitalRequests(req.user, { status });
    return res.json({ success: true, data: rows, requests: rows });
  })
);

// Assign ambulance to request (hospital admin)
router.post(
  "/assign",
  authMiddleware,
  hospitalScope,
  roleMiddleware("hospital_admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const { request_id, ambulance_id, eta_minutes } = req.body || {};
    if (!request_id || !ambulance_id) {
      return res.status(400).json({ success: false, message: "request_id and ambulance_id are required" });
    }

    const updated = await service.assignAmbulance(req.user, {
      request_id,
      ambulance_id,
      eta_minutes: eta_minutes !== undefined && eta_minutes !== null ? Number(eta_minutes) : null,
    });
    return res.json({ success: true, message: "Ambulance assigned", data: updated });
  })
);

// Update request status (hospital admin)
router.put(
  "/update-status",
  authMiddleware,
  hospitalScope,
  roleMiddleware("hospital_admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const { request_id, status } = req.body || {};
    if (!request_id || !status) {
      return res.status(400).json({ success: false, message: "request_id and status are required" });
    }

    const updated = await service.updateRequestStatus(req.user, { request_id, status });
    return res.json({ success: true, message: "Status updated", data: updated });
  })
);

module.exports = router;

