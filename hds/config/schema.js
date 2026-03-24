const db = require("./db");

const hasTable = async (tableName) => {
  const [rows] = await db.execute("SHOW TABLES LIKE ?", [tableName]);
  return rows.length > 0;
};

const hasColumn = async (tableName, columnName) => {
  const [rows] = await db.execute(
    `
    SELECT 1 AS ok
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );
  return rows.length > 0;
};

const addColumnIfMissing = async (tableName, columnName, definition) => {
  const exists = await hasColumn(tableName, columnName);
  if (!exists) {
    await db.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  }
};

const ensureHospitalsSchema = async () => {
  const tableExists = await hasTable("hospitals");
  if (!tableExists) {
    await db.execute(
      `
      CREATE TABLE hospitals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150),
        address TEXT,
        gst_number VARCHAR(50),
        certification VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
    );
    return;
  }

  await addColumnIfMissing("hospitals", "name", "VARCHAR(150)");
  await addColumnIfMissing("hospitals", "address", "TEXT");
  await addColumnIfMissing("hospitals", "gst_number", "VARCHAR(50)");
  await addColumnIfMissing("hospitals", "certification", "VARCHAR(255)");
  await addColumnIfMissing("hospitals", "phone", "VARCHAR(20)");
  await addColumnIfMissing("hospitals", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
};

const ensureDoctorsSchema = async () => {
  const tableExists = await hasTable("doctors");
  if (!tableExists) return;

  await addColumnIfMissing("doctors", "doctor_id", "INT");
  await addColumnIfMissing("doctors", "hospital_id", "INT");
  await addColumnIfMissing("doctors", "name", "VARCHAR(150)");
  await addColumnIfMissing("doctors", "specialization", "VARCHAR(150)");
  await addColumnIfMissing("doctors", "email", "VARCHAR(150)");
  await addColumnIfMissing("doctors", "phone", "VARCHAR(20)");
};

const ensureAppointmentsSchema = async () => {
  const tableExists = await hasTable("appointments");
  if (!tableExists) return;
  await addColumnIfMissing("appointments", "hospital_id", "INT");
};

const ensureDoctorAvailabilitySchema = async () => {
  await db.execute(
    `
    CREATE TABLE IF NOT EXISTS doctor_availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      doctor_id INT,
      available_date DATE,
      start_time TIME,
      end_time TIME
    )
    `
  );
};

const ensureSchema = async () => {
  await ensureHospitalsSchema();
  await ensureDoctorsSchema();
  await ensureAppointmentsSchema();
  await ensureDoctorAvailabilitySchema();
};

module.exports = {
  ensureSchema,
};
