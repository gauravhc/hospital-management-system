const { query } = require("../config/database");
const { getSchemaMode } = require("./schemaMode.service");
const { getTableColumns, clearTableColumnsCache } = require("./dbMeta");

const statements = [
  `
    CREATE TABLE IF NOT EXISTS hospitals (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      name VARCHAR(255) NOT NULL,
      type_of_hospital ENUM('Hospital','Clinic','Lab','Pharmacy') DEFAULT 'Hospital',
      address TEXT NULL,
      phone VARCHAR(20) NULL,
      email VARCHAR(100) NULL UNIQUE,
      website VARCHAR(255) NULL,
      license_no VARCHAR(100) NULL UNIQUE,
      license_document VARCHAR(255) NULL,
      verification_status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
      bed_capacity INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS roles (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(50) NOT NULL UNIQUE,
      display_name VARCHAR(100) NULL,
      permissions JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NULL,
      role_id INT NOT NULL,
      employee_id VARCHAR(50) NULL UNIQUE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NULL,
      status ENUM('active','inactive','suspended') DEFAULT 'active',
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_hospital (hospital_id),
      CONSTRAINT fk_users_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
      CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS doctors (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id VARCHAR(36) NOT NULL UNIQUE,
      hospital_id VARCHAR(36) NOT NULL,
      department_id VARCHAR(36) NULL,
      specialization VARCHAR(150) NULL,
      qualification VARCHAR(255) NULL,
      experience_years INT DEFAULT 0,
      license_number VARCHAR(100) NULL UNIQUE,
      consultation_fee DECIMAL(10,2) DEFAULT 0.00,
      available_days JSON NULL,
      available_time_from TIME NULL,
      available_time_to TIME NULL,
      max_patients_per_day INT DEFAULT 20,
      bio TEXT NULL,
      is_available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_doctors_hospital (hospital_id),
      CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_doctors_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS nurses (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id VARCHAR(36) NOT NULL UNIQUE,
      hospital_id VARCHAR(36) NOT NULL,
      department_id VARCHAR(36) NULL,
      qualification VARCHAR(255) NULL,
      license_number VARCHAR(100) NULL UNIQUE,
      shift ENUM('morning','afternoon','night','rotating') DEFAULT 'morning',
      ward_assigned VARCHAR(100) NULL,
      experience_years INT DEFAULT 0,
      is_head_nurse BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_nurses_hospital (hospital_id),
      CONSTRAINT fk_nurses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_nurses_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS patients (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      patient_id_no VARCHAR(50) NULL UNIQUE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(20) NOT NULL,
      gender ENUM('male','female','other') NOT NULL,
      date_of_birth DATE NOT NULL,
      blood_group VARCHAR(5) NULL,
      address TEXT NULL,
      emergency_contact_name VARCHAR(150) NULL,
      emergency_contact_phone VARCHAR(20) NULL,
      emergency_contact_relation VARCHAR(50) NULL,
      allergies TEXT NULL,
      chronic_conditions TEXT NULL,
      insurance_provider VARCHAR(150) NULL,
      insurance_policy_no VARCHAR(100) NULL,
      status ENUM('active','inactive','deceased') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_patients_hospital (hospital_id),
      CONSTRAINT fk_patients_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS appointments (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      doctor_id VARCHAR(36) NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      type ENUM('consultation','follow_up','emergency','routine') DEFAULT 'consultation',
      status ENUM('scheduled','confirmed','in_progress','completed','cancelled','no_show') DEFAULT 'scheduled',
      chief_complaint TEXT NULL,
      notes TEXT NULL,
      cancelled_reason TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_appointments_hospital (hospital_id),
      CONSTRAINT fk_appointments_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS ambulances (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      vehicle_no VARCHAR(50) NOT NULL UNIQUE,
      type ENUM('basic','advanced','icu','oxygen','cardiac','air','neonatal') DEFAULT 'basic',
      model VARCHAR(100) NULL,
      year YEAR NULL,
      driver_name VARCHAR(150) NULL,
      driver_phone VARCHAR(20) NULL,
      status ENUM('available','dispatched','maintenance','out_of_service') DEFAULT 'available',
      current_location VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ambulances_hospital (hospital_id),
      CONSTRAINT fk_ambulances_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS ambulance_dispatches (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      ambulance_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NULL,
      caller_name VARCHAR(150) NULL,
      caller_phone VARCHAR(20) NOT NULL,
      pickup_location TEXT NOT NULL,
      destination TEXT NULL,
      emergency_type VARCHAR(100) NULL,
      priority ENUM('low','medium','high','critical') DEFAULT 'high',
      status ENUM('requested','dispatched','en_route','arrived','completed','cancelled') DEFAULT 'requested',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ambulance_dispatches_hospital (hospital_id),
      CONSTRAINT fk_dispatch_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      CONSTRAINT fk_dispatch_ambulance FOREIGN KEY (ambulance_id) REFERENCES ambulances(id) ON DELETE CASCADE,
      CONSTRAINT fk_dispatch_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS ambulance_requests (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      pickup_address TEXT NOT NULL,
      drop_address TEXT NOT NULL,
      ambulance_type VARCHAR(50) NULL,
      pickup_time VARCHAR(50) NULL,
      contact_phone VARCHAR(20) NOT NULL,
      status VARCHAR(30) DEFAULT 'pending',
      ambulance_id VARCHAR(36) NULL,
      driver_name VARCHAR(150) NULL,
      driver_phone VARCHAR(20) NULL,
      eta_minutes INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ambulance_requests_hospital (hospital_id),
      INDEX idx_ambulance_requests_patient (patient_id),
      INDEX idx_ambulance_requests_status (status),
      CONSTRAINT fk_ambulance_requests_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      CONSTRAINT fk_ambulance_requests_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      CONSTRAINT fk_ambulance_requests_ambulance FOREIGN KEY (ambulance_id) REFERENCES ambulances(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS attendance (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      date DATE NOT NULL,
      check_in TIMESTAMP NULL,
      check_out TIMESTAMP NULL,
      status ENUM('present','absent','half_day','late','on_leave') DEFAULT 'present',
      notes TEXT NULL,
      marked_by VARCHAR(36) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_attendance (user_id, date),
      INDEX idx_attendance_hospital (hospital_id),
      CONSTRAINT fk_attendance_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS nurse_tasks (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      nurse_id VARCHAR(36) NOT NULL,
      hospital_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status ENUM('pending','in_progress','completed') DEFAULT 'pending',
      due_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_nurse_tasks_nurse (nurse_id),
      INDEX idx_nurse_tasks_hospital (hospital_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS lab_tests (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      doctor_id VARCHAR(36) NULL,
      test_name VARCHAR(255) NOT NULL,
      test_code VARCHAR(100) NULL,
      category VARCHAR(100) NULL,
      price DECIMAL(10,2) DEFAULT 0.00,
      status ENUM('ordered','in_progress','completed','cancelled') DEFAULT 'ordered',
      notes TEXT NULL,
      ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_lab_tests_hospital (hospital_id),
      INDEX idx_lab_tests_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS lab_reports (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      doctor_id VARCHAR(36) NULL,
      test_id VARCHAR(36) NULL,
      title VARCHAR(255) NOT NULL,
      findings TEXT NULL,
      result_summary TEXT NULL,
      file_url VARCHAR(500) NULL,
      status ENUM('draft','final') DEFAULT 'final',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_lab_reports_hospital (hospital_id),
      INDEX idx_lab_reports_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS pharmacy_medicines (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) NULL,
      category VARCHAR(100) NULL,
      unit_price DECIMAL(10,2) DEFAULT 0.00,
      stock_quantity INT DEFAULT 0,
      reorder_level INT DEFAULT 0,
      expiry_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pharmacy_medicines_hospital (hospital_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS pharmacy_orders (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NULL,
      doctor_id VARCHAR(36) NULL,
      medicine_id VARCHAR(36) NULL,
      quantity INT NOT NULL DEFAULT 1,
      total_amount DECIMAL(10,2) DEFAULT 0.00,
      status ENUM('pending','dispensed','cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pharmacy_orders_hospital (hospital_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS inventory_items (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) NULL,
      category VARCHAR(100) NULL,
      quantity INT DEFAULT 0,
      reorder_level INT DEFAULT 0,
      unit VARCHAR(50) NULL,
      unit_cost DECIMAL(10,2) DEFAULT 0.00,
      supplier_name VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_inventory_items_hospital (hospital_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      appointment_id VARCHAR(36) NULL,
      invoice_number VARCHAR(100) UNIQUE,
      subtotal DECIMAL(10,2) DEFAULT 0.00,
      tax_amount DECIMAL(10,2) DEFAULT 0.00,
      discount_amount DECIMAL(10,2) DEFAULT 0.00,
      total_amount DECIMAL(10,2) DEFAULT 0.00,
      status ENUM('draft','issued','paid','cancelled') DEFAULT 'issued',
      due_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_invoices_hospital (hospital_id),
      INDEX idx_invoices_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      invoice_id VARCHAR(36) NULL,
      patient_id VARCHAR(36) NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      reference_no VARCHAR(100) NULL,
      status ENUM('pending','completed','failed','refunded') DEFAULT 'completed',
      paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_payments_hospital (hospital_id),
      INDEX idx_payments_invoice (invoice_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS claims (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NULL,
      invoice_id VARCHAR(36) NULL,
      policy_id VARCHAR(36) NULL,
      amount DECIMAL(10,2) NOT NULL,
      status ENUM('submitted','under_review','approved','rejected') DEFAULT 'submitted',
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_claims_hospital (hospital_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS insurance_policies (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      provider_name VARCHAR(255) NOT NULL,
      policy_name VARCHAR(255) NOT NULL,
      policy_number VARCHAR(100) NULL,
      coverage_details TEXT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_insurance_policies_hospital (hospital_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS patient_documents (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      file_url VARCHAR(500) NULL,
      document_type VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_patient_documents_hospital (hospital_id),
      INDEX idx_patient_documents_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS patient_medical_history (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      patient_id VARCHAR(36) NOT NULL,
      hospital_id VARCHAR(36) NOT NULL,
      diagnosis TEXT NULL,
      treatment TEXT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_patient_medical_history_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  `
    CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      patient_id VARCHAR(36) NOT NULL,
      hospital_id VARCHAR(36) NOT NULL,
      contact_name VARCHAR(150) NULL,
      contact_phone VARCHAR(20) NULL,
      relationship_to_patient VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_patient_emergency_contacts_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
];

