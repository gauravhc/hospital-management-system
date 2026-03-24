const db = require('../../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id; // from JWT

    const [rows] = await db.query(`
      SELECT role, COUNT(*) as total
      FROM users
      WHERE hospital_id = ?
      GROUP BY role
    `, [hospitalId]);

    const stats = {
      doctors: 0,
      nurses: 0,
      lab: 0,
      pharmacy: 0,
      reception: 0,
      totalStaff: 0
    };

    rows.forEach(row => {
      if (row.role === 'Doctor') stats.doctors = row.total;
      if (row.role === 'Nurse') stats.nurses = row.total;
      if (row.role === 'Lab') stats.lab = row.total;
      if (row.role === 'Pharmacist') stats.pharmacy = row.total;
      if (row.role === 'Reception') stats.reception = row.total;

      stats.totalStaff += row.total;
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};