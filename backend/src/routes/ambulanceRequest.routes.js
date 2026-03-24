const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/ambulanceRequestsController");

const router = express.Router();
router.use(authenticate, authorize("patient", "super_admin"));

router.post("/request", controller.createRequest);
router.get("/my-requests", controller.getMyRequests);

module.exports = router;

