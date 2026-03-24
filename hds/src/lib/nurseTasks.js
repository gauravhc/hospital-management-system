import db from "@/lib/db";

const ensureNurseTasksTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS nurse_tasks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      nurse_id INT NOT NULL,
      hospital_id INT NULL,
      patient_id INT NULL,
      appointment_id INT NULL,
      task_title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      updated_value TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_nurse_tasks_nurse_id (nurse_id),
      INDEX idx_nurse_tasks_hospital_id (hospital_id),
      INDEX idx_nurse_tasks_patient_id (patient_id)
    )
  `);
};

const resolveNurse = async (user) => {
  if (!user) return null;
  const params = [];
  const conditions = [];

  if (user.id) {
    conditions.push("id = ?");
    params.push(user.id);
  }
  if (user.email) {
    conditions.push("LOWER(email) = LOWER(?)");
    params.push(user.email);
  }
  if (!conditions.length) return null;

  const [rows] = await db.query(
    `
      SELECT id, hospital_id, full_name, email, phone
      FROM nurses
      WHERE ${conditions.join(" OR ")}
      ORDER BY id DESC
      LIMIT 1
    `,
    params
  );

  return rows[0] || null;
};

const seedTasksIfEmpty = async (nurse) => {
  const [[countRow]] = await db.query(
    "SELECT COUNT(*) AS total FROM nurse_tasks WHERE nurse_id = ?",
    [nurse.id]
  );

  if (Number(countRow?.total || 0) > 0) return;

  const [appointments] = await db.query(
    `
      SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time, p.full_name AS patient_name
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      WHERE (? IS NULL OR a.hospital_id = ?)
      ORDER BY a.appointment_date DESC, a.id DESC
      LIMIT 5
    `,
    [nurse.hospital_id || null, nurse.hospital_id || null]
  );

  if (appointments.length) {
    for (const appointment of appointments) {
      await db.query(
        `
          INSERT INTO nurse_tasks (nurse_id, hospital_id, patient_id, appointment_id, task_title, description, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `,
        [
          nurse.id,
          nurse.hospital_id || null,
          appointment.patient_id || null,
          appointment.id,
          "Vitals Check",
          `Record vitals for ${appointment.patient_name || "patient"} on ${appointment.appointment_date}`,
        ]
      );
    }
    return;
  }

  await db.query(
    `
      INSERT INTO nurse_tasks (nurse_id, hospital_id, task_title, description, status)
      VALUES (?, ?, 'Ward Round', 'Review assigned patients and update observations.', 'pending')
    `,
    [nurse.id, nurse.hospital_id || null]
  );
};

export const getNurseTasks = async (user) => {
  await ensureNurseTasksTable();
  const nurse = await resolveNurse(user);
  if (!nurse) return [];

  await seedTasksIfEmpty(nurse);

  const [rows] = await db.query(
    `
      SELECT
        nt.id AS task_id,
        nt.task_title,
        nt.description,
        nt.status,
        nt.updated_value,
        nt.patient_id,
        p.full_name AS patient_name,
        nt.created_at
      FROM nurse_tasks nt
      LEFT JOIN patients p ON p.id = nt.patient_id
      WHERE nt.nurse_id = ?
      ORDER BY
        CASE WHEN LOWER(nt.status) = 'pending' THEN 0 ELSE 1 END,
        nt.updated_at DESC,
        nt.id DESC
    `,
    [nurse.id]
  );

  return rows.map((row) => ({
    ...row,
    patient_id: row.patient_id ? String(row.patient_id) : "",
    patient_name: row.patient_name || "Unassigned patient",
    description: row.description || "",
    status: row.status || "pending",
    updated_value: row.updated_value || "",
  }));
};

export const updateNurseTask = async (user, taskId, updatedValue) => {
  await ensureNurseTasksTable();
  const nurse = await resolveNurse(user);
  if (!nurse) return { affectedRows: 0 };

  const [result] = await db.query(
    `
      UPDATE nurse_tasks
      SET updated_value = ?, status = 'completed'
      WHERE id = ? AND nurse_id = ?
    `,
    [updatedValue, taskId, nurse.id]
  );

  return result;
};