async function ensureLegacyStaffSchema() {
  // Legacy schema stores most non-doctor/non-nurse staff in a shared `staff` table.
  await query(`
    CREATE TABLE IF NOT EXISTS staff (
      id INT PRIMARY KEY AUTO_INCREMENT,
      hospital_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NULL,
      role VARCHAR(50) NOT NULL,
      password VARCHAR(255) NOT NULL,
      profile_image VARCHAR(500) NULL,
      department VARCHAR(150) NULL,
      specialization VARCHAR(150) NULL,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_staff_hospital (hospital_id),
      INDEX idx_staff_role (role),
      UNIQUE KEY uniq_staff_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  clearTableColumnsCache("staff");
  const cols = await getTableColumns("staff");
  if (!cols) return;

  const addColumnIfMissing = async (name, ddl) => {
    if (cols.has(name)) return;
    await query(`ALTER TABLE staff ADD COLUMN ${ddl}`);
  };

  await addColumnIfMissing("profile_image", "`profile_image` VARCHAR(500) NULL");
  await addColumnIfMissing("password", "`password` VARCHAR(255) NOT NULL");
  await addColumnIfMissing("role", "`role` VARCHAR(50) NOT NULL");
  await addColumnIfMissing("hospital_id", "`hospital_id` INT NOT NULL");
}

async function ensureLegacyRoleImageColumns() {
  const ensure = async (table) => {
    clearTableColumnsCache(table);
    const cols = await getTableColumns(table);
    if (!cols) return;
    if (!cols.has("profile_image")) {
      await query(`ALTER TABLE \`${table}\` ADD COLUMN \`profile_image\` VARCHAR(500) NULL`);
    }
    if (!cols.has("hospital_id")) {
      await query(`ALTER TABLE \`${table}\` ADD COLUMN \`hospital_id\` INT NULL`);
    }
  };

  await ensure("doctors");
  await ensure("nurses");
}

