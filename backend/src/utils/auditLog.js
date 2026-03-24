const { pool } = require('../config/database');

/**
 * Log admin/user actions for audit trail
 */
const auditLog = async ({ hospitalId, userId, action, entity, entityId, oldValues, newValues, req }) => {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (hospital_id, user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hospitalId || null,
        userId || null,
        action,
        entity || null,
        entityId || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req?.ip || null,
        req?.headers?.['user-agent'] || null,
      ]
    );
  } catch (error) {
    // Audit log failures should not break the main flow
    console.error('Audit log error:', error.message);
  }
};

module.exports = { auditLog };
