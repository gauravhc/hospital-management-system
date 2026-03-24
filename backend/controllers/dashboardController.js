const db = require("../config/db");

const getCount = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return Number(rows[0]?.total || 0);
};

exports.getHospitalAdminStats = async (req, res) => {
  try {
    const hospitalId = req.user?.hospital_id || req.query.hospital_id;

    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message: "hospital_id is required",
      });
    }

    const [hospitalRows] = await db
      .promise()
      .query("SELECT id, name, email, phone FROM hospitals WHERE id = ? LIMIT 1", [hospitalId]);

    if (!hospitalRows.length) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    const [
      doctors,
      nurses,
      laboratory,
      pharmacy,
      reception,
      management,
      patients,
      admins,
      ambulances,
      ambulanceRequests,
      totalStaff,
    ] = await Promise.all([
      getCount("SELECT COUNT(*) AS total FROM doctors WHERE hospital_id = ?", [hospitalId]),
      getCount("SELECT COUNT(*) AS total FROM nurses WHERE hospital_id = ?", [hospitalId]),
      getCount("SELECT COUNT(*) AS total FROM users WHERE hospital_id = ? AND role = 'lab'", [hospitalId]),
      getCount("SELECT COUNT(*) AS total FROM users WHERE hospital_id = ? AND role = 'pharmacist'", [hospitalId]),
      getCount("SELECT COUNT(*) AS total FROM users WHERE hospital_id = ? AND role = 'reception'", [hospitalId]),
      getCount(
        "SELECT COUNT(*) AS total FROM users WHERE hospital_id = ? AND role IN ('admin','hospital_admin')",
        [hospitalId]
      ),
      getCount("SELECT COUNT(*) AS total FROM patients WHERE hospital_id = ?", [hospitalId]),
      getCount("SELECT COUNT(*) AS total FROM hospital_admins WHERE hospital_id = ?", [hospitalId]),
      getCount("SELECT COUNT(*) AS total FROM ambulances WHERE hospital_id = ?", [hospitalId]),
      getCount("SELECT COUNT(*) AS total FROM ambulance_requests WHERE hospital_id = ?", [hospitalId]),
      getCount("SELECT COUNT(*) AS total FROM users WHERE hospital_id = ? AND role <> 'patient'", [hospitalId]),
    ]);

    res.json({
      success: true,
      hospital: hospitalRows[0],
      counts: {
        doctors,
        nurses,
        laboratory,
        pharmacy,
        reception,
        management,
        patients,
        admins,
        ambulances,
        ambulanceRequests,
        totalStaff,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: err.message,
    });
  }
};
