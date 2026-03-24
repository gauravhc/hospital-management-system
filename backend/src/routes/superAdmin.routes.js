const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllHospitals, createHospital, updateHospital, deactivateHospital,
  createHospitalAdmin, getSystemStats, getAuditLogs
} = require('../controllers/superAdminController');

// All routes require super_admin role
router.use(authenticate, authorize('super_admin'));

router.get('/stats', getSystemStats);
router.get('/audit-logs', getAuditLogs);

// Hospital CRUD
router.get('/hospitals', getAllHospitals);

router.post('/hospitals',
  [
    body('name').notEmpty().withMessage('Hospital name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('license_no').notEmpty().withMessage('License number required'),
  ],
  validate,
  createHospital
);

router.put('/hospitals/:id', updateHospital);
router.delete('/hospitals/:id', deactivateHospital);

// Create hospital admin
router.post('/hospitals/:hospitalId/admins',
  [
    body('first_name').notEmpty(),
    body('last_name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
  ],
  validate,
  createHospitalAdmin
);

module.exports = router;
