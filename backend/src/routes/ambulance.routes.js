const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllAmbulances, getAmbulanceById, createAmbulance, updateAmbulance, deleteAmbulance,
  dispatchAmbulance, updateDispatchStatus, getDispatches
} = require('../controllers/ambulanceController');

router.use(authenticate);

router.get('/', getAllAmbulances);
router.get('/dispatches', getDispatches);
router.get('/:id', getAmbulanceById);

// Dispatch
router.post('/dispatch',
  [
    body('ambulance_id').notEmpty().withMessage('Ambulance ID required'),
    body('caller_phone').notEmpty().withMessage('Caller phone required'),
    body('pickup_location').notEmpty().withMessage('Pickup location required'),
  ],
  validate,
  dispatchAmbulance
);

router.put('/dispatch/:dispatchId/status',
  [body('status').isIn(['arrived', 'completed', 'cancelled'])],
  validate,
  updateDispatchStatus
);

// Ambulance management (admin only)
router.post('/',
  authorize('hospital_admin', 'super_admin'),
  [
    body('vehicle_no').notEmpty().withMessage('Vehicle number required'),
    body('driver_name').notEmpty().withMessage('Driver name required'),
    body('driver_phone').notEmpty().withMessage('Driver phone required'),
  ],
  validate,
  createAmbulance
);

router.put('/:id', authorize('hospital_admin', 'super_admin'), updateAmbulance);
router.delete('/:id', authorize('hospital_admin', 'super_admin'), deleteAmbulance);

module.exports = router;
