const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn, clearTableColumnsCache } = require("../../services/dbMeta");
const usersService = require("../users/service");

async function ensureDoctorAvailabilityTable() {
  // Generic table for both legacy/int ids and UUID/varchar ids.
  await query(`
    CREATE TABLE IF NOT EXISTS doctor_availability (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      doctor_id VARCHAR(64) NOT NULL,
      available_date DATE NULL,
      available_time TIME NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_doctor_availability_doctor (doctor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // If the table already existed (older schema), ensure required columns exist.
  clearTableColumnsCache("doctor_availability");
  const cols = await getTableColumns("doctor_availability");
  if (!cols) return;

  const addColumnIfMissing = async (name, ddl) => {
    if (cols.has(name)) return;
    await query(`ALTER TABLE doctor_availability ADD COLUMN ${ddl}`);
    cols.add(name);
  };

  // Backward-compatible: some installs created doctor_availability without `available_time`.
  await addColumnIfMissing("available_date", "`available_date` DATE NULL");
  await addColumnIfMissing("available_time", "`available_time` TIME NULL");
  await addColumnIfMissing("status", "`status` VARCHAR(20) NOT NULL DEFAULT 'available'");

  // Ensure unique key exists for ON DUPLICATE KEY behavior (best-effort).
  try {
    await query(
      "ALTER TABLE doctor_availability ADD UNIQUE KEY uniq_doctor_availability_doctor (doctor_id)"
    );
  } catch {
    // ignore if index already exists or cannot be created
  }
}

async function list(hospitalId) {
  const doctorCols = await getTableColumns("doctors");
  if (!doctorCols) return [];

  const doctorIdCol = firstExistingColumn(doctorCols, ["id", "doctor_id"]);
  const doctorHospitalCol = firstExistingColumn(doctorCols, ["hospital_id"]);
  const deptCol = firstExistingColumn(doctorCols, ["department_id", "department"]);
  const specCol = firstExistingColumn(doctorCols, ["specialization"]);
  const nameCol = firstExistingColumn(doctorCols, ["full_name", "name"]);
  const emailCol = firstExistingColumn(doctorCols, ["email"]);
  const phoneCol = firstExistingColumn(doctorCols, ["phone", "mobile"]);

  const select = [
    doctorIdCol ? `d.\`${doctorIdCol}\` AS id` : "d.id AS id",
    nameCol ? `d.\`${nameCol}\` AS name` : "NULL AS name",
    emailCol ? `d.\`${emailCol}\` AS email` : "NULL AS email",
    phoneCol ? `d.\`${phoneCol}\` AS phone` : "NULL AS phone",
    deptCol ? `d.\`${deptCol}\` AS department` : "NULL AS department",
    specCol ? `d.\`${specCol}\` AS specialization` : "NULL AS specialization",
    doctorHospitalCol ? `d.\`${doctorHospitalCol}\` AS hospital_id` : "NULL AS hospital_id",
  ];

  let sql = `SELECT ${select.join(", ")} FROM doctors d`;

  const whereParts = [];
  const params = [];
  if (hospitalId !== null && hospitalId !== undefined) {
    if (doctorHospitalCol) {
      whereParts.push(`d.\`${doctorHospitalCol}\` = ?`);
      params.push(hospitalId);
    }
  }

  if (whereParts.length) {
    sql += ` WHERE ${whereParts.join(" AND ")}`;
  }
  sql += ` ORDER BY d.id DESC`;

  return query(sql, params);
}

async function create(payload, hospitalId) {
  return usersService.create(
    {
      ...payload,
      role: "doctor",
    },
    hospitalId
  );
}

async function getById(id) {
  const rows = await query(`SELECT * FROM doctors WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function update(id, payload) {
  const doctorCols = await getTableColumns("doctors");
  if (!doctorCols) return;

  const updates = [];
  const params = [];
  const hospitalCol = firstExistingColumn(doctorCols, ["hospital_id"]);
  const deptCol = firstExistingColumn(doctorCols, ["department_id", "department"]);
  const specCol = firstExistingColumn(doctorCols, ["specialization"]);

  if (hospitalCol && payload.hospital_id !== undefined) {
    updates.push(`\`${hospitalCol}\` = ?`);
    params.push(payload.hospital_id ?? null);
  }
  if (deptCol && (payload.department_id !== undefined || payload.department !== undefined)) {
    updates.push(`\`${deptCol}\` = ?`);
    params.push(payload.department_id || payload.department || null);
  }
  if (specCol && payload.specialization !== undefined) {
    updates.push(`\`${specCol}\` = ?`);
    params.push(payload.specialization || null);
  }

  if (!updates.length) return;
  params.push(id);
  await query(`UPDATE doctors SET ${updates.join(", ")} WHERE id = ?`, params);
}

function remove(id) {
  return query(`DELETE FROM doctors WHERE id = ?`, [id]);
}

function appointments(id) {
  return query(
    `SELECT a.*, p.full_name AS patient_name
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     WHERE a.doctor_id = ?
     ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
    [id]
  );
}

async function schedule(id) {
  return { doctor_id: Number(id), message: "Schedule is managed in doctor_availability/doctor_slots tables." };
}

async function updateSchedule(id, payload) {
  return { doctor_id: Number(id), updated: true, payload };
}

async function updateAvailability(payload, actor) {
  await ensureDoctorAvailabilityTable();

  const doctorId = payload?.doctor_id;
  if (!doctorId) throw new Error("Doctor id is required");

  // Hospital admins must only update doctors within their hospital.
  const actorRole = String(actor?.role || "").toLowerCase().trim();
  if (actorRole === "hospital_admin") {
    const doctorCols = await getTableColumns("doctors");
    const doctorIdCol = firstExistingColumn(doctorCols, ["id", "doctor_id"]);
    const hospitalCol = firstExistingColumn(doctorCols, ["hospital_id"]);
    if (doctorCols && doctorIdCol && hospitalCol) {
      const rows = await query(
        `SELECT \`${hospitalCol}\` AS hospital_id FROM doctors WHERE \`${doctorIdCol}\` = ? LIMIT 1`,
        [doctorId]
      );
      if (!rows.length) throw new Error("Doctor not found");
      if (String(rows[0]?.hospital_id ?? "") !== String(actor?.hospital_id ?? "")) {
        throw new Error("Forbidden");
      }
    }
  }

  await query(
    `INSERT INTO doctor_availability (doctor_id, available_date, available_time, status)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE available_date = VALUES(available_date), available_time = VALUES(available_time), status = VALUES(status)`,
    [
      String(doctorId),
      payload.available_date || null,
      payload.available_time || null,
      payload.status || "available",
    ]
  );
}

module.exports = { list, create, getById, update, remove, appointments, schedule, updateSchedule, updateAvailability };
