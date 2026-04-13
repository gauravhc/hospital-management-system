require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

for (const dir of ["uploads", path.join("uploads", "lab"), path.join("uploads", "patients"), path.join("uploads", "profile_images"), path.join("uploads", "patient_documents"), path.join("uploads", "staff_documents")]) {
  fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
}

// ✅ Security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// ✅ Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);

// ✅ Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ✅ Logger
app.use(morgan('dev'));

// ✅ Health check
app.get('/', (req, res) => {
  res.send('Hospital Backend Running 🚀');
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ✅ ROUTES (ONLY EXISTING ONES)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/super-admin', require('./routes/superAdmin.routes'));
app.use('/api/ambulances', require('./routes/ambulance.routes'));
app.use('/api/ambulance', require('./routes/ambulanceRequest.routes'));
app.use('/api/admin', require('./routes/adminAmbulance.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
// Keep both singular + plural prefixes for compatibility with frontend calls.
app.use('/api/patient', require('./routes/patientProfile.routes'));
app.use('/api/patients', require('./routes/patientProfile.routes'));

// ✅ START SERVER
const startServer = async () => {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 http://localhost:${PORT}`);
  });
};

startServer();
