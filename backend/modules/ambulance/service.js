const { query } = require("../../config/database");

function ambulances(hospitalId) {
  return hospitalId
    ? query(`SELECT * FROM ambulances WHERE hospital_id = ? ORDER BY id DESC`, [hospitalId])
    : query(`SELECT * FROM ambulances ORDER BY id DESC`);
}

function availableAmbulances(hospitalId) {
  if (!hospitalId) {
    return query(
      `SELECT * FROM ambulances
       WHERE LOWER(COALESCE(status, 'available')) = 'available'
       ORDER BY id DESC`
    );
  }
  return query(
    `SELECT * FROM ambulances
     WHERE hospital_id = ? AND LOWER(COALESCE(status, 'available')) = 'available'
     ORDER BY id DESC`,
    [hospitalId]
  );
}

function createAmbulance(payload, hospitalId) {
  return query(
    `INSERT INTO ambulances (hospital_id, vehicle_no, type, driver_name, driver_phone, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      hospitalId || payload.hospital_id,
      payload.vehicle_no,
      payload.type || "basic",
      payload.driver_name || null,
      payload.driver_phone || null,
      payload.status || "available",
    ]
  );
}

function createRequest(payload, hospitalId) {
  // Some schemas define `pickup_time` as DATETIME; UI often sends only "HH:mm".
  let pickupTime = payload.pickup_time || null;
  if (!pickupTime && payload.pickupTime) pickupTime = payload.pickupTime;
  if (pickupTime) {
    const raw = String(pickupTime).trim();
    const timeOnlyMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnlyMatch) {
      const hh = timeOnlyMatch[1].padStart(2, "0");
      const mm = timeOnlyMatch[2];
      const ss = (timeOnlyMatch[3] || "00").padStart(2, "0");
      const today = new Date().toISOString().split("T")[0];
      pickupTime = `${today} ${hh}:${mm}:${ss}`;
    }
  }

  return query(
    `INSERT INTO ambulance_requests (hospital_id, patient_id, pickup_address, drop_address, ambulance_type, pickup_time, contact_phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      hospitalId || payload.hospital_id || null,
      payload.patient_id || null,
      payload.pickup_location || payload.pickup_address || null,
      payload.drop_address || payload.destination || null,
      payload.ambulance_type || payload.type || null,
      pickupTime,
      payload.contact_phone || null,
      payload.status || "pending",
    ]
  );
}

function requests(hospitalId) {
  return hospitalId
    ? query(`SELECT * FROM ambulance_requests WHERE hospital_id = ? ORDER BY created_at DESC, id DESC`, [hospitalId])
    : query(`SELECT * FROM ambulance_requests ORDER BY created_at DESC, id DESC`);
}

