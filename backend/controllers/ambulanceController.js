const db = require("../config/db");

// CREATE REQUEST
exports.createRequest = async (req, res) => {
  try {
    const { pickupAddress, dropAddress, ambulanceType, pickupTime, contactPhone } = req.body;

    const patientId = req.user.id;
    const hospitalId = req.user.hospital_id;

    const [result] = await db.query(
      `INSERT INTO ambulance_requests
      (hospital_id, patient_id, pickup_address, drop_address,
       ambulance_type, pickup_time, contact_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [hospitalId, patientId, pickupAddress, dropAddress, ambulanceType, pickupTime, contactPhone]
    );

    res.json({
      success: true,
      message: "Ambulance requested successfully",
      requestId: result.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, message:"Server error"});
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const [result] = await db.query(
      "UPDATE ambulance_requests SET status = ? WHERE id = ?",
      [status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    return res.json({ success: true, message: "Ambulance status updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getPatientRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM ambulance_requests WHERE patient_id = ? ORDER BY id DESC",
      [req.user.id]
    );

    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
