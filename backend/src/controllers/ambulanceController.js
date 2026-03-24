const { pool } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/response');
const { auditLog } = require('../utils/auditLog');

// GET /api/ambulances
const getAllAmbulances = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    const offset = (page - 1) * limit;
    const hospitalId = req.user.hospital_id;

    let where = 'WHERE a.hospital_id = ?';
    const params = [hospitalId];

    if (status) { where += ' AND a.status = ?'; params.push(status); }
    if (type) { where += ' AND a.type = ?'; params.push(type); }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM ambulances a ${where}`, params
    );

    const [ambulances] = await pool.execute(
      `SELECT a.*,
              (SELECT COUNT(*) FROM ambulance_dispatches d WHERE d.ambulance_id = a.id AND d.status = 'completed') AS total_dispatches
       FROM ambulances a
       ${where}
       ORDER BY a.status ASC, a.vehicle_no ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const formatted = ambulances.map(amb => ({
      ...amb,
      equipment: amb.equipment ? JSON.parse(amb.equipment) : [],
    }));

    return paginatedResponse(res, formatted, buildPagination(total, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to fetch ambulances: ' + error.message);
  }
};

// GET /api/ambulances/:id
const getAmbulanceById = async (req, res) => {
  try {
    const [ambulances] = await pool.execute(
      `SELECT a.* FROM ambulances a WHERE a.id = ? AND a.hospital_id = ?`,
      [req.params.id, req.user.hospital_id]
    );
    if (!ambulances.length) return errorResponse(res, 'Ambulance not found', 404);

    const amb = ambulances[0];
    amb.equipment = amb.equipment ? JSON.parse(amb.equipment) : [];

    // Recent dispatches
    const [dispatches] = await pool.execute(
      `SELECT ad.*, p.first_name, p.last_name
       FROM ambulance_dispatches ad
       LEFT JOIN patients p ON ad.patient_id = p.id
       WHERE ad.ambulance_id = ?
       ORDER BY ad.created_at DESC
       LIMIT 5`,
      [req.params.id]
    );

    return successResponse(res, { ...amb, recent_dispatches: dispatches });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch ambulance: ' + error.message);
  }
};

// POST /api/ambulances
const createAmbulance = async (req, res) => {
  try {
    const {
      vehicle_no, type, model, year, driver_name, driver_phone,
      driver_user_id, equipment, last_service_date, next_service_date
    } = req.body;
    const hospitalId = req.user.hospital_id;

    await pool.execute(
      `INSERT INTO ambulances (hospital_id, vehicle_no, type, model, year, driver_name, driver_phone,
        driver_user_id, equipment, last_service_date, next_service_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hospitalId, vehicle_no, type || 'basic', model, year, driver_name, driver_phone,
       driver_user_id || null, equipment ? JSON.stringify(equipment) : null,
       last_service_date, next_service_date]
    );

    await auditLog({ hospitalId, userId: req.user.id, action: 'CREATE_AMBULANCE', entity: 'ambulances', newValues: { vehicle_no }, req });

    return successResponse(res, {}, 'Ambulance added successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add ambulance: ' + error.message);
  }
};

// PUT /api/ambulances/:id
const updateAmbulance = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_no, type, model, year, driver_name, driver_phone,
            driver_user_id, status, current_location, latitude, longitude,
            equipment, last_service_date, next_service_date } = req.body;

    const [existing] = await pool.execute(
      `SELECT id FROM ambulances WHERE id = ? AND hospital_id = ?`,
      [id, req.user.hospital_id]
    );
    if (!existing.length) return errorResponse(res, 'Ambulance not found', 404);

    await pool.execute(
      `UPDATE ambulances SET vehicle_no=?, type=?, model=?, year=?, driver_name=?, driver_phone=?,
        driver_user_id=?, status=?, current_location=?, latitude=?, longitude=?,
        equipment=?, last_service_date=?, next_service_date=?
       WHERE id=?`,
      [vehicle_no, type, model, year, driver_name, driver_phone, driver_user_id || null,
       status, current_location, latitude, longitude,
       equipment ? JSON.stringify(equipment) : null,
       last_service_date, next_service_date, id]
    );

    return successResponse(res, {}, 'Ambulance updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update ambulance: ' + error.message);
  }
};

// DELETE /api/ambulances/:id
const deleteAmbulance = async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE ambulances SET status = 'out_of_service' WHERE id = ? AND hospital_id = ?`,
      [req.params.id, req.user.hospital_id]
    );
    if (!result.affectedRows) return errorResponse(res, 'Ambulance not found', 404);

    return successResponse(res, {}, 'Ambulance marked out of service');
  } catch (error) {
    return errorResponse(res, 'Failed to remove ambulance: ' + error.message);
  }
};

