const { pool } = require("../config/database");
const { successResponse, errorResponse } = require("../utils/response");

const resolvePatient = async (user) => {
  if (!user?.email) return null;

  // Prefer matching by hospital_id if present; otherwise fall back to email-only lookup.
  if (user?.hospital_id) {
    const [rows] = await pool.execute(
      `
        SELECT id, hospital_id
        FROM patients
        WHERE hospital_id = ? AND LOWER(email) = LOWER(?)
        ORDER BY id DESC
        LIMIT 1
      `,
      [user.hospital_id, user.email]
    );
    return rows[0] || null;
  }

  const [rows] = await pool.execute(
    `
      SELECT id, hospital_id
      FROM patients
      WHERE LOWER(email) = LOWER(?)
      ORDER BY id DESC
      LIMIT 1
    `,
    [user.email]
  );
  return rows[0] || null;
};

const createRequest = async (req, res) => {
  try {
    const patient = await resolvePatient(req.user);
    const hospitalId = req.user?.hospital_id || patient?.hospital_id || req.body.hospital_id || null;
    const patientId = patient?.id || null;

    if (!hospitalId || !patientId) {
      return errorResponse(res, "Patient profile not found", 400);
    }

    const pickupAddress =
      req.body.pickup_address ||
      req.body.pickup_location ||
      req.body.pickupAddress ||
      null;
    const dropAddress =
      req.body.drop_address ||
      req.body.destination ||
      req.body.dropAddress ||
      null;
    const ambulanceType =
      req.body.ambulance_type || req.body.type || req.body.ambulanceType || null;
    const pickupTime = req.body.pickup_time || req.body.pickupTime || null;
    const contactPhone =
      req.body.contact_phone || req.body.contactPhone || req.body.phone || null;

    if (!pickupAddress || !dropAddress || !contactPhone) {
      return errorResponse(res, "Missing required fields", 400);
    }

    const [result] = await pool.execute(
      `
        INSERT INTO ambulance_requests
          (hospital_id, patient_id, pickup_address, drop_address, ambulance_type, pickup_time, contact_phone, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        hospitalId,
        patientId,
        pickupAddress,
        dropAddress,
        ambulanceType,
        pickupTime,
        contactPhone,
      ]
    );

    return successResponse(
      res,
      { request_id: result.insertId || null },
      "Ambulance requested successfully",
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create ambulance request: " + error.message);
  }
};

const getMyRequests = async (req, res) => {
  try {
    const patient = await resolvePatient(req.user);
    const hospitalId = req.user?.hospital_id || patient?.hospital_id || null;
    const patientId = patient?.id || null;
    if (!patientId) return successResponse(res, []);

    const [rows] = hospitalId
      ? await pool.execute(
          `
            SELECT *
            FROM ambulance_requests
            WHERE hospital_id = ? AND patient_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 10
          `,
          [hospitalId, patientId]
        )
      : await pool.execute(
          `
            SELECT *
            FROM ambulance_requests
            WHERE patient_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 10
          `,
          [patientId]
        );

    return successResponse(res, rows);
  } catch (error) {
    return errorResponse(res, "Failed to fetch ambulance requests: " + error.message);
  }
};

module.exports = { createRequest, getMyRequests };
