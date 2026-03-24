const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllNurses, getNurseById, createNurse, updateNurse, deleteNurse, getShiftSchedule
} = require('../controllers/nurseController');

router.use(authenticate);

router.get('/', getAllNurses);
router.get('/shift-schedule', getShiftSchedule);
router.get('/:id', getNurseById);

router.post('/',
  authorize('hospital_admin', 'super_admin'),
  [
    body('first_name').notEmpty(),
    body('last_name').notEmpty(),
    body('email').isEmail(),
    body('phone').notEmpty(),
  ],
  validate,
  createNurse
);

router.put('/:id', authorize('hospital_admin', 'super_admin'), updateNurse);
router.delete('/:id', authorize('hospital_admin', 'super_admin'), deleteNurse);

module.exports = router;
