const { pool } = require("../config/database");
const { successResponse, errorResponse } = require("../utils/response");

const getScopedHospitalId = (req) => {
  if (req.user?.role === "super_admin") {
    return req.query?.hospital_id || req.body?.hospital_id || req.user?.hospital_id || null;
  }
  return req.user?.hospital_id || null;
};

const listRequests = async (req, res) => {
  try {
    const hospitalId = getScopedHospitalId(req);
    if (!hospitalId) return errorResponse(res, "Hospital not found", 400);

    const status = String(req.query.status || "pending").trim().toLowerCase();
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);

    const [rows] = await pool.execute(
      `
        SELECT ar.*,
               CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,'')) AS patient_name,
               p.phone AS patient_phone
        FROM ambulance_requests ar
        LEFT JOIN patients p ON p.id = ar.patient_id
        WHERE ar.hospital_id = ? AND LOWER(ar.status) = ?
        ORDER BY ar.created_at DESC, ar.id DESC
        LIMIT ${limit}
      `,
      [hospitalId, status]
    );

    return successResponse(res, rows);
  } catch (error) {
    return errorResponse(res, "Failed to fetch requests: " + error.message);
  }
};

const listAvailableAmbulances = async (req, res) => {
  try {
    const hospitalId = getScopedHospitalId(req);
    if (!hospitalId) return errorResponse(res, "Hospital not found", 400);

    const [rows] = await pool.execute(
      `
        SELECT id, vehicle_no, type, driver_name, driver_phone, status
        FROM ambulances
        WHERE hospital_id = ? AND LOWER(status) = 'available'
        ORDER BY vehicle_no
      `,
      [hospitalId]
    );

    return successResponse(res, rows);
  } catch (error) {
    return errorResponse(res, "Failed to fetch ambulances: " + error.message);
  }
};

const assignAmbulance = async (req, res) => {
  try {
    const hospitalId = getScopedHospitalId(req);
    if (!hospitalId) return errorResponse(res, "Hospital not found", 400);

    const requestId = req.params.id;
    const ambulanceId = req.body.ambulance_id || req.body.ambulanceId || null;
    const driverName = req.body.driver_name || req.body.driverName || null;
    const driverPhone = req.body.driver_phone || req.body.driverPhone || null;
    const etaMinutes = req.body.eta_minutes ?? req.body.etaMinutes ?? null;

    if (!requestId || !ambulanceId) {
      return errorResponse(res, "Missing request id or ambulance id", 400);
    }

    const [reqRows] = await pool.execute(
      `SELECT id, status FROM ambulance_requests WHERE id = ? AND hospital_id = ? LIMIT 1`,
      [requestId, hospitalId]
    );
    if (!reqRows.length) return errorResponse(res, "Request not found", 404);

    const [ambRows] = await pool.execute(
      `SELECT id, status, driver_name, driver_phone FROM ambulances WHERE id = ? AND hospital_id = ? LIMIT 1`,
      [ambulanceId, hospitalId]
    );
    if (!ambRows.length) return errorResponse(res, "Ambulance not found", 404);
    if (String(ambRows[0].status || "").toLowerCase() !== "available") {
      return errorResponse(res, "Ambulance is not available", 400);
    }

    const resolvedDriverName = driverName || ambRows[0].driver_name || null;
    const resolvedDriverPhone = driverPhone || ambRows[0].driver_phone || null;

    await pool.execute(
      `
        UPDATE ambulance_requests
        SET ambulance_id = ?, driver_name = ?, driver_phone = ?, eta_minutes = ?, status = 'assigned'
        WHERE id = ? AND hospital_id = ?
      `,
      [
        ambulanceId,
        resolvedDriverName,
        resolvedDriverPhone,
        etaMinutes ?? null,
        requestId,
        hospitalId,
      ]
    );

    // src schema uses status enum: available/dispatched/maintenance/out_of_service
    await pool.execute(
      `UPDATE ambulances SET status = 'dispatched' WHERE id = ? AND hospital_id = ?`,
      [ambulanceId, hospitalId]
    );

    return successResponse(res, {}, "Ambulance assigned");
  } catch (error) {
    return errorResponse(res, "Failed to assign ambulance: " + error.message);
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const hospitalId = getScopedHospitalId(req);
    if (!hospitalId) return errorResponse(res, "Hospital not found", 400);

    const requestId = req.params.id;
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!requestId || !status) return errorResponse(res, "Missing request id or status", 400);

    const [rows] = await pool.execute(
      `SELECT id, ambulance_id FROM ambulance_requests WHERE id = ? AND hospital_id = ? LIMIT 1`,
      [requestId, hospitalId]
    );
    if (!rows.length) return errorResponse(res, "Request not found", 404);

    const ambulanceId = rows[0].ambulance_id || null;

    if (status === "enroute" || status === "en_route") {
      await pool.execute(
        `UPDATE ambulance_requests SET status = 'enroute' WHERE id = ? AND hospital_id = ?`,
        [requestId, hospitalId]
      );
      return successResponse(res, {}, "Trip started");
    }

    if (status === "completed") {
      await pool.execute(
        `UPDATE ambulance_requests SET status = 'completed' WHERE id = ? AND hospital_id = ?`,
        [requestId, hospitalId]
      );
      if (ambulanceId) {
        await pool.execute(
          `UPDATE ambulances SET status = 'available' WHERE id = ? AND hospital_id = ?`,
          [ambulanceId, hospitalId]
        );
      }
      return successResponse(res, {}, "Trip completed");
    }

    return errorResponse(res, "Unsupported status transition", 400);
  } catch (error) {
    return errorResponse(res, "Failed to update status: " + error.message);
  }
};

module.exports = {
  listRequests,
  listAvailableAmbulances,
  assignAmbulance,
  updateRequestStatus,
};