async function createPatientRequest(user, payload = {}) {
  const patientId = user?.id || null;
  if (!patientId) throw new Error("Patient not found");

  const pickup_address = payload.pickup_address || payload.pickup_location || payload.pickup || null;
  const hospital_id = payload.hospital_id || payload.hospitalId || null;
  const ambulance_type = payload.ambulance_type || payload.type || "Normal";
  const pickup_time = payload.pickup_time || payload.pickupTime || null;
  const contact_phone = payload.contact_phone || payload.phone || null;

  if (!pickup_address || !hospital_id || !contact_phone) {
    const err = new Error("pickup_address, hospital_id and contact_phone are required");
    err.statusCode = 400;
    throw err;
  }

  // Prevent multiple active requests per patient
  const activeRows = await query(
    `SELECT id, status FROM ambulance_requests
     WHERE patient_id = ? AND status IN ('pending','assigned','enroute','arrived')
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [patientId]
  );
  if (activeRows.length) {
    const err = new Error("You already have an active ambulance request");
    err.statusCode = 409;
    throw err;
  }

  const hospitalRows = await query(
    `SELECT id, name, address FROM hospitals WHERE id = ? AND (is_active = 1 OR is_active IS NULL) LIMIT 1`,
    [hospital_id]
  );
  if (!hospitalRows.length) {
    const err = new Error("Invalid hospital_id");
    err.statusCode = 400;
    throw err;
  }
  const h = hospitalRows[0];
  const drop_address = `${h.name || "Hospital"}${h.address ? ` - ${h.address}` : ""}`;

  await query(
    `INSERT INTO ambulance_requests (hospital_id, patient_id, pickup_address, drop_address, ambulance_type, pickup_time, contact_phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [hospital_id, patientId, pickup_address, drop_address, ambulance_type, pickup_time, contact_phone]
  );

  const latest = await query(
    `SELECT * FROM ambulance_requests WHERE patient_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [patientId]
  );
  return latest[0] || null;
}

async function latestPatientRequest(user) {
  const patientId = user?.id || null;
  if (!patientId) return null;
  const rows = await query(
    `SELECT * FROM ambulance_requests WHERE patient_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [patientId]
  );
  return rows[0] || null;
}

async function hospitalRequests(user, { status } = {}) {
  const hospitalId = user?.hospital_id || null;
  if (!hospitalId) return [];

  const params = [hospitalId];
  let where = "WHERE ar.hospital_id = ?";
  if (status) {
    where += " AND LOWER(ar.status) = ?";
    params.push(String(status).toLowerCase());
  }

  return query(
    `SELECT ar.*, p.full_name AS patient_name
     FROM ambulance_requests ar
     JOIN patients p ON p.id = ar.patient_id
     ${where}
     ORDER BY ar.created_at DESC, ar.id DESC`,
    params
  );
}

async function assignAmbulance(user, { request_id, ambulance_id, eta_minutes = null } = {}) {
  const hospitalId = user?.hospital_id || null;
  if (!hospitalId) throw new Error("Hospital not found");

  const [reqRows, ambRows] = await Promise.all([
    query(`SELECT * FROM ambulance_requests WHERE id = ? AND hospital_id = ? LIMIT 1`, [request_id, hospitalId]),
    query(`SELECT * FROM ambulances WHERE id = ? AND hospital_id = ? LIMIT 1`, [ambulance_id, hospitalId]),
  ]);

  if (!reqRows.length) {
    const err = new Error("Request not found");
    err.statusCode = 404;
    throw err;
  }
  if (!ambRows.length) {
    const err = new Error("Ambulance not found");
    err.statusCode = 404;
    throw err;
  }

  const request = reqRows[0];
  if (String(request.status || "").toLowerCase() !== "pending") {
    const err = new Error("Only pending requests can be assigned");
    err.statusCode = 400;
    throw err;
  }

  const ambulance = ambRows[0];
  if (ambulance.status && String(ambulance.status || "").toLowerCase() !== "available") {
    const err = new Error("Selected ambulance is not available");
    err.statusCode = 400;
    throw err;
  }

  await query(
    `UPDATE ambulance_requests
     SET ambulance_id = ?, driver_name = ?, driver_phone = ?, eta_minutes = ?, status = 'assigned'
     WHERE id = ? AND hospital_id = ?`,
    [
      ambulance_id,
      ambulance.driver_name || null,
      ambulance.driver_phone || null,
      eta_minutes,
      request_id,
      hospitalId,
    ]
  );
  await query(`UPDATE ambulances SET status = 'busy' WHERE id = ? AND hospital_id = ?`, [
    ambulance_id,
    hospitalId,
  ]);

  const rows = await query(`SELECT * FROM ambulance_requests WHERE id = ? LIMIT 1`, [request_id]);
  return rows[0] || null;
}

const STATUS_FLOW = {
  pending: ["assigned"],
  assigned: ["enroute", "en_route"],
  enroute: ["arrived", "completed"],
  en_route: ["arrived", "completed"],
  arrived: ["completed"],
  completed: [],
};

async function updateRequestStatus(user, { request_id, status } = {}) {
  const hospitalId = user?.hospital_id || null;
  if (!hospitalId) throw new Error("Hospital not found");

  const rows = await query(`SELECT * FROM ambulance_requests WHERE id = ? AND hospital_id = ? LIMIT 1`, [
    request_id,
    hospitalId,
  ]);
  if (!rows.length) {
    const err = new Error("Request not found");
    err.statusCode = 404;
    throw err;
  }

  const request = rows[0];
  const current = String(request.status || "pending").toLowerCase();
  const next = String(status || "").toLowerCase();

  if (!STATUS_FLOW[current] || !STATUS_FLOW[current].includes(next)) {
    const err = new Error(`Invalid status transition: ${current} -> ${next}`);
    err.statusCode = 400;
    throw err;
  }

  await query(`UPDATE ambulance_requests SET status = ? WHERE id = ? AND hospital_id = ?`, [
    next,
    request_id,
    hospitalId,
  ]);

  if (next === "completed" && request.ambulance_id) {
    await query(`UPDATE ambulances SET status = 'available' WHERE id = ? AND hospital_id = ?`, [
      request.ambulance_id,
      hospitalId,
    ]);
  }

  const updatedRows = await query(`SELECT * FROM ambulance_requests WHERE id = ? LIMIT 1`, [request_id]);
  return updatedRows[0] || null;
}

module.exports = {
  ambulances,
  availableAmbulances,
  createAmbulance,
  createRequest,
  requests,
  createPatientRequest,
  latestPatientRequest,
  hospitalRequests,
  assignAmbulance,
  updateRequestStatus,
};
