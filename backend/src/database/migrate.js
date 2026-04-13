require('dotenv').config();
const { pool } = require('../config/database');

const createTables = async () => {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Running database migrations...\n');
    await connection.beginTransaction();

    // ─────────────────────────────────────────
    // 1. HOSPITALS (Multi-tenant support)
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id            VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        name          VARCHAR(255)  NOT NULL,
        address       TEXT,
        phone         VARCHAR(20),
        email         VARCHAR(100)  UNIQUE,
        logo_url      VARCHAR(500),
        website       VARCHAR(255),
        gst_number    VARCHAR(50),
        certification VARCHAR(255),
        license_no    VARCHAR(100)  UNIQUE,
        bed_capacity  INT           DEFAULT 0,
        is_active     BOOLEAN       DEFAULT TRUE,
        settings      JSON          COMMENT 'Customizable hospital settings',
        created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ hospitals table');

    // ─────────────────────────────────────────
    // 2. ROLES
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id          INT           PRIMARY KEY AUTO_INCREMENT,
        name        VARCHAR(50)   NOT NULL UNIQUE,
        display_name VARCHAR(100),
        permissions JSON          COMMENT 'Array of permission strings',
        created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ roles table');

    // ─────────────────────────────────────────
    // 3. DEPARTMENTS
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id          VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        hospital_id VARCHAR(36)   NOT NULL,
        name        VARCHAR(100)  NOT NULL,
        code        VARCHAR(20),
        description TEXT,
        is_active   BOOLEAN       DEFAULT TRUE,
        created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
        UNIQUE KEY unique_dept_per_hospital (hospital_id, code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ departments table');

    // ─────────────────────────────────────────
    // 4. USERS (All staff share this table)
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id              VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        hospital_id     VARCHAR(36)   NULL COMMENT 'NULL = Super Admin',
        role_id         INT           NOT NULL,
        employee_id     VARCHAR(50)   UNIQUE,
        first_name      VARCHAR(100)  NOT NULL,
        last_name       VARCHAR(100)  NOT NULL,
        email           VARCHAR(255)  NOT NULL UNIQUE,
        password_hash   VARCHAR(255)  NOT NULL,
        phone           VARCHAR(20),
        gender          ENUM('male','female','other'),
        date_of_birth   DATE,
        profile_image   VARCHAR(500),
        address         TEXT,
        status          ENUM('active','inactive','suspended') DEFAULT 'active',
        last_login      TIMESTAMP     NULL,
        email_verified  BOOLEAN       DEFAULT FALSE,
        refresh_token   TEXT          NULL,
        created_by      VARCHAR(36)   NULL,
        created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
        FOREIGN KEY (role_id)     REFERENCES roles(id),
        INDEX idx_hospital_role (hospital_id, role_id),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ users table');

    // ─────────────────────────────────────────
    // 5. DOCTORS (extends users)
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS doctors (
        id                  VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        user_id             VARCHAR(36)   NOT NULL UNIQUE,
        hospital_id         VARCHAR(36)   NOT NULL,
        department_id       VARCHAR(36),
        specialization      VARCHAR(150),
        qualification       VARCHAR(255),
        experience_years    INT           DEFAULT 0,
        license_number      VARCHAR(100)  UNIQUE,
        consultation_fee    DECIMAL(10,2) DEFAULT 0.00,
        available_days      JSON          COMMENT 'Array: ["monday","tuesday",...]',
        available_time_from TIME,
        available_time_to   TIME,
        max_patients_per_day INT          DEFAULT 20,
        bio                 TEXT,
        is_available        BOOLEAN       DEFAULT TRUE,
        rating              DECIMAL(3,2)  DEFAULT 0.00,
        total_reviews       INT           DEFAULT 0,
        created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hospital_id)   REFERENCES hospitals(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ doctors table');

    // ─────────────────────────────────────────
    // 6. NURSES (extends users)
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS nurses (
        id              VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        user_id         VARCHAR(36)   NOT NULL UNIQUE,
        hospital_id     VARCHAR(36)   NOT NULL,
        department_id   VARCHAR(36),
        qualification   VARCHAR(255),
        license_number  VARCHAR(100)  UNIQUE,
        shift           ENUM('morning','afternoon','night','rotating') DEFAULT 'morning',
        ward_assigned   VARCHAR(100),
        experience_years INT          DEFAULT 0,
        is_head_nurse   BOOLEAN       DEFAULT FALSE,
        created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hospital_id)   REFERENCES hospitals(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ nurses table');

    // ─────────────────────────────────────────
    // 7. PATIENTS
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id                  VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        hospital_id         VARCHAR(36)   NOT NULL,
        patient_id_no       VARCHAR(50)   UNIQUE,
        first_name          VARCHAR(100)  NOT NULL,
        last_name           VARCHAR(100)  NOT NULL,
        email               VARCHAR(255),
        phone               VARCHAR(20)   NOT NULL,
        gender              ENUM('male','female','other') NOT NULL,
        date_of_birth       DATE          NOT NULL,
        blood_group         ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-'),
        address             TEXT,
        emergency_contact_name    VARCHAR(150),
        emergency_contact_phone   VARCHAR(20),
        emergency_contact_relation VARCHAR(50),
        allergies           TEXT,
        chronic_conditions  TEXT,
        insurance_provider  VARCHAR(150),
        insurance_policy_no VARCHAR(100),
        registration_date   DATE          DEFAULT (CURRENT_DATE),
        status              ENUM('active','inactive','deceased') DEFAULT 'active',
        created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
        INDEX idx_hospital_patient (hospital_id),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ patients table');

    // ─────────────────────────────────────────
    // 8. APPOINTMENTS
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id              VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        hospital_id     VARCHAR(36)   NOT NULL,
        patient_id      VARCHAR(36)   NOT NULL,
        doctor_id       VARCHAR(36)   NOT NULL,
        appointment_date DATE         NOT NULL,
        appointment_time TIME         NOT NULL,
        duration_minutes INT          DEFAULT 30,
        type            ENUM('consultation','follow_up','emergency','routine') DEFAULT 'consultation',
        status          ENUM('scheduled','confirmed','in_progress','completed','cancelled','no_show') DEFAULT 'scheduled',
        chief_complaint TEXT,
        notes           TEXT,
        token_number    INT,
        booked_by       VARCHAR(36)   COMMENT 'User ID who booked',
        cancelled_reason TEXT,
        cancelled_at    TIMESTAMP     NULL,
        created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id)  REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id)   REFERENCES doctors(id) ON DELETE CASCADE,
        INDEX idx_doctor_date (doctor_id, appointment_date),
        INDEX idx_patient_appointments (patient_id),
        INDEX idx_hospital_date (hospital_id, appointment_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ appointments table');

    // ─────────────────────────────────────────
    // 9. AMBULANCES
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ambulances (
        id              VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        hospital_id     VARCHAR(36)   NOT NULL,
        vehicle_no      VARCHAR(50)   NOT NULL UNIQUE,
        type            ENUM('basic','advanced','icu','oxygen','cardiac','air','neonatal') DEFAULT 'basic',
        model           VARCHAR(100),
        year            YEAR,
        driver_name     VARCHAR(150),
        driver_phone    VARCHAR(20),
        driver_user_id  VARCHAR(36)   NULL,
        status          ENUM('available','dispatched','maintenance','out_of_service') DEFAULT 'available',
        current_location VARCHAR(255),
        latitude        DECIMAL(10,8),
        longitude       DECIMAL(11,8),
        equipment       JSON          COMMENT 'List of medical equipment onboard',
        last_service_date DATE,
        next_service_date DATE,
        created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id)    REFERENCES hospitals(id) ON DELETE CASCADE,
        FOREIGN KEY (driver_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ ambulances table');

    // ─────────────────────────────────────────
    // 10. AMBULANCE DISPATCHES
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ambulance_dispatches (
        id              VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        hospital_id     VARCHAR(36)   NOT NULL,
        ambulance_id    VARCHAR(36)   NOT NULL,
        patient_id      VARCHAR(36)   NULL,
        caller_name     VARCHAR(150),
        caller_phone    VARCHAR(20)   NOT NULL,
        pickup_location TEXT          NOT NULL,
        pickup_lat      DECIMAL(10,8),
        pickup_lng      DECIMAL(11,8),
        destination     TEXT,
        emergency_type  VARCHAR(100),
        priority        ENUM('low','medium','high','critical') DEFAULT 'high',
        status          ENUM('requested','dispatched','en_route','arrived','completed','cancelled') DEFAULT 'requested',
        dispatched_at   TIMESTAMP     NULL,
        arrived_at      TIMESTAMP     NULL,
        completed_at    TIMESTAMP     NULL,
        notes           TEXT,
        dispatched_by   VARCHAR(36),
        created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id)  REFERENCES hospitals(id) ON DELETE CASCADE,
        FOREIGN KEY (ambulance_id) REFERENCES ambulances(id),
        FOREIGN KEY (patient_id)   REFERENCES patients(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ ambulance_dispatches table');

    // ─────────────────────────────────────────
    // 11. ATTENDANCE
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id          VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        hospital_id VARCHAR(36)   NOT NULL,
        user_id     VARCHAR(36)   NOT NULL,
        date        DATE          NOT NULL,
        check_in    TIMESTAMP     NULL,
        check_out   TIMESTAMP     NULL,
        status      ENUM('present','absent','half_day','late','on_leave') DEFAULT 'present',
        notes       TEXT,
        marked_by   VARCHAR(36)   NULL,
        created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_attendance (user_id, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ attendance table');

    // ─────────────────────────────────────────
    // 12. AUDIT LOGS
    // ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        hospital_id VARCHAR(36)   NULL,
        user_id     VARCHAR(36)   NULL,
        action      VARCHAR(100)  NOT NULL,
        entity      VARCHAR(100),
        entity_id   VARCHAR(36),
        old_values  JSON,
        new_values  JSON,
        ip_address  VARCHAR(45),
        user_agent  TEXT,
        created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hospital_audit (hospital_id, created_at),
        INDEX idx_user_audit (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ audit_logs table');

    await connection.commit();
    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
};

createTables();
