const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllPatients, getPatientById, createPatient, updatePatient, deletePatient, searchPatients
} = require('../controllers/patientController');

router.use(authenticate);

router.get('/search', searchPatients);
router.get('/', getAllPatients);
router.get('/:id', getPatientById);

router.post('/',
  [
    body('first_name').notEmpty().withMessage('First name required'),
    body('last_name').notEmpty().withMessage('Last name required'),
    body('phone').notEmpty().withMessage('Phone required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender required'),
    body('date_of_birth').isDate().withMessage('Valid date of birth required'),
  ],
  validate,
  createPatient
);

router.put('/:id', updatePatient);
router.delete('/:id', authorize('hospital_admin', 'super_admin'), deletePatient);

module.exports = router;