async function ensureStaffProfessionalColumns() {
  const ensure = async (table) => {
    clearTableColumnsCache(table);
    const cols = await getTableColumns(table);
    if (!cols) return;

    const addColumnIfMissing = async (name, ddl) => {
      if (cols.has(name)) return;
      await query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
    };

    await addColumnIfMissing("qualification", "`qualification` VARCHAR(255) NULL");
    await addColumnIfMissing("experience_years", "`experience_years` INT DEFAULT 0");
    await addColumnIfMissing("expertise_area", "`expertise_area` VARCHAR(255) NULL");
    await addColumnIfMissing("certificate_file", "`certificate_file` VARCHAR(500) NULL");
  };

  await ensure("doctors");
  await ensure("nurses");
  // `staff` exists only in legacy mode; ERP mode may not have it.
  await ensure("staff");
}

async function ensureAmbulanceTypeOptions() {
  try {
    clearTableColumnsCache("ambulances");
    const cols = await getTableColumns("ambulances");
    if (!cols || !cols.has("type")) return;

    // Expand enum options in-place so new UI values don't fail inserts.
    await query(
      "ALTER TABLE ambulances MODIFY COLUMN type ENUM('basic','advanced','icu','oxygen','cardiac','air','neonatal') DEFAULT 'basic'"
    );
  } catch (err) {
    // Best-effort: some installs may not have the ambulances table (legacy-only DBs).
    console.warn("ensureAmbulanceTypeOptions skipped:", err?.message || err);
  }
}

