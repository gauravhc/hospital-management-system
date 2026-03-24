const db = require("../config/db");
const bcrypt = require("bcryptjs");

const getHospitals = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT
        id,
        name,
        address,
        gst_number,
        phone
      FROM hospitals
      ORDER BY id DESC
      `
    );

    return res.json({
      success: true,
      hospitals: rows,
    });
  } catch (error) {
    console.error("GET HOSPITALS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hospitals",
    });
  }
};

const createHospital = async (req, res) => {
  try {
    const { name, address, gst_number, phone, email, password } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Hospital name is required",
      });
    }

    const [result] = await db.execute(
      `
      INSERT INTO hospitals (name, address, gst_number, phone)
      VALUES (?, ?, ?, ?)
      `,
      [name, address || null, gst_number || null, phone || null]
    );

    let adminCreated = false;
    if (email && password) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const [existing] = await db.execute(
        "SELECT id FROM hospital_admins WHERE email = ? LIMIT 1",
        [normalizedEmail]
      );
      if (existing.length) {
        return res.status(409).json({
          success: false,
          message: "Hospital created, but admin email already exists",
          id: result.insertId,
        });
      }

      const hash = await bcrypt.hash(String(password), 10);
      await db.execute(
        `
        INSERT INTO hospital_admins (hospital_id, full_name, email, password, phone)
        VALUES (?, ?, ?, ?, ?)
        `,
        [result.insertId, name, normalizedEmail, hash, phone || null]
      );
      adminCreated = true;
    }

    return res.status(201).json({
      success: true,
      message: "Hospital created successfully",
      id: result.insertId,
      admin_created: adminCreated,
    });
  } catch (error) {
    console.error("CREATE HOSPITAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create hospital",
    });
  }
};

const updateHospital = async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const { name, address, gst_number, phone } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Hospital name is required",
      });
    }

    const [result] = await db.execute(
      `
      UPDATE hospitals
      SET name = ?, address = ?, gst_number = ?, phone = ?
      WHERE id = ?
      `,
      [name, address || null, gst_number || null, phone || null, hospitalId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    return res.json({
      success: true,
      message: "Hospital updated successfully",
    });
  } catch (error) {
    console.error("UPDATE HOSPITAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update hospital",
    });
  }
};

const deleteHospital = async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const [result] = await db.execute("DELETE FROM hospitals WHERE id = ?", [hospitalId]);
    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }
    return res.json({
      success: true,
      message: "Hospital deleted successfully",
    });
  } catch (error) {
    console.error("DELETE HOSPITAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete hospital",
    });
  }
};

module.exports = {
  getHospitals,
  createHospital,
  updateHospital,
  deleteHospital,
};
