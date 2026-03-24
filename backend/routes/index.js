const express = require("express");

const authRoutes = require("../modules/auth/routes");
const hospitalRoutes = require("../modules/hospitals/routes");
const hospitalDirectoryRoutes = require("../modules/hospital/routes");
const superAdminRoutes = require("../modules/super-admins/routes");
const hospitalAdminRoutes = require("../modules/hospital-admins/routes");
const userRoutes = require("../modules/users/routes");
const patientRoutes = require("../modules/patients/routes");
const patientSelfRoutes = require("../modules/patient/routes");
const doctorRoutes = require("../modules/doctors/routes");
const nurseRoutes = require("../modules/nurses/routes");
const nurseModuleRoutes = require("../modules/nurse/routes");
const appointmentRoutes = require("../modules/appointments/routes");
const labRoutes = require("../modules/lab/routes");
const pharmacyRoutes = require("../modules/pharmacy/routes");
const inventoryRoutes = require("../modules/inventory/routes");
const billingRoutes = require("../modules/billing/routes");
const paymentRoutes = require("../modules/payments/routes");
const insuranceRoutes = require("../modules/insurance/routes");
const ambulanceRoutes = require("../modules/ambulance/routes");
const ambulanceFlowRoutes = require("../modules/ambulance/flow.routes");
const reportRoutes = require("../modules/reports/routes");
const hrRoutes = require("../modules/hr/routes");
const taskRoutes = require("../modules/tasks/routes");
const legacyCompatRoutes = require("./legacyCompat.routes");

const router = express.Router();

// Primary module APIs
router.use("/auth", authRoutes);
router.use("/super-admins", superAdminRoutes);
router.use("/hospital-admins", hospitalAdminRoutes);
router.use("/hospitals", hospitalRoutes);
router.use("/hospital", hospitalDirectoryRoutes);
router.use("/users", userRoutes);
router.use("/patients", patientRoutes);
// Patient self-service aliases (singular) for frontend convenience
router.use("/patient", patientSelfRoutes);
router.use("/doctors", doctorRoutes);
router.use("/nurses", nurseRoutes);
router.use("/nurse", nurseModuleRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/lab", labRoutes);
router.use("/pharmacy", pharmacyRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/billing", billingRoutes);
router.use("/payments", paymentRoutes);
router.use("/ambulances", ambulanceRoutes);
router.use("/ambulance", ambulanceFlowRoutes);
router.use("/reports", reportRoutes);
router.use("/hr", hrRoutes);
router.use("/tasks", taskRoutes);

// Insurance module mounts at /claims and /insurance/policies
router.use("/", insuranceRoutes);

// Legacy compatibility endpoints (mounted last so primary routes win)
router.use("/", legacyCompatRoutes);

module.exports = router;