// ── DISPATCH MANAGEMENT ─────────────────────────────────

// POST /api/ambulances/dispatch
const dispatchAmbulance = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const {
      ambulance_id, patient_id, caller_name, caller_phone, pickup_location,
      pickup_lat, pickup_lng, destination, emergency_type, priority
    } = req.body;
    const hospitalId = req.user.hospital_id;

    // Check ambulance availability
    const [[ambulance]] = await connection.execute(
      `SELECT id, status FROM ambulances WHERE id = ? AND hospital_id = ?`,
      [ambulance_id, hospitalId]
    );
    if (!ambulance) return errorResponse(res, 'Ambulance not found', 404);
    if (ambulance.status !== 'available') {
      return errorResponse(res, `Ambulance is not available (status: ${ambulance.status})`, 400);
    }

    // Create dispatch record
    await connection.execute(
      `INSERT INTO ambulance_dispatches (hospital_id, ambulance_id, patient_id, caller_name,
        caller_phone, pickup_location, pickup_lat, pickup_lng, destination,
        emergency_type, priority, status, dispatched_at, dispatched_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dispatched', NOW(), ?)`,
      [hospitalId, ambulance_id, patient_id || null, caller_name, caller_phone,
       pickup_location, pickup_lat, pickup_lng, destination, emergency_type, priority || 'high',
       req.user.id]
    );

    // Update ambulance status
    await connection.execute(
      `UPDATE ambulances SET status = 'dispatched' WHERE id = ?`,
      [ambulance_id]
    );

    await connection.commit();

    await auditLog({
      hospitalId, userId: req.user.id,
      action: 'DISPATCH_AMBULANCE', entity: 'ambulances', entityId: ambulance_id,
      newValues: { pickup_location, emergency_type, priority }, req,
    });

    return successResponse(res, {}, 'Ambulance dispatched successfully', 201);
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 'Dispatch failed: ' + error.message);
  } finally {
    connection.release();
  }
};

// PUT /api/ambulances/dispatch/:dispatchId/status
const updateDispatchStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { dispatchId } = req.params;
    const { status } = req.body; // arrived, completed, cancelled

    const [[dispatch]] = await connection.execute(
      `SELECT * FROM ambulance_dispatches WHERE id = ? AND hospital_id = ?`,
      [dispatchId, req.user.hospital_id]
    );
    if (!dispatch) return errorResponse(res, 'Dispatch not found', 404);

    let updateFields = 'status = ?';
    const updateParams = [status];

    if (status === 'arrived') { updateFields += ', arrived_at = NOW()'; }
    if (status === 'completed') { updateFields += ', completed_at = NOW()'; }

    await connection.execute(
      `UPDATE ambulance_dispatches SET ${updateFields} WHERE id = ?`,
      [...updateParams, dispatchId]
    );

    // If completed/cancelled, make ambulance available again
    if (['completed', 'cancelled'].includes(status)) {
      await connection.execute(
        `UPDATE ambulances SET status = 'available' WHERE id = ?`,
        [dispatch.ambulance_id]
      );
    }

    await connection.commit();
    return successResponse(res, {}, `Dispatch status updated to ${status}`);
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 'Failed to update dispatch: ' + error.message);
  } finally {
    connection.release();
  }
};

// GET /api/ambulances/dispatches  — dispatch history
const getDispatches = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE ad.hospital_id = ?';
    const params = [req.user.hospital_id];
    if (status) { where += ' AND ad.status = ?'; params.push(status); }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM ambulance_dispatches ad ${where}`, params
    );

    const [dispatches] = await pool.execute(
      `SELECT ad.*, a.vehicle_no, a.type AS ambulance_type,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name
       FROM ambulance_dispatches ad
       JOIN ambulances a ON ad.ambulance_id = a.id
       LEFT JOIN patients p ON ad.patient_id = p.id
       ${where}
       ORDER BY ad.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return paginatedResponse(res, dispatches, buildPagination(total, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to fetch dispatches: ' + error.message);
  }
};

module.exports = {
  getAllAmbulances, getAmbulanceById, createAmbulance, updateAmbulance, deleteAmbulance,
  dispatchAmbulance, updateDispatchStatus, getDispatches
};
