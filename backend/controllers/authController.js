const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const REQUIRED_FIELDS = {
  patient: ["hospital_id", "full_name", "email", "password", "phone"],
  doctor: ["hospital_id", "full_name", "email", "password", "phone", "specialization"],
  nurse: ["hospital_id", "full_name", "email", "password", "phone"],
  hospital_admin: ["hospital_id", "full_name", "email", "password"],
  super_admin: ["full_name", "email", "password"],
};

const missingFields = (body, fields) => {
  return fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === "");
};

const resolveHospitalId = (req) => {
  if (req.user && req.user.role === "hospital_admin") return req.user.hospital_id;
  return req.body.hospital_id;
};

const createUserWithRoleRow = async ({
  role,
  userPayload,
  roleInsertQuery,
  roleInsertValues,
}) => {
  const conn = await db.promise().getConnection();

  try {
    await conn.beginTransaction();

    const [existing] = await conn.query("SELECT id FROM users WHERE email = ?", [userPayload.email]);
    if (existing.length) {
      await conn.rollback();
      return { ok: false, status: 409, message: "Email already exists" };
    }

    const hashedPassword = await bcrypt.hash(userPayload.password, 10);

    const [userResult] = await conn.query(
      `INSERT INTO users
      (full_name, email, password, mobile, role, specialization, hospital_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        userPayload.full_name,
        userPayload.email,
        hashedPassword,
        userPayload.phone || null,
        role,
        userPayload.specialization || null,
        userPayload.hospital_id || null,
      ]
    );

    await conn.query(roleInsertQuery, roleInsertValues(hashedPassword));

    await conn.commit();

    return { ok: true, userId: userResult.insertId };
  } catch (err) {
    await conn.rollback();
    return { ok: false, status: 500, message: err.message };
  } finally {
    conn.release();
  }
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email=?", [email], async (err, result) => {
    if (err) return res.status(500).send(err);

    if (result.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = result[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        hospital_id: user.hospital_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.full_name,
        role: user.role,
        hospital_id: user.hospital_id,
      },
    });
  });
};

exports.registerPatient = async (req, res) => {
  const missing = missingFields(req.body, REQUIRED_FIELDS.patient);
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(", ")}` });
  }

  const payload = {
    hospital_id: req.body.hospital_id,
    full_name: req.body.full_name,
    email: req.body.email.toLowerCase().trim(),
    password: req.body.password,
    phone: req.body.phone,
    address: req.body.address || null,
    dob: req.body.dob || null,
    gender: req.body.gender || null,
  };

  const result = await createUserWithRoleRow({
    role: "patient",
    userPayload: payload,
    roleInsertQuery: `INSERT INTO patients (hospital_id, full_name, email, phone, address, dob, gender)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    roleInsertValues: () => [
      payload.hospital_id,
      payload.full_name,
      payload.email,
      payload.phone,
      payload.address,
      payload.dob,
      payload.gender,
    ],
  });

  if (!result.ok) {
    return res.status(result.status).json({ success: false, message: result.message });
  }

  return res.status(201).json({ success: true, message: "Patient registered successfully", userId: result.userId });
};

exports.createDoctor = async (req, res) => {
  const bodyWithHospital = { ...req.body, hospital_id: resolveHospitalId(req) };
  const missing = missingFields(bodyWithHospital, REQUIRED_FIELDS.doctor);
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(", ")}` });
  }

  const payload = {
    hospital_id: bodyWithHospital.hospital_id,
    full_name: req.body.full_name,
    email: req.body.email.toLowerCase().trim(),
    password: req.body.password,
    phone: req.body.phone,
    specialization: req.body.specialization,
  };

  const result = await createUserWithRoleRow({
    role: "doctor",
    userPayload: payload,
    roleInsertQuery: `INSERT INTO doctors (hospital_id, full_name, email, phone, specialization, password)
      VALUES (?, ?, ?, ?, ?, ?)`,
    roleInsertValues: (hashedPassword) => [
      payload.hospital_id,
      payload.full_name,
      payload.email,
      payload.phone,
      payload.specialization,
      hashedPassword,
    ],
  });

  if (!result.ok) {
    return res.status(result.status).json({ success: false, message: result.message });
  }

  return res.status(201).json({ success: true, message: "Doctor created successfully", userId: result.userId });
};

exports.createNurse = async (req, res) => {
  const bodyWithHospital = { ...req.body, hospital_id: resolveHospitalId(req) };
  const missing = missingFields(bodyWithHospital, REQUIRED_FIELDS.nurse);
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(", ")}` });
  }

  const payload = {
    hospital_id: bodyWithHospital.hospital_id,
    full_name: req.body.full_name,
    email: req.body.email.toLowerCase().trim(),
    password: req.body.password,
    phone: req.body.phone,
  };

  const result = await createUserWithRoleRow({
    role: "nurse",
    userPayload: payload,
    roleInsertQuery: `INSERT INTO nurses (hospital_id, full_name, email, phone, password)
      VALUES (?, ?, ?, ?, ?)`,
    roleInsertValues: (hashedPassword) => [
      payload.hospital_id,
      payload.full_name,
      payload.email,
      payload.phone,
      hashedPassword,
    ],
  });

  if (!result.ok) {
    return res.status(result.status).json({ success: false, message: result.message });
  }

  return res.status(201).json({ success: true, message: "Nurse created successfully", userId: result.userId });
};

exports.createHospitalAdmin = async (req, res) => {
  const bodyWithHospital = { ...req.body, hospital_id: resolveHospitalId(req) };
  const missing = missingFields(bodyWithHospital, REQUIRED_FIELDS.hospital_admin);
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(", ")}` });
  }

  const payload = {
    hospital_id: bodyWithHospital.hospital_id,
    full_name: req.body.full_name,
    email: req.body.email.toLowerCase().trim(),
    password: req.body.password,
  };

  const result = await createUserWithRoleRow({
    role: "hospital_admin",
    userPayload: payload,
    roleInsertQuery: `INSERT INTO hospital_admins (hospital_id, full_name, email, password)
      VALUES (?, ?, ?, ?)`,
    roleInsertValues: (hashedPassword) => [
      payload.hospital_id,
      payload.full_name,
      payload.email,
      hashedPassword,
    ],
  });

  if (!result.ok) {
    return res.status(result.status).json({ success: false, message: result.message });
  }

  return res.status(201).json({ success: true, message: "Hospital admin created successfully", userId: result.userId });
};

exports.createSuperAdmin = async (req, res) => {
  const missing = missingFields(req.body, REQUIRED_FIELDS.super_admin);
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(", ")}` });
  }

  const payload = {
    full_name: req.body.full_name,
    email: req.body.email.toLowerCase().trim(),
    password: req.body.password,
  };

  const result = await createUserWithRoleRow({
    role: "super_admin",
    userPayload: payload,
    roleInsertQuery: `INSERT INTO super_admins (full_name, email, password) VALUES (?, ?, ?)`,
    roleInsertValues: (hashedPassword) => [payload.full_name, payload.email, hashedPassword],
  });

  if (!result.ok) {
    return res.status(result.status).json({ success: false, message: result.message });
  }

  return res.status(201).json({ success: true, message: "Super admin created successfully", userId: result.userId });
};
