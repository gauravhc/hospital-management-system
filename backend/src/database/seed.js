require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const seed = async () => {
  const connection = await pool.getConnection();

  try {
    console.log('🌱 Seeding database...\n');
    await connection.beginTransaction();

    // ─── ROLES ───────────────────────────────
    const roles = [
      {
        name: 'super_admin',
        display_name: 'Super Administrator',
        permissions: JSON.stringify(['*']), // all permissions
      },
      {
        name: 'hospital_admin',
        display_name: 'Hospital Administrator',
        permissions: JSON.stringify([
          'manage_users', 'manage_doctors', 'manage_nurses',
          'manage_patients', 'manage_appointments', 'manage_ambulances',
          'view_reports', 'manage_departments', 'manage_settings',
        ]),
      },
      {
        name: 'doctor',
        display_name: 'Doctor',
        permissions: JSON.stringify([
          'view_patients', 'view_appointments', 'update_appointments',
          'create_prescriptions', 'view_prescriptions',
        ]),
      },
      {
        name: 'nurse',
        display_name: 'Nurse',
        permissions: JSON.stringify([
          'view_patients', 'update_patient_vitals', 'view_appointments',
          'manage_ward',
        ]),
      },
      {
        name: 'receptionist',
        display_name: 'Receptionist',
        permissions: JSON.stringify([
          'manage_appointments', 'register_patients', 'view_doctors',
        ]),
      },
    ];

    for (const role of roles) {
      await connection.execute(
        `INSERT IGNORE INTO roles (name, display_name, permissions) VALUES (?, ?, ?)`,
        [role.name, role.display_name, role.permissions]
      );
    }
    console.log('  ✓ Roles seeded');

    // ─── SUPER ADMIN USER ─────────────────────
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@dscape.ai';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
    const passwordHash = await bcrypt.hash(superAdminPassword, 12);

    const [roleRows] = await connection.execute(
      `SELECT id FROM roles WHERE name = 'super_admin'`
    );
    const superAdminRoleId = roleRows[0].id;

    await connection.execute(
      `INSERT IGNORE INTO users 
        (id, hospital_id, role_id, employee_id, first_name, last_name, email, password_hash, status, email_verified)
       VALUES (UUID(), NULL, ?, 'SA-001', 'Super', 'Admin', ?, ?, 'active', TRUE)`,
      [superAdminRoleId, superAdminEmail, passwordHash]
    );
    console.log(`  ✓ Super Admin seeded (${superAdminEmail})`);

    // ─── DEMO HOSPITAL ───────────────────────
    await connection.execute(
      `INSERT IGNORE INTO hospitals 
        (id, name, address, phone, email, license_no, bed_capacity, settings)
       VALUES 
        ('demo-hosp-001', 'Dscape AI Medical Center', '123 Health Street, Medical District', 
         '+1 56654 65656', 'admin@dscape.ai', 'HOSP-2024-001', 500,
         '{"theme": "blue", "currency": "USD", "timezone": "Asia/Kolkata"}')
      `
    );
    console.log('  ✓ Demo hospital seeded');

    // ─── DEMO DEPARTMENTS ────────────────────
    const departments = [
      { code: 'CARDIO', name: 'Cardiology' },
      { code: 'NEURO', name: 'Neurology' },
      { code: 'ORTHO', name: 'Orthopedics' },
      { code: 'PEDS', name: 'Pediatrics' },
      { code: 'GYNE', name: 'Gynecology' },
      { code: 'EMERG', name: 'Emergency' },
      { code: 'LAB', name: 'Laboratory' },
      { code: 'PHARM', name: 'Pharmacy' },
    ];

    for (const dept of departments) {
      await connection.execute(
        `INSERT IGNORE INTO departments (hospital_id, name, code) VALUES ('demo-hosp-001', ?, ?)`,
        [dept.name, dept.code]
      );
    }
    console.log('  ✓ Departments seeded');

    // ─── DEMO HOSPITAL ADMIN ─────────────────
    const [adminRoleRows] = await connection.execute(
      `SELECT id FROM roles WHERE name = 'hospital_admin'`
    );
    const adminRoleId = adminRoleRows[0].id;
    const adminPasswordHash = await bcrypt.hash('Admin@123', 12);

    await connection.execute(
      `INSERT IGNORE INTO users 
        (hospital_id, role_id, employee_id, first_name, last_name, email, password_hash, status, email_verified)
       VALUES ('demo-hosp-001', ?, 'ADM-001', 'Hospital', 'Admin', 'admin@hds.com', ?, 'active', TRUE)`,
      [adminRoleId, adminPasswordHash]
    );
    console.log('  ✓ Demo Hospital Admin seeded (admin@hds.com / Admin@123)');

    await connection.commit();
    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Default Credentials:');
    console.log('   Super Admin : superadmin@dscape.ai / SuperAdmin@123');
    console.log('   Hospital Admin: admin@hds.com / Admin@123');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Seed failed:', error.message);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
};

seed();
