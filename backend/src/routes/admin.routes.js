const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDashboard, getAllStaff, updateStaffStatus,
  getDepartments, createDepartment, getHospitalSettings, updateHospitalSettings
} = require('../controllers/adminController');

router.use(authenticate, authorize('hospital_admin', 'super_admin'));

router.get('/dashboard', getDashboard);

// Staff
router.get('/staff', getAllStaff);
router.put('/staff/:userId/status',
  [body('status').isIn(['active', 'inactive', 'suspended'])],
  validate,
  updateStaffStatus
);

// Departments
router.get('/departments', getDepartments);
router.post('/departments',
  [body('name').notEmpty(), body('code').notEmpty()],
  validate,
  createDepartment
);

// Hospital settings
router.get('/settings', getHospitalSettings);
router.put('/settings', updateHospitalSettings);

module.exports = router;