async function ensureLabTestExtensions() {
  try {
    clearTableColumnsCache("lab_tests");
    const cols = await getTableColumns("lab_tests");
    if (!cols) return;

    const addColumnIfMissing = async (name, ddl) => {
      if (cols.has(name)) return;
      await query(`ALTER TABLE lab_tests ADD COLUMN ${ddl}`);
      cols.add(name);
    };

    await addColumnIfMissing("category", "`category` VARCHAR(100) NULL");
    await addColumnIfMissing("price", "`price` DECIMAL(10,2) DEFAULT 0.00");
  } catch (err) {
    console.warn("ensureLabTestExtensions skipped:", err?.message || err);
  }
}

async function ensureErpRoleImageColumns() {
  const ensure = async (table) => {
    clearTableColumnsCache(table);
    const cols = await getTableColumns(table);
    if (!cols) return;
    if (!cols.has("profile_image")) {
      await query(`ALTER TABLE \`${table}\` ADD COLUMN \`profile_image\` VARCHAR(500) NULL`);
    }
  };

  await ensure("users");
  await ensure("doctors");
  await ensure("nurses");
  await ensure("patients");
  await ensure("hospital_admins");
  await ensure("super_admins");
  // `staff` may not exist in ERP mode; best-effort only.
  await ensure("staff");
}

