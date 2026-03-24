const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ✅ TEST ROUTE
router.get("/test", (req, res) => {
  res.json({ message: "Super Admin API working ✅" });
});

// GET hospitals
router.get("/hospitals", (req, res) => {
  db.query("SELECT * FROM hospitals", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ADD hospital
router.post("/hospitals", (req, res) => {
  const { name, email, phone, address } = req.body;

  db.query(
    "INSERT INTO hospitals (name,email,phone,address) VALUES (?,?,?,?)",
    [name, email, phone, address],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Hospital added" });
    }
  );
});

// DELETE hospital
router.delete("/hospitals/:id", (req, res) => {
  db.query(
    "DELETE FROM hospitals WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Deleted" });
    }
  );
});

module.exports = router;