const db = require("../config/db");

// GET hospitals
exports.getHospitals = (req, res) => {
  db.query("SELECT * FROM hospitals ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};

// ADD hospital
exports.addHospital = (req, res) => {
  const { name, email, phone, address } = req.body;

  db.query(
    "INSERT INTO hospitals (name,email,phone,address) VALUES (?,?,?,?)",
    [name, email, phone, address],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId });
    }
  );
};

// UPDATE hospital
exports.updateHospital = (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address } = req.body;

  db.query(
    "UPDATE hospitals SET name=?,email=?,phone=?,address=? WHERE id=?",
    [name, email, phone, address, id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Updated" });
    }
  );
};

// DELETE hospital
exports.deleteHospital = (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM hospitals WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Deleted" });
  });
};