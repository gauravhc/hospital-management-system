const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor, getDoctorSchedule
} = require('../controllers/doctorController');

router.use(authenticate);

router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/schedule', getDoctorSchedule);

// Admin-only: create, update, delete
router.post('/',
  authorize('hospital_admin', 'super_admin'),
  [
    body('first_name').notEmpty(),
    body('last_name').notEmpty(),
    body('email').isEmail(),
    body('specialization').notEmpty().withMessage('Specialization required'),
    body('license_number').notEmpty().withMessage('License number required'),
  ],
  validate,
  createDoctor
);

router.put('/:id', authorize('hospital_admin', 'super_admin'), updateDoctor);
router.delete('/:id', authorize('hospital_admin', 'super_admin'), deleteDoctor);

module.exports = router;
