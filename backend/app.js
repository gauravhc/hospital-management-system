require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

const { testConnection } = require("./config/database");
const { ensureErpSchema } = require("./services/bootstrap.service");
const { notFoundMiddleware, errorMiddleware } = require("./middleware/errorMiddleware");
const authMiddleware = require("./middleware/authMiddleware");
const { roleMiddleware } = require("./middleware/roleMiddleware");

const apiRoutes = require("./routes");

const app = express();

for (const dir of ["uploads", path.join("uploads", "lab"), path.join("uploads", "patients"), path.join("uploads", "profile_images"), path.join("uploads", "patient_documents"), path.join("uploads", "staff_documents"), path.join("uploads", "staff"), path.join("uploads", "hospitals"), path.join("uploads", "insurance")]) {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
}

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Restrict access to hospital license documents.
app.use(
  "/uploads/hospitals",
  authMiddleware,
  roleMiddleware("super_admin"),
  express.static(path.join(__dirname, "uploads", "hospitals"), { fallthrough: false })
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Hospital ERP API running",
    modules: [
      "auth",
      "hospitals",
      "users",
      "patients",
      "doctors",
      "nurses",
      "appointments",
      "lab",
      "pharmacy",
      "inventory",
      "billing",
      "payments",
      "insurance",
      "ambulance",
      "reports",
      "hr",
    ],
  });
});

// Single API mount for clean architecture
app.use("/api", apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

async function start() {
  await testConnection();
  await ensureErpSchema();
  app.listen(PORT, () => {
    console.log(`Hospital ERP API listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});

module.exports = app;