async function ensureNurseModuleTables() {
  const mode = await getSchemaMode();

  if (mode === "legacy") {
    await query(`
      CREATE TABLE IF NOT EXISTS nurse_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hospital_id INT NULL,
        nurse_id INT NULL,
        patient_id INT NULL,
        task_title VARCHAR(255) NULL,
        description TEXT NULL,
        status ENUM('pending','in_progress','completed') DEFAULT 'pending',
        priority ENUM('low','medium','high') DEFAULT 'medium',
        assigned_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS patient_vitals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        nurse_id INT NOT NULL,
        blood_pressure VARCHAR(20) NULL,
        heart_rate INT NULL,
        temperature FLOAT NULL,
        spo2 INT NULL,
        weight FLOAT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    clearTableColumnsCache("nurse_tasks");
    clearTableColumnsCache("patient_vitals");
    return;
  }

  // ERP schema mode (UUID strings)
  await query(`
    CREATE TABLE IF NOT EXISTS nurse_tasks (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      hospital_id VARCHAR(36) NULL,
      nurse_id VARCHAR(36) NULL,
      patient_id VARCHAR(36) NULL,
      task_title VARCHAR(255) NULL,
      description TEXT NULL,
      status ENUM('pending','in_progress','completed') DEFAULT 'pending',
      priority ENUM('low','medium','high') DEFAULT 'medium',
      assigned_by VARCHAR(36) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_nurse_tasks_hospital (hospital_id),
      INDEX idx_nurse_tasks_nurse (nurse_id),
      INDEX idx_nurse_tasks_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS patient_vitals (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      patient_id VARCHAR(36) NOT NULL,
      nurse_id VARCHAR(36) NOT NULL,
      blood_pressure VARCHAR(20) NULL,
      heart_rate INT NULL,
      temperature FLOAT NULL,
      spo2 INT NULL,
      weight FLOAT NULL,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_patient_vitals_patient (patient_id),
      INDEX idx_patient_vitals_nurse (nurse_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  clearTableColumnsCache("nurse_tasks");
  clearTableColumnsCache("patient_vitals");

  // Ensure columns exist for deployments that already had a different nurse_tasks schema.
  const nurseTaskCols = await getTableColumns("nurse_tasks");
  if (nurseTaskCols) {
    const addColumnIfMissing = async (name, ddl) => {
      if (nurseTaskCols.has(name)) return;
      await query(`ALTER TABLE nurse_tasks ADD COLUMN ${ddl}`);
    };

    await addColumnIfMissing("hospital_id", "`hospital_id` VARCHAR(36) NULL");
    await addColumnIfMissing("nurse_id", "`nurse_id` VARCHAR(36) NULL");
    await addColumnIfMissing("patient_id", "`patient_id` VARCHAR(36) NULL");
    await addColumnIfMissing("task_title", "`task_title` VARCHAR(255) NULL");
    await addColumnIfMissing("description", "`description` TEXT NULL");
    await addColumnIfMissing("treatment", "`treatment` TEXT NULL");
    await addColumnIfMissing("tests", "`tests` TEXT NULL");
    await addColumnIfMissing("priority", "`priority` ENUM('low','medium','high') DEFAULT 'medium'");
    await addColumnIfMissing("assigned_by", "`assigned_by` VARCHAR(36) NULL");
    await addColumnIfMissing("created_at", "`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  }

  // Allow "accepted" status for the nurse task workflow (pending -> accepted -> in_progress -> completed).
  try {
    // Best-effort enum upgrade; if status is already compatible, this will be a no-op.
    await query(
      "ALTER TABLE nurse_tasks MODIFY COLUMN status ENUM('pending','accepted','in_progress','completed') DEFAULT 'pending'"
    );
    clearTableColumnsCache("nurse_tasks");
  } catch (err) {
    // Some schemas may not use ENUM or may restrict ALTER; ignore to avoid boot failures.
  }
}

async function ensureNotificationsTable() {
  const mode = await getSchemaMode();

  if (mode === "legacy") {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT DEFAULT NULL,
        message TEXT,
        status ENUM('read','unread') DEFAULT 'unread',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_notifications_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    clearTableColumnsCache("notifications");
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id VARCHAR(36) NULL,
      message TEXT NULL,
      status ENUM('read','unread') DEFAULT 'unread',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  clearTableColumnsCache("notifications");
}

async function ensureHospitalExtensions() {
  try {
    const cols = await getTableColumns("hospitals");
    if (!cols) return;

    const addColumnIfMissing = async (name, ddl) => {
      if (cols.has(name)) return;
      await query(`ALTER TABLE hospitals ADD COLUMN ${ddl}`);
      clearTableColumnsCache("hospitals");
    };

    await addColumnIfMissing(
      "type_of_hospital",
      "`type_of_hospital` ENUM('Hospital','Clinic','Lab','Pharmacy') DEFAULT 'Hospital'"
    );
    await addColumnIfMissing("license_document", "`license_document` VARCHAR(255) NULL");
    await addColumnIfMissing(
      "verification_status",
      "`verification_status` ENUM('Pending','Approved','Rejected') DEFAULT 'Pending'"
    );
  } catch (err) {
    // Should not block bootstrapping if the schema is managed externally.
    console.warn("ensureHospitalExtensions skipped:", err?.message || err);
  }
}

async function ensureStructuredMedicalHistory() {
  const addColumnsIfMissing = async (table, columns) => {
    const cols = await getTableColumns(table);
    if (!cols) return;

    for (const [name, ddl] of columns) {
      if (cols.has(name)) continue;
      await query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
      clearTableColumnsCache(table);
    }
  };

  try {
    await addColumnsIfMissing("patient_medical_history", [
      [
        "condition_type",
        "`condition_type` ENUM('Fever','Diabetes','BP','Heart Disease','Allergy','Other') NULL",
      ],
      ["has_condition", "`has_condition` ENUM('Yes','No') DEFAULT 'No'"],
      ["follow_up", "`follow_up` ENUM('Yes','No') NULL"],
      ["emergency_required", "`emergency_required` ENUM('Yes','No') NULL"],
    ]);

    await addColumnsIfMissing("medical_history", [
      [
        "condition_type",
        "`condition_type` ENUM('Fever','Diabetes','BP','Heart Disease','Allergy','Other') NULL",
      ],
      ["has_condition", "`has_condition` ENUM('Yes','No') DEFAULT 'No'"],
      ["follow_up", "`follow_up` ENUM('Yes','No') NULL"],
      ["emergency_required", "`emergency_required` ENUM('Yes','No') NULL"],
      // Some installs use `medications`; others will use `treatment`.
      ["treatment", "`treatment` TEXT NULL"],
    ]);
  } catch (err) {
    console.warn("ensureStructuredMedicalHistory skipped:", err?.message || err);
  }
}

async function ensurePatientInsuranceTable() {
  try {
    const mode = await getSchemaMode();

    if (mode === "legacy") {
      await query(`
        CREATE TABLE IF NOT EXISTS patient_insurance (
          id INT NOT NULL AUTO_INCREMENT,
          patient_id INT NOT NULL,
          hospital_id INT NULL,
          aadhaar_number VARCHAR(20) NULL,
          pan_number VARCHAR(20) NULL,
          aadhaar_photo VARCHAR(255) NULL,
          pan_photo VARCHAR(255) NULL,
          insurance_number VARCHAR(100) NULL,
          policy_id VARCHAR(100) NULL,
          insurance_card_photo VARCHAR(255) NULL,
          validity_date DATE NULL,
          claim_amount DECIMAL(12,2) NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_patient_insurance_patient (patient_id),
          INDEX idx_patient_insurance_hospital (hospital_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      clearTableColumnsCache("patient_insurance");
      return;
    }

    await query(`
      CREATE TABLE IF NOT EXISTS patient_insurance (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        hospital_id VARCHAR(36) NULL,
        aadhaar_number VARCHAR(20) NULL,
        pan_number VARCHAR(20) NULL,
        aadhaar_photo VARCHAR(255) NULL,
        pan_photo VARCHAR(255) NULL,
        insurance_number VARCHAR(100) NULL,
        policy_id VARCHAR(100) NULL,
        insurance_card_photo VARCHAR(255) NULL,
        validity_date DATE NULL,
        claim_amount DECIMAL(12,2) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_patient_insurance_patient (patient_id),
        INDEX idx_patient_insurance_hospital (hospital_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    clearTableColumnsCache("patient_insurance");
  } catch (err) {
    console.warn("ensurePatientInsuranceTable skipped:", err?.message || err);
  }
}

async function ensurePatientAgeColumn() {
  try {
    const cols = await getTableColumns("patients");
    if (!cols || cols.has("age")) return;

    await query("ALTER TABLE patients ADD COLUMN age INT NULL");
    clearTableColumnsCache("patients");
  } catch (err) {
    console.warn("ensurePatientAgeColumn skipped:", err?.message || err);
  }
}

async function ensureErpSchema() {
  const mode = await getSchemaMode();

  if (mode === "legacy") {
    const legacyStatements = statements
      .filter((statement) =>
        [
          "nurse_tasks",
          "lab_tests",
          "lab_reports",
          "pharmacy_medicines",
          "pharmacy_orders",
          "inventory_items",
          "invoices",
          "payments",
          "claims",
          "insurance_policies",
          "patient_documents",
          "patient_medical_history",
          "patient_emergency_contacts",
        ].some((table) => statement.includes(`CREATE TABLE IF NOT EXISTS ${table}`))
      )
      .map((statement) =>
        statement
          .replaceAll("hospital_id VARCHAR(36)", "hospital_id INT")
          .replaceAll("patient_id VARCHAR(36)", "patient_id INT")
          .replaceAll("doctor_id VARCHAR(36)", "doctor_id INT")
          .replaceAll("nurse_id VARCHAR(36)", "nurse_id INT")
          .replaceAll("invoice_id VARCHAR(36)", "invoice_id INT")
          .replaceAll("policy_id VARCHAR(36)", "policy_id INT")
          .replaceAll("test_id VARCHAR(36)", "test_id INT")
      );

    for (const statement of legacyStatements) {
      await query(statement);
    }

    await ensureLegacyStaffSchema();
    await ensureLegacyRoleImageColumns();
    await ensureStaffProfessionalColumns();
    await ensureNurseModuleTables();
    await ensureNotificationsTable();
    await ensureHospitalExtensions();
    await ensureStructuredMedicalHistory();
    await ensurePatientInsuranceTable();
    await ensureLabTestExtensions();
    await ensurePatientAgeColumn();
    return;
  }

  for (const statement of statements) {
    await query(statement);
  }

  // Ensure profile images are supported for ERP mode role tables.
  await ensureErpRoleImageColumns();

  // Professional staff fields used during onboarding.
  await ensureStaffProfessionalColumns();

  // Ensure ambulance type enum supports the admin UI options.
  await ensureAmbulanceTypeOptions();

  // Ensure lab_tests supports booking metadata (category + price).
  await ensureLabTestExtensions();

  // Nurse module tables (tasks + patient vitals).
  await ensureNurseModuleTables();

  // Notification table (user activity feed).
  await ensureNotificationsTable();

  // Hospital extensions (type + license doc path).
  await ensureHospitalExtensions();

  // Structured patient medical history fields.
  await ensureStructuredMedicalHistory();

  // Patient insurance identity & policy uploads.
  await ensurePatientInsuranceTable();

  // Allow patient portal to save explicit age when DOB is missing/unknown.
  await ensurePatientAgeColumn();

  const defaultRoles = [
    ["super_admin", "Super Administrator", JSON.stringify(["*"])],
    ["hospital_admin", "Hospital Administrator", JSON.stringify(["manage_hospital"])],
    ["doctor", "Doctor", JSON.stringify(["view_patients", "view_appointments"])],
    ["nurse", "Nurse", JSON.stringify(["view_patients", "manage_tasks"])],
    ["patient", "Patient", JSON.stringify(["view_own_records"])],
    ["receptionist", "Receptionist", JSON.stringify(["manage_appointments"])],
  ];

  for (const role of defaultRoles) {
    await query(
      `INSERT IGNORE INTO roles (name, display_name, permissions) VALUES (?, ?, ?)`,
      role
    );
  }
}

module.exports = {
  ensureErpSchema,
};
