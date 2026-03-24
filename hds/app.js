const express = require("express");
const cors = require("cors");
require("dotenv").config();

const appointmentRoutes = require("./routes/appointment.routes");
const hospitalRoutes = require("./routes/hospital.routes");
const doctorRoutes = require("./routes/doctor.routes");
const { ensureSchema } = require("./config/schema");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/hospitals", hospitalRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);

const PORT = Number(process.env.PORT || 5000);

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Appointment backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Schema initialization failed:", error);
    process.exit(1);
  });
