const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const { query, getConnection } = require("../config/database");
const usersService = require("../modules/users/service");
const { getSchemaMode } = require("../services/schemaMode.service");
const { getTableColumns, firstExistingColumn } = require("../services/dbMeta");

const router = express.Router();
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
fs.mkdirSync(path.join(UPLOAD_ROOT, "staff"), { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_ROOT, "patients"),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
});
const labUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_ROOT, "lab"),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
});
const staffUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "photo") {
        return cb(null, path.join(UPLOAD_ROOT, "profile_images"));
      }
      if (file.fieldname === "certificate_file") {
        return cb(null, path.join(UPLOAD_ROOT, "staff"));
      }
      return cb(null, path.join(UPLOAD_ROOT, "staff_documents"));
    },
    filename: (req, file, cb) => cb(null, `staff_${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname || "")}`),
  }),
});

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  // Keep "admin" as a staff role; only normalize explicit hospital admin aliases.
  if (value === "administrator") return "hospital_admin";
  if (value === "superadmin" || value === "super-admin") return "super_admin";
  return value;
}

function normalizeAppointmentRow(row) {
  if (!row) return row;
  return {
    ...row,
    patientName: row.patientName || row.patient_name || row.patient,
    doctorName: row.doctorName || row.doctor_name || row.doctor,
    date: row.date || row.appointment_date,
    time: row.time || row.appointment_time,
    paymentStatus: row.paymentStatus || row.payment_status,
  };
}

async function resolvePatientByUser(user) {
  if (!user) return null;
  const rows = await query(
    `SELECT * FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`,
    [user.email, user.phone || ""]
  );
  return rows[0] || null;
}

async function resolveDoctorByUser(user) {
  if (!user) return null;
  const rows = await query(
    `SELECT * FROM doctors WHERE email = ? OR phone = ? ORDER BY id DESC LIMIT 1`,
    [user.email, user.phone || ""]
  );
  return rows[0] || null;
}

async function resolveValidHospitalId(candidate) {
  if (candidate === null || candidate === undefined || candidate === "") return null;
  const hospitalId = Number(candidate);
  if (!Number.isInteger(hospitalId) || hospitalId <= 0) return null;

  const rows = await query(`SELECT id FROM hospitals WHERE id = ? LIMIT 1`, [hospitalId]);
  return rows[0]?.id || null;
}

function unwrap(rows) {
  return Array.isArray(rows) ? rows : [];
}

router.get("/dashboard/stats", authMiddleware, async (req, res, next) => {
  try {
    const [hospitals, superAdmins, hospitalAdmins, doctors, nurses, staff, appointments, patients] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM hospitals`),
      query(`SELECT COUNT(*) AS total FROM super_admins`),
      query(`SELECT COUNT(*) AS total FROM hospital_admins`),
      query(`SELECT COUNT(*) AS total FROM doctors`),
      query(`SELECT COUNT(*) AS total FROM nurses`),
      query(`SELECT COUNT(*) AS total FROM staff`),
      query(`SELECT COUNT(*) AS total FROM appointments`),
      query(`SELECT COUNT(*) AS total FROM patients`),
    ]);

    const usersTotal =
      Number(superAdmins[0]?.total || 0) +
      Number(hospitalAdmins[0]?.total || 0) +
      Number(doctors[0]?.total || 0) +
      Number(nurses[0]?.total || 0) +
      Number(staff[0]?.total || 0);

    res.json({
      success: true,
      data: {
        hospitals: hospitals[0]?.total || 0,
        users: usersTotal,
        appointments: appointments[0]?.total || 0,
        patients: patients[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/dashboard-stats", authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const hospitalId = req.user.hospital_id;
    if (hospitalId === undefined || hospitalId === null) {
      return res.status(400).json({ success: false, message: "Hospital not found for current user" });
    }

    const [staff, doctors, nurses, patients, appointments, staffByRoleRows] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM staff WHERE hospital_id = ?`, [hospitalId]),
      query(`SELECT COUNT(*) AS total FROM doctors WHERE hospital_id = ?`, [hospitalId]),
      query(`SELECT COUNT(*) AS total FROM nurses WHERE hospital_id = ?`, [hospitalId]),
      query(`SELECT COUNT(*) AS total FROM patients WHERE hospital_id = ?`, [hospitalId]),
      query(`SELECT COUNT(*) AS total FROM appointments WHERE hospital_id = ?`, [hospitalId]),
      query(`SELECT LOWER(role) AS role, COUNT(*) AS total FROM staff WHERE hospital_id = ? GROUP BY LOWER(role)`, [hospitalId]),
    ]);

    const totalUsers =
      Number(staff[0]?.total || 0) +
      Number(doctors[0]?.total || 0) +
      Number(nurses[0]?.total || 0);

    const staff_by_role = {};
    for (const row of unwrap(staffByRoleRows)) {
      const key = String(row?.role || "").trim().toLowerCase();
      if (!key) continue;
      staff_by_role[key] = Number(row?.total || 0);
    }

    const doctorsTotal = Number(doctors[0]?.total || 0);
    const nursesTotal = Number(nurses[0]?.total || 0);
    const patientsTotal = Number(patients[0]?.total || 0);
    const appointmentsTotal = Number(appointments[0]?.total || 0);

    // Backward-compatible response shape (some pages read top-level keys; others read `data.*`).
    res.json({
      success: true,
      users: totalUsers,
      staff: totalUsers,
      doctors: doctorsTotal,
      nurses: nursesTotal,
      patients: patientsTotal,
      appointments: appointmentsTotal,
      staff_by_role,
      data: {
        users: totalUsers,
        staff: totalUsers,
        doctors: doctorsTotal,
        nurses: nursesTotal,
        patients: patientsTotal,
        appointments: appointmentsTotal,
        staff_by_role,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/users", authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const user = req.user || {};
    const hospitalId = user.role === "super_admin" ? req.query.hospital_id : user.hospital_id;
    const role = String(req.query.role || "").trim().toLowerCase();
    const q = String(req.query.q || "").trim();

    const users = await usersService.list(hospitalId || null, { role, q });
    res.json({ success: true, data: users, users });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/admin/create-user",
  authMiddleware,
  (req, res, next) => {
    const type = String(req.headers["content-type"] || "");
    if (!type.toLowerCase().includes("multipart/form-data")) return next();
    return staffUpload.fields([
      { name: "photo", maxCount: 1 },
      { name: "government_proof", maxCount: 1 },
      { name: "passbook_file", maxCount: 1 },
      { name: "certificate_file", maxCount: 1 },
    ])(req, res, next);
  },
  async (req, res, next) => {
  try {
    const mode = await getSchemaMode();
    if (mode === "legacy") {
      const role = normalizeRole(req.body.role);
      const hospitalId =
        req.user.role === "super_admin"
          ? req.body.hospital_id || null
          : req.user.hospital_id;

      const fullName =
        req.body.name ||
        [req.body.first_name, req.body.last_name].filter(Boolean).join(" ").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const phone = req.body.mobile || req.body.phone || null;
      const password = req.body.password || "Password@123";

      const photoFile = req.files?.photo?.[0] || null;
      const profileImage = photoFile ? String(photoFile.filename || "").trim() : "";

      const certificate = req.files?.certificate_file?.[0] || null;
      const certificatePath = certificate ? `staff/${String(certificate.filename || "").trim()}` : "";

      if (!role || !email || !fullName || !hospitalId) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      if (role === "doctor") {
        const qualification = String(req.body.qualification || "").trim();
        const expertiseArea = String(req.body.expertise_area || "").trim();
        const experienceYearsRaw = req.body.experience_years;
        const experienceYears = experienceYearsRaw === undefined || experienceYearsRaw === null || experienceYearsRaw === ""
          ? null
          : Number(experienceYearsRaw);

        if (!qualification || !expertiseArea || experienceYears === null || Number.isNaN(experienceYears) || experienceYears < 0 || !certificatePath) {
          return res.status(400).json({
            success: false,
            message: "Doctors require qualification, expertise_area, experience_years and certificate_file",
          });
        }
      }

      // Doctors + Nurses go to their tables; all other hospital staff go to `staff` table.
      const supportedRoleSet = new Set([
        "doctor",
        "nurse",
        "pharmacist",
        "receptionist",
        "labtechnician",
        "inventorymanager",
        "accountant",
        "admin",
      ]);

      if (!supportedRoleSet.has(role)) {
        return res.status(400).json({ success: false, message: `Unsupported role: ${role}` });
      }

      await usersService.create(
        {
          role,
          name: fullName,
          email,
          phone,
          password,
          department: req.body.department,
          specialization: req.body.specialization,
          qualification: req.body.qualification,
          experience_years: req.body.experience_years,
          expertise_area: req.body.expertise_area,
          certificate_file: certificatePath || "",
          profile_image: profileImage || "",
          status: req.body.status || "active",
          hospital_id: hospitalId,
        },
        hospitalId
      );

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const profileImageUrl = profileImage ? `${baseUrl}/uploads/profile_images/${profileImage}` : "";

      return res.status(201).json({
        success: true,
        message: "User created",
        profile_image: profileImage || "",
        profile_image_url: profileImageUrl,
        certificate_file: certificatePath || "",
      });
    }

    const roleRows = await query(`SELECT id FROM roles WHERE name = ?`, [req.body.role]);
    if (!roleRows.length) {
      return res.status(400).json({ success: false, message: "Role not found" });
    }

    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(req.body.password || "Password@123", 10);
    await query(
      `INSERT INTO users (hospital_id, role_id, employee_id, first_name, last_name, email, password_hash, phone, status, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        req.user.role === "super_admin" ? req.body.hospital_id || null : req.user.hospital_id,
        roleRows[0].id,
        req.body.employee_id || null,
        req.body.first_name,
        req.body.last_name,
        req.body.email,
        passwordHash,
        req.body.phone || null,
        req.body.status || "active",
      ]
    );

    res.status(201).json({ success: true, message: "User created" });
  } catch (error) {
    next(error);
  }
});

router.get("/hr/search", authMiddleware, async (req, res, next) => {
  try {
    const mode = await getSchemaMode();
    const hospitalId = req.user.hospital_id;
    const q = `%${req.query.q || ""}%`;
    const rows =
      mode === "legacy"
        ? await query(
            `(
              SELECT id, full_name AS first_name, '' AS last_name, email, phone, 'doctor' AS role
              FROM doctors
              WHERE hospital_id = ? AND (full_name LIKE ? OR email LIKE ?)
            )
            UNION ALL
            (
              SELECT id, full_name AS first_name, '' AS last_name, email, phone, 'nurse' AS role
              FROM nurses
              WHERE hospital_id = ? AND (full_name LIKE ? OR email LIKE ?)
            )
            UNION ALL
            (
              SELECT id, name AS first_name, '' AS last_name, email, phone, role
              FROM staff
              WHERE hospital_id = ? AND (name LIKE ? OR email LIKE ?)
            )
            ORDER BY first_name
            LIMIT 25`,
            [hospitalId, q, q, hospitalId, q, q, hospitalId, q, q]
          )
        : await query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, r.name AS role
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.hospital_id = ? AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)
             ORDER BY u.first_name, u.last_name
             LIMIT 25`,
            [hospitalId, q, q, q]
          );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/doctor/patients", authMiddleware, async (req, res, next) => {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) return res.json({ success: true, data: [] });
    const rows = await query(
      `SELECT DISTINCT p.*
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.doctor_id = ?
       ORDER BY p.created_at DESC`,
      [doctorId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/nurse/tasks", authMiddleware, async (req, res, next) => {
  try {
    const nurseId = req.user?.id;
    if (!nurseId) return res.json({ success: true, data: [] });

    const taskCols = await getTableColumns("nurse_tasks");
    if (!taskCols) return res.json({ success: true, data: [] });

    const taskIdCol = firstExistingColumn(taskCols, ["id", "task_id"]);
    const nurseIdCol = firstExistingColumn(taskCols, ["nurse_id"]);
    const titleCol = firstExistingColumn(taskCols, ["task_title", "title"]);
    const descCol = firstExistingColumn(taskCols, ["description"]);
    const statusCol = firstExistingColumn(taskCols, ["status"]);
    const updatedCol = firstExistingColumn(taskCols, ["updated_value"]);
    const patientIdCol = firstExistingColumn(taskCols, ["patient_id"]);
    const createdAtCol = firstExistingColumn(taskCols, ["created_at"]);
    const dueCol = firstExistingColumn(taskCols, ["due_at", "due_date"]);

    if (!taskIdCol || !nurseIdCol) return res.json({ success: true, data: [] });

    const patientCols = await getTableColumns("patients");
    const patientNameCol = firstExistingColumn(patientCols, ["full_name", "name"]);

    const select = [
      `nt.\`${taskIdCol}\` AS task_id`,
      titleCol ? `nt.\`${titleCol}\` AS task_title` : "'' AS task_title",
      descCol ? `nt.\`${descCol}\` AS description` : "'' AS description",
      statusCol ? `nt.\`${statusCol}\` AS status` : "'pending' AS status",
      updatedCol ? `nt.\`${updatedCol}\` AS updated_value` : "'' AS updated_value",
      patientIdCol ? `nt.\`${patientIdCol}\` AS patient_id` : "NULL AS patient_id",
      createdAtCol ? `nt.\`${createdAtCol}\` AS created_at` : "NULL AS created_at",
      dueCol ? `nt.\`${dueCol}\` AS due_at` : "NULL AS due_at",
    ];

    if (patientIdCol && patientCols && patientNameCol) {
      select.push(`p.\`${patientNameCol}\` AS patient_name`);
    } else {
      select.push("'Unassigned patient' AS patient_name");
    }

    const joinSql =
      patientIdCol && patientCols
        ? `LEFT JOIN patients p ON p.id = nt.\`${patientIdCol}\``
        : "";

    const orderCol = createdAtCol ? `nt.\`${createdAtCol}\`` : `nt.\`${taskIdCol}\``;

    const rows = await query(
      `SELECT ${select.join(", ")}
       FROM nurse_tasks nt
       ${joinSql}
       WHERE nt.\`${nurseIdCol}\` = ?
       ORDER BY ${orderCol} DESC, nt.\`${taskIdCol}\` DESC`,
      [nurseId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.put("/nurse/update-task/:id", authMiddleware, async (req, res, next) => {
  try {
    const nurseId = req.user?.id;
    if (!nurseId) return res.status(401).json({ success: false, message: "Authentication required" });

    const cols = await getTableColumns("nurse_tasks");
    if (!cols) return res.status(500).json({ success: false, message: "Tasks table not found" });

    const idCol = firstExistingColumn(cols, ["id", "task_id"]);
    const nurseIdCol = firstExistingColumn(cols, ["nurse_id"]);
    const statusCol = firstExistingColumn(cols, ["status"]);
    const descCol = firstExistingColumn(cols, ["description"]);
    const updatedCol = firstExistingColumn(cols, ["updated_value"]);

    if (!idCol) return res.status(500).json({ success: false, message: "Tasks table missing id column" });

    const updates = [];
    const params = [];

    if (updatedCol && req.body.updated_value !== undefined) {
      updates.push(`\`${updatedCol}\` = ?`);
      params.push(req.body.updated_value || null);
      if (statusCol && !req.body.status) {
        updates.push(`\`${statusCol}\` = 'completed'`);
      }
    }

    if (statusCol && req.body.status) {
      updates.push(`\`${statusCol}\` = ?`);
      params.push(req.body.status);
    }

    if (descCol && req.body.description !== undefined) {
      updates.push(`\`${descCol}\` = ?`);
      params.push(req.body.description || null);
    }

    if (!updates.length) {
      return res.json({ success: true, message: "No changes" });
    }

    params.push(req.params.id);
    if (nurseIdCol) {
      params.push(nurseId);
    }

    const whereSql = nurseIdCol ? `WHERE \`${idCol}\` = ? AND \`${nurseIdCol}\` = ?` : `WHERE \`${idCol}\` = ?`;
    const result = await query(`UPDATE nurse_tasks SET ${updates.join(", ")} ${whereSql}`, params);

    res.json({ success: true, message: "Task updated", data: result });
  } catch (error) {
    next(error);
  }
});

router.post("/register/create", authMiddleware, async (req, res, next) => {
  try {
    const patientsService = require("../modules/patients/service");

    const fullName = String(
      req.body.name ||
        req.body.full_name ||
        [req.body.first_name, req.body.last_name].filter(Boolean).join(" ")
    ).trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(
      req.body.mobile ||
        req.body.phone ||
        req.body.primaryPhone ||
        ""
    ).trim();

    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "name, email and phone are required",
      });
    }

    const scopedHospitalId = await resolveValidHospitalId(
      req.user.hospital_id || req.body.hospital_id || null
    );

    const created = await usersService.create(
      {
        role: "patient",
        name: fullName,
        email,
        phone,
        password: req.body.password || phone || "Patient@123",
        gender: req.body.gender,
        address: req.body.address,
        dob: req.body.dob || req.body.date_of_birth,
        date_of_birth: req.body.date_of_birth || req.body.dob,
        blood_group: req.body.blood_group || req.body.bloodGroup,
        state: req.body.state,
        country: req.body.country,
        pincode: req.body.pincode,
        age: req.body.age,
        status: "active",
      },
      scopedHospitalId
    );

    const patient = await patientsService.getById(created.id);

    res.status(201).json({
      success: true,
      message: "Patient created",
      patient: patient
        ? {
            ...patient,
            patient_id: patient.patient_id || patient.patient_id_no || patient.id,
            name: patient.full_name || patient.name || fullName,
            full_name: patient.full_name || patient.name || fullName,
            mobile: patient.mobile || patient.phone || phone,
            phone: patient.phone || patient.mobile || phone,
          }
        : {
            id: created.id,
            patient_id: created.id,
            name: fullName,
            full_name: fullName,
            email,
            mobile: phone,
            phone,
          },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/register/create-appointment", authMiddleware, async (req, res, next) => {
  try {
    const { getTableColumns, firstExistingColumn } = require("../services/dbMeta");
    const cols = await getTableColumns("appointments");
    if (!cols) return res.status(500).json({ success: false, message: "Appointments table not found" });
    const patientCols = await getTableColumns("patients");

    let resolvedPatientId = req.body.patient_id ?? null;
    if (patientCols && resolvedPatientId != null) {
      const patientIdCol = firstExistingColumn(patientCols, ["id"]);
      const externalPatientIdCol = firstExistingColumn(patientCols, ["patient_id", "patient_id_no"]);
      if (patientIdCol || externalPatientIdCol) {
        const patientRows = await query(
          `SELECT id, hospital_id
             FROM patients
            WHERE ${[patientIdCol ? `\`${patientIdCol}\` = ?` : null, externalPatientIdCol ? `\`${externalPatientIdCol}\` = ?` : null]
              .filter(Boolean)
              .join(" OR ")}
            ORDER BY id DESC
            LIMIT 1`,
          [resolvedPatientId, resolvedPatientId].slice(0, [patientIdCol, externalPatientIdCol].filter(Boolean).length)
        );
        if (patientRows[0]?.id) {
          resolvedPatientId = patientRows[0].id;
        }
      }
    }

    const resolvedHospitalId = req.user.hospital_id ?? req.body.hospital_id ?? null;
    const resolvedDate = req.body.appointment_date ?? req.body.date ?? null;
    const resolvedTime = req.body.appointment_time ?? req.body.time ?? null;

    const payload = {
      hospital_id: resolvedHospitalId,
      patient_id: resolvedPatientId,
      doctor_id: req.body.doctor_id ?? null,
      appointment_date: resolvedDate,
      appointment_time: resolvedTime,
      status: "scheduled",
    };

    const typeCol = firstExistingColumn(cols, ["type", "appointment_type"]);
    if (typeCol) payload[typeCol] = req.body.type || "consultation";

    const complaintCol = firstExistingColumn(cols, ["chief_complaint", "comments", "reason", "notes"]);
    if (complaintCol) payload[complaintCol] = req.body.chief_complaint || req.body.reason || req.body.comments || req.body.symptoms || req.body.notes || null;

    const insertCols = Object.keys(payload).filter((key) => cols.has(key));
    const placeholders = insertCols.map(() => "?").join(", ");
    await query(
      `INSERT INTO appointments (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
      insertCols.map((c) => payload[c])
    );
    res.status(201).json({ success: true, message: "Appointment created" });
  } catch (error) {
    next(error);
  }
});

router.post("/appointments/book", authMiddleware, async (req, res, next) => {
  try {
    const { getTableColumns, firstExistingColumn } = require("../services/dbMeta");
    const cols = await getTableColumns("appointments");
    if (!cols) return res.status(500).json({ success: false, message: "Appointments table not found" });
    const patientCols = await getTableColumns("patients");

    let resolvedPatientId = req.body.patient_id ?? null;
    if (patientCols && resolvedPatientId != null) {
      const patientIdCol = firstExistingColumn(patientCols, ["id"]);
      const externalPatientIdCol = firstExistingColumn(patientCols, ["patient_id", "patient_id_no"]);
      if (patientIdCol || externalPatientIdCol) {
        const patientRows = await query(
          `SELECT id, hospital_id
             FROM patients
            WHERE ${[patientIdCol ? `\`${patientIdCol}\` = ?` : null, externalPatientIdCol ? `\`${externalPatientIdCol}\` = ?` : null]
              .filter(Boolean)
              .join(" OR ")}
            ORDER BY id DESC
            LIMIT 1`,
          [resolvedPatientId, resolvedPatientId].slice(0, [patientIdCol, externalPatientIdCol].filter(Boolean).length)
        );
        if (patientRows[0]?.id) {
          resolvedPatientId = patientRows[0].id;
        }
      }
    }

    const resolvedHospitalId = req.user.hospital_id ?? req.body.hospital_id ?? null;
    const resolvedDate = req.body.appointment_date ?? req.body.date ?? null;
    const resolvedTime = req.body.appointment_time ?? req.body.time ?? null;

    const payload = {
      hospital_id: resolvedHospitalId,
      patient_id: resolvedPatientId,
      doctor_id: req.body.doctor_id ?? null,
      appointment_date: resolvedDate,
      appointment_time: resolvedTime,
      status: "scheduled",
    };

    const typeCol = firstExistingColumn(cols, ["type", "appointment_type"]);
    if (typeCol) payload[typeCol] = req.body.type || "consultation";

    const complaintCol = firstExistingColumn(cols, ["chief_complaint", "comments", "reason", "notes"]);
    if (complaintCol) payload[complaintCol] = req.body.reason || req.body.chief_complaint || req.body.comments || req.body.symptoms || req.body.notes || null;

    const insertCols = Object.keys(payload).filter((key) => cols.has(key));
    const placeholders = insertCols.map(() => "?").join(", ");
    const result = await query(
      `INSERT INTO appointments (${insertCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
      insertCols.map((c) => payload[c])
    );

    // Send WhatsApp confirmation (must not break booking if it fails)
    try {
      const appointmentId = result?.insertId;
      if (appointmentId) {
        const sendWhatsApp = require("../utils/whatsapp");
        const appointmentService = require("../modules/appointments/service");
        const { notifyAppointmentBooked } = require("../modules/notifications/appointmentEvents");
        const appt = await appointmentService.getById(appointmentId);

        const patientName = appt?.patient_name || appt?.patientName || "Patient";
        const doctorName = appt?.doctor_name || appt?.doctorName || "Doctor";
        const patientPhone = appt?.patient_phone || appt?.patientPhone || "";
        const dateValue = appt?.appointment_date || appt?.date || payload.appointment_date;
        const timeValue = appt?.appointment_time || appt?.time || payload.appointment_time;

        if (patientPhone) {
          const message = `Appointment Confirmed!\n\nPatient: ${patientName}\nDoctor: ${doctorName}\nDate: ${dateValue}\nTime: ${timeValue}\n\nThank you for choosing our hospital.`;
          await sendWhatsApp(patientPhone, message);
        } else {
          console.warn("WhatsApp skipped: patient phone not found for appointment", appointmentId);
        }

        // In-app notifications (patient + doctor)
        await notifyAppointmentBooked(appt);
      }
    } catch (err) {
      console.error("WhatsApp notification skipped:", err?.message || err);
    }

    res.status(201).json({
      success: true,
      message: "Appointment booked",
      appointment: { id: result?.insertId || null },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/appointments/status/:id", authMiddleware, async (req, res, next) => {
  try {
    const appointmentService = require("../modules/appointments/service");
    const { notifyAppointmentStatusChanged } = require("../modules/notifications/appointmentEvents");

    const before = await appointmentService.getById(req.params.id);
    const oldStatus = before?.status ?? null;

    await query(`UPDATE appointments SET status = ? WHERE id = ?`, [req.body.status, req.params.id]);

    try {
      if (before && req.body.status) {
        await notifyAppointmentStatusChanged({ ...before, status: req.body.status }, oldStatus, req.body.status);
      }
    } catch (err) {
      console.error("Appointment notification skipped:", err?.message || err);
    }
    res.json({ success: true, message: "Appointment status updated" });
  } catch (error) {
    next(error);
  }
});

router.get("/patient/profile", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT * FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`,
      [req.user.email, req.user.phone || ""]
    );
    const profile = rows[0] || null;
    const mapped = profile
      ? {
          ...profile,
          name: profile.name || profile.full_name,
          phone: profile.phone || profile.mobile,
          profile_image_url: profile.profile_image_url || profile.profile_image || profile.avatar_url || profile.photo_url,
        }
      : null;
    res.json({ success: true, data: mapped, ...(mapped || {}) });
  } catch (error) {
    next(error);
  }
});

router.put("/patient/profile", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`,
      [req.user.email, req.user.phone || ""]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    await query(
      `UPDATE patients
       SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), email = COALESCE(?, email),
           phone = COALESCE(?, phone), address = COALESCE(?, address), blood_group = COALESCE(?, blood_group)
       WHERE id = ?`,
      [req.body.first_name || null, req.body.last_name || null, req.body.email || null, req.body.phone || null, req.body.address || null, req.body.blood_group || null, rows[0].id]
    );
    res.json({ success: true, message: "Patient profile updated" });
  } catch (error) {
    next(error);
  }
});

router.get("/patient/medical-history", authMiddleware, async (req, res, next) => {
  try {
    const patientRows = await query(`SELECT id, hospital_id FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`, [req.user.email, req.user.phone || ""]);
    if (!patientRows.length) return res.json({ success: true, data: [] });
    const rows = await query(`SELECT * FROM patient_medical_history WHERE patient_id = ? ORDER BY created_at DESC`, [patientRows[0].id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/patient/medical-history", authMiddleware, async (req, res, next) => {
  try {
    const patientRows = await query(`SELECT id, hospital_id FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`, [req.user.email, req.user.phone || ""]);
    if (!patientRows.length) return res.status(404).json({ success: false, message: "Patient profile not found" });
    await query(
      `INSERT INTO patient_medical_history (patient_id, hospital_id, diagnosis, treatment, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [patientRows[0].id, patientRows[0].hospital_id, req.body.diagnosis || null, req.body.treatment || null, req.body.notes || null]
    );
    res.status(201).json({ success: true, message: "Medical history saved" });
  } catch (error) {
    next(error);
  }
});

router.get("/patient/emergency", authMiddleware, async (req, res, next) => {
  try {
    const patientRows = await query(`SELECT id FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`, [req.user.email, req.user.phone || ""]);
    if (!patientRows.length) return res.json({ success: true, data: null });
    const rows = await query(`SELECT * FROM patient_emergency_contacts WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1`, [patientRows[0].id]);
    const contact = rows[0] || null;
    const mapped = contact
      ? {
          ...contact,
          phone: contact.phone || contact.contact_phone,
          relation: contact.relation || contact.relationship_to_patient,
        }
      : null;
    res.json({ success: true, data: mapped, ...(mapped || {}) });
  } catch (error) {
    next(error);
  }
});

router.post("/patient/emergency", authMiddleware, async (req, res, next) => {
  try {
    const patientRows = await query(`SELECT id, hospital_id FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`, [req.user.email, req.user.phone || ""]);
    if (!patientRows.length) return res.status(404).json({ success: false, message: "Patient profile not found" });
    await query(
      `INSERT INTO patient_emergency_contacts (patient_id, hospital_id, contact_name, contact_phone, relationship_to_patient)
       VALUES (?, ?, ?, ?, ?)`,
      [patientRows[0].id, patientRows[0].hospital_id, req.body.contact_name || req.body.name || null, req.body.contact_phone || req.body.phone || null, req.body.relationship_to_patient || req.body.relation || null]
    );
    res.status(201).json({ success: true, message: "Emergency contact saved" });
  } catch (error) {
    next(error);
  }
});

router.get("/patient/documents", authMiddleware, async (req, res, next) => {
  try {
    const patientRows = await query(`SELECT id FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`, [req.user.email, req.user.phone || ""]);
    if (!patientRows.length) return res.json({ success: true, data: [] });
    const rows = await query(`SELECT * FROM patient_documents WHERE patient_id = ? ORDER BY created_at DESC`, [patientRows[0].id]);
    const documents = rows.map((row) => ({
      ...row,
      url: row.url || row.file_url || row.fileUrl || row.path,
      original_name: row.original_name || row.title || row.file_name || row.filename,
    }));
    res.json({ success: true, data: documents, documents });
  } catch (error) {
    next(error);
  }
});

router.post("/patient/upload-document", authMiddleware, upload.single("file"), async (req, res, next) => {
  try {
    const patientRows = await query(`SELECT id, hospital_id FROM patients WHERE email = ? OR phone = ? ORDER BY created_at DESC LIMIT 1`, [req.user.email, req.user.phone || ""]);
    if (!patientRows.length) return res.status(404).json({ success: false, message: "Patient profile not found" });
    const fileUrl = req.file ? `/uploads/patients/${path.basename(req.file.path)}` : null;
    await query(
      `INSERT INTO patient_documents (patient_id, hospital_id, title, file_url, document_type)
       VALUES (?, ?, ?, ?, ?)`,
      [patientRows[0].id, patientRows[0].hospital_id, req.body.title || req.file?.originalname || "Document", fileUrl, req.body.document_type || null]
    );
    res.status(201).json({ success: true, data: { file_url: fileUrl } });
  } catch (error) {
    next(error);
  }
});

router.post("/patient/profile-image", authMiddleware, upload.single("file"), async (req, res) => {
  const fileUrl = req.file ? `/uploads/patients/${path.basename(req.file.path)}` : null;
  res.status(201).json({ success: true, data: { file_url: fileUrl }, profile_image_url: fileUrl, file_url: fileUrl });
});

router.get("/inventory/expired", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT * FROM inventory_items
       WHERE hospital_id = ? AND supplier_name IS NOT NULL AND CURDATE() > COALESCE(NULL, CURDATE())`,
      [req.user.hospital_id]
    );
    res.json({ success: true, data: unwrap(rows) });
  } catch (error) {
    next(error);
  }
});

router.get("/inventory/analytics/consumption-monthly", authMiddleware, async (req, res) => {
  res.json({ success: true, data: [] });
});
router.get("/inventory/analytics/top-items", authMiddleware, async (req, res) => {
  const rows = await query(`SELECT name, quantity FROM inventory_items WHERE hospital_id = ? ORDER BY quantity DESC LIMIT 10`, [req.user.hospital_id]);
  res.json({ success: true, data: rows });
});
router.get("/inventory/analytics/stock-value", authMiddleware, async (req, res) => {
  const rows = await query(`SELECT SUM(quantity * unit_cost) AS value FROM inventory_items WHERE hospital_id = ?`, [req.user.hospital_id]);
  res.json({ success: true, data: rows[0] || { value: 0 } });
});
router.get("/inventory/analytics/expiry-soon", authMiddleware, async (req, res) => {
  res.json({ success: true, data: [] });
});
router.get("/inventory/settings/low", authMiddleware, async (req, res) => {
  res.json({ success: true, data: { threshold: 10 } });
});
router.post("/inventory/settings/auto-book", authMiddleware, async (req, res) => {
  res.json({ success: true, data: { enabled: true } });
});

router.get("/pharmacy/dashboard", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(`SELECT * FROM pharmacy_medicines WHERE hospital_id = ? ORDER BY created_at DESC`, [req.user.hospital_id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/super-admin/admins", authMiddleware, async (req, res, next) => {
  try {
    const mode = await getSchemaMode();
    const rows =
      mode === "legacy"
        ? await query(
            `SELECT id, hospital_id, full_name AS first_name, '' AS last_name, email, mobile AS phone, status, role
             FROM users
             WHERE role IN ('super_admin','hospital_admin')
             ORDER BY created_at DESC`
          )
        : await query(
            `SELECT u.id, u.hospital_id, u.first_name, u.last_name, u.email, u.phone, u.status
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE r.name IN ('super_admin','hospital_admin')
             ORDER BY u.created_at DESC`
          );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/super-admin/admins", authMiddleware, async (req, res, next) => {
  try {
    const mode = await getSchemaMode();
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(req.body.password || "Password@123", 10);
    if (mode === "legacy") {
      await query(
        `INSERT INTO users (hospital_id, full_name, email, password, mobile, role, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [
          req.body.hospital_id || null,
          [req.body.first_name, req.body.last_name].filter(Boolean).join(" ").trim(),
          req.body.email,
          passwordHash,
          req.body.phone || null,
          req.body.role || "hospital_admin",
        ]
      );
    } else {
      const roleName = req.body.role || "hospital_admin";
      const roleRows = await query(`SELECT id FROM roles WHERE name = ?`, [roleName]);
      await query(
        `INSERT INTO users (hospital_id, role_id, first_name, last_name, email, password_hash, phone, status, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', TRUE)`,
        [req.body.hospital_id || null, roleRows[0].id, req.body.first_name, req.body.last_name, req.body.email, passwordHash, req.body.phone || null]
      );
    }
    res.status(201).json({ success: true, message: "Admin created" });
  } catch (error) {
    next(error);
  }
});

router.put("/super-admin/admins/:id", authMiddleware, async (req, res, next) => {
  try {
    const mode = await getSchemaMode();
    if (mode === "legacy") {
      await query(
        `UPDATE users
         SET full_name = COALESCE(?, full_name), email = COALESCE(?, email), mobile = COALESCE(?, mobile),
             status = COALESCE(?, status), hospital_id = COALESCE(?, hospital_id), role = COALESCE(?, role)
         WHERE id = ?`,
        [
          [req.body.first_name, req.body.last_name].filter(Boolean).join(" ").trim() || null,
          req.body.email || null,
          req.body.phone || null,
          req.body.status || null,
          req.body.hospital_id || null,
          req.body.role || null,
          req.params.id,
        ]
      );
    } else {
      await query(
        `UPDATE users
         SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), email = COALESCE(?, email),
             phone = COALESCE(?, phone), status = COALESCE(?, status), hospital_id = COALESCE(?, hospital_id)
         WHERE id = ?`,
        [req.body.first_name || null, req.body.last_name || null, req.body.email || null, req.body.phone || null, req.body.status || null, req.body.hospital_id || null, req.params.id]
      );
    }
    res.json({ success: true, message: "Admin updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/super-admin/admins/:id", authMiddleware, async (req, res, next) => {
  try {
    await query(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: "Admin deleted" });
  } catch (error) {
    next(error);
  }
});

router.get("/doctors/hospital/:hospitalId", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT * FROM doctors WHERE hospital_id = ? ORDER BY full_name`,
      [req.params.hospitalId]
    );
    const doctors = rows.map((d) => ({
      ...d,
      name: d.name || d.full_name,
      doctor_id: d.doctor_id || d.id,
    }));
    res.json({ success: true, data: doctors, doctors });
  } catch (error) {
    next(error);
  }
});

router.put("/doctors/availability", authMiddleware, roleMiddleware("doctor", "super_admin", "hospital_admin"), async (req, res, next) => {
  try {
    const doctor = await resolveDoctorByUser(req.user);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found" });
    }

    await query(
      `INSERT INTO doctor_availability (doctor_id, available_date, available_time, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE available_date = VALUES(available_date), available_time = VALUES(available_time), status = VALUES(status)`,
      [
        doctor.id,
        req.body.available_date || null,
        req.body.available_time || null,
        req.body.status || "available",
      ]
    );

    res.json({ success: true, message: "Availability updated" });
  } catch (error) {
    next(error);
  }
});

router.get("/hr/nurses-list", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, full_name, email, phone, hospital_id FROM nurses WHERE hospital_id = ? ORDER BY full_name`,
      [req.user.hospital_id]
    );
    const nurses = rows.map((n) => ({
      ...n,
      employee_id: n.employee_id || n.id,
      name: n.name || n.full_name,
    }));
    res.json({ success: true, nurses, data: nurses });
  } catch (error) {
    next(error);
  }
});

router.get("/doctors/nurse-updates/:appointmentId", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id AS task_id, title AS task_title, description AS updated_value, status
       FROM nurse_tasks
       WHERE appointment_id = ?
       ORDER BY created_at DESC`,
      [req.params.appointmentId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/doctors/assign-task", authMiddleware, async (req, res, next) => {
  try {
    await query(
      `INSERT INTO nurse_tasks (appointment_id, doctor_id, nurse_id, patient_id, title, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.appointment_id,
        req.body.doctor_id || null,
        req.body.nurse_id,
        req.body.patient_id || null,
        req.body.task_title || "Nurse Task",
        req.body.description || "",
        req.body.status || "pending",
      ]
    );
    res.status(201).json({ success: true, message: "Task assigned" });
  } catch (error) {
    next(error);
  }
});

router.put("/doctors/update-status/:appointmentId", authMiddleware, async (req, res, next) => {
  try {
    await query(`UPDATE appointments SET status = ? WHERE id = ?`, [
      req.body.status || "completed",
      req.params.appointmentId,
    ]);
    res.json({ success: true, message: "Appointment status updated" });
  } catch (error) {
    next(error);
  }
});

router.post("/appointments/request-lab-test/:id", authMiddleware, async (req, res, next) => {
  try {
    const appointmentRows = await query(`SELECT * FROM appointments WHERE id = ?`, [req.params.id]);
    if (!appointmentRows.length) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    const appointment = appointmentRows[0];
    const doctorRows = appointment.doctor_id
      ? await query(`SELECT * FROM doctors WHERE id = ? LIMIT 1`, [appointment.doctor_id])
      : [];
    const doctor = doctorRows[0] || null;
    const resolvedHospitalId = appointment.hospital_id ?? req.user?.hospital_id ?? doctor?.hospital_id ?? null;

    if (appointment.hospital_id == null && resolvedHospitalId != null) {
      await query(`UPDATE appointments SET hospital_id = ? WHERE id = ?`, [resolvedHospitalId, appointment.id]);
      appointment.hospital_id = resolvedHospitalId;
    }

    const tests = Array.isArray(req.body.tests) ? req.body.tests : [];
    if (!tests.length) {
      return res.status(400).json({ success: false, message: "No tests provided" });
    }

    const labOrderCols = await getTableColumns("lab_orders");
    if (!labOrderCols) {
      return res.status(500).json({ success: false, message: "Lab orders table not available" });
    }

    const valuesTemplate = {
      hospital_id: firstExistingColumn(labOrderCols, ["hospital_id", "hospitalId"]),
      appointment_id: firstExistingColumn(labOrderCols, ["appointment_id", "appointmentId"]),
      patient_id: firstExistingColumn(labOrderCols, ["patient_id", "patientId"]),
      doctor_id: firstExistingColumn(labOrderCols, ["doctor_id", "doctorId"]),
      test_name: firstExistingColumn(labOrderCols, ["test_name", "testName", "title"]),
      notes: firstExistingColumn(labOrderCols, ["notes", "comment", "comments", "description"]),
      status: firstExistingColumn(labOrderCols, ["status"]),
    };

    for (const test of tests) {
      const insertValues = {};

      if (valuesTemplate.hospital_id) insertValues[valuesTemplate.hospital_id] = resolvedHospitalId;
      if (valuesTemplate.appointment_id) insertValues[valuesTemplate.appointment_id] = appointment.id;
      if (valuesTemplate.patient_id) insertValues[valuesTemplate.patient_id] = appointment.patient_id ?? null;
      if (valuesTemplate.doctor_id) insertValues[valuesTemplate.doctor_id] = appointment.doctor_id ?? null;
      if (valuesTemplate.test_name) insertValues[valuesTemplate.test_name] = test;
      if (valuesTemplate.notes) insertValues[valuesTemplate.notes] = req.body.notes || null;
      if (valuesTemplate.status) insertValues[valuesTemplate.status] = "pending";

      const insertColumns = Object.keys(insertValues);
      if (!insertColumns.length) {
        return res.status(500).json({ success: false, message: "Lab orders table is missing required columns" });
      }

      await query(
        `INSERT INTO lab_orders (${insertColumns.map((col) => `\`${col}\``).join(", ")})
         VALUES (${insertColumns.map(() => "?").join(", ")})`,
        insertColumns.map((col) => insertValues[col])
      );
    }

    res.status(201).json({ success: true, message: "Lab tests requested" });
  } catch (error) {
    next(error);
  }
});

router.get("/lab/appointment/:appointmentId", authMiddleware, async (req, res, next) => {
  try {
    const appointmentRows = await query(`SELECT * FROM appointments WHERE id = ? LIMIT 1`, [req.params.appointmentId]);
    const appointment = appointmentRows[0] || null;
    const labOrderCols = await getTableColumns("lab_orders");
    const labReportCols = await getTableColumns("lab_reports");
    const appointmentRefCol = firstExistingColumn(labOrderCols, ["appointment_id", "appointmentId"]);
    const orderPatientCol = firstExistingColumn(labOrderCols, ["patient_id", "patientId"]);
    const orderDoctorCol = firstExistingColumn(labOrderCols, ["doctor_id", "doctorId"]);
    const orderIdCol = firstExistingColumn(labOrderCols, ["id"]);
    const testNameCol = firstExistingColumn(labOrderCols, ["test_name", "testName", "title"]);
    const notesCol = firstExistingColumn(labOrderCols, ["notes", "comment", "comments", "description"]);
    const statusCol = firstExistingColumn(labOrderCols, ["status"]);
    const sortCol = firstExistingColumn(labOrderCols, ["created_at", "updated_at", "id"]);
    const reportUrlCol = firstExistingColumn(labReportCols, ["report_url", "file_url", "result"]);
    const reportOrderRefCol = firstExistingColumn(labReportCols, ["lab_order_id", "labOrderId", "test_id"]);
    const reportAppointmentRefCol = firstExistingColumn(labReportCols, ["appointment_id", "appointmentId"]);
    const reportPatientCol = firstExistingColumn(labReportCols, ["patient_id", "patientId"]);
    const reportDoctorCol = firstExistingColumn(labReportCols, ["doctor_id", "doctorId"]);
    const reportSortCol = firstExistingColumn(labReportCols, ["created_at", "updated_at", "id"]);
    const orderWhere = [];
    const orderParams = [];

    if (appointmentRefCol) {
      orderWhere.push(`lo.\`${appointmentRefCol}\` = ?`);
      orderParams.push(req.params.appointmentId);
    } else if (appointment && orderPatientCol) {
      orderWhere.push(`lo.\`${orderPatientCol}\` = ?`);
      orderParams.push(appointment.patient_id);
      if (orderDoctorCol && appointment.doctor_id) {
        orderWhere.push(`lo.\`${orderDoctorCol}\` = ?`);
        orderParams.push(appointment.doctor_id);
      }
    }

    let rows = await query(
      `SELECT lo.\`${orderIdCol || "id"}\` AS id,
              ${testNameCol ? `lo.\`${testNameCol}\`` : "NULL"} AS test_name,
              ${notesCol ? `lo.\`${notesCol}\`` : "NULL"} AS notes,
              ${statusCol ? `lo.\`${statusCol}\`` : "'pending'"} AS status,
              ${appointmentRefCol ? `lo.\`${appointmentRefCol}\`` : "NULL"} AS appointment_id,
              ${reportUrlCol && reportOrderRefCol ? `lr.\`${reportUrlCol}\`` : "NULL"} AS result
       FROM lab_orders lo
       ${reportUrlCol && reportOrderRefCol ? `LEFT JOIN lab_reports lr ON lr.\`${reportOrderRefCol}\` = lo.\`${orderIdCol || "id"}\`` : ""}
       ${orderWhere.length ? `WHERE ${orderWhere.join(" AND ")}` : ""}
       ORDER BY lo.\`${sortCol || "id"}\` DESC`,
      orderParams
    );
    if (!rows.length) {
      const reportWhere = [];
      const reportParams = [];

      if (reportAppointmentRefCol) {
        reportWhere.push(`\`${reportAppointmentRefCol}\` = ?`);
        reportParams.push(req.params.appointmentId);
      } else if (appointment && reportPatientCol) {
        reportWhere.push(`\`${reportPatientCol}\` = ?`);
        reportParams.push(appointment.patient_id);
        if (reportDoctorCol && appointment.doctor_id) {
          reportWhere.push(`\`${reportDoctorCol}\` = ?`);
          reportParams.push(appointment.doctor_id);
        }
      }

      rows = await query(
        `SELECT \`${firstExistingColumn(labReportCols, ["id"]) || "id"}\` AS id,
                ${firstExistingColumn(labReportCols, ["test_name", "testName", "title"]) ? `\`${firstExistingColumn(labReportCols, ["test_name", "testName", "title"])}\`` : "NULL"} AS test_name,
                ${firstExistingColumn(labReportCols, ["notes", "comment", "comments", "description", "findings", "result_summary"]) ? `\`${firstExistingColumn(labReportCols, ["notes", "comment", "comments", "description", "findings", "result_summary"])}\`` : "NULL"} AS notes,
                ${firstExistingColumn(labReportCols, ["status"]) ? `\`${firstExistingColumn(labReportCols, ["status"])}\`` : "'completed'"} AS status,
                ${reportAppointmentRefCol ? `\`${reportAppointmentRefCol}\`` : "NULL"} AS appointment_id,
                ${reportUrlCol ? `\`${reportUrlCol}\`` : "NULL"} AS result
         FROM lab_reports
         ${reportWhere.length ? `WHERE ${reportWhere.join(" AND ")}` : ""}
         ORDER BY \`${reportSortCol || "id"}\` DESC`,
        reportParams
      );
    }
    const data = rows.map((row) => ({
      ...row,
      testName: row.test_name || row.testName,
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/lab", authMiddleware, async (req, res, next) => {
  try {
    const labOrderCols = await getTableColumns("lab_orders");
    const patientCols = await getTableColumns("patients");
    const doctorCols = await getTableColumns("doctors");
    const appointmentCols = await getTableColumns("appointments");

    const patientNameCol = firstExistingColumn(patientCols, ["full_name", "name"]);
    const doctorNameCol = firstExistingColumn(doctorCols, ["full_name", "name"]);
    const labOrderHospitalCol = firstExistingColumn(labOrderCols, ["hospital_id", "hospitalId"]);
    const appointmentHospitalCol = firstExistingColumn(appointmentCols, ["hospital_id", "hospitalId"]);
    const patientHospitalCol = firstExistingColumn(patientCols, ["hospital_id", "hospitalId"]);
    const doctorHospitalCol = firstExistingColumn(doctorCols, ["hospital_id", "hospitalId"]);
    const labOrderSortCol = firstExistingColumn(labOrderCols, ["created_at", "updated_at", "id"]);
    const appointmentSortCol = firstExistingColumn(appointmentCols, ["created_at", "appointment_date", "id"]);

    const patientNameSelect = patientNameCol ? `p.\`${patientNameCol}\` AS patient_name` : "NULL AS patient_name";
    const doctorNameSelect = doctorNameCol ? `d.\`${doctorNameCol}\` AS doctor_name` : "NULL AS doctor_name";
    const hospitalFilterColumn = labOrderHospitalCol
      ? `lo.\`${labOrderHospitalCol}\``
      : appointmentHospitalCol || doctorHospitalCol || patientHospitalCol
        ? `COALESCE(${[
            appointmentHospitalCol ? `a.\`${appointmentHospitalCol}\`` : null,
            doctorHospitalCol ? `d.\`${doctorHospitalCol}\`` : null,
            patientHospitalCol ? `p.\`${patientHospitalCol}\`` : null,
          ].filter(Boolean).join(", ")})`
        : null;
    const orderByClause = labOrderSortCol
      ? `lo.\`${labOrderSortCol}\` DESC`
      : appointmentSortCol
        ? `a.\`${appointmentSortCol}\` DESC`
        : "lo.id DESC";

    const joins = [
      "LEFT JOIN patients p ON p.id = lo.patient_id",
      "LEFT JOIN doctors d ON d.id = lo.doctor_id",
    ];

    if (appointmentHospitalCol) {
      joins.push("LEFT JOIN appointments a ON a.id = lo.appointment_id");
    }

    const sql = `
      SELECT lo.*, ${patientNameSelect}, ${doctorNameSelect}
      FROM lab_orders lo
      ${joins.join("\n      ")}
      ${hospitalFilterColumn && req.user?.hospital_id != null ? `WHERE ${hospitalFilterColumn} = ?` : ""}
      ORDER BY ${orderByClause}
    `;

    const rows = await query(
      sql,
      hospitalFilterColumn && req.user?.hospital_id != null ? [req.user.hospital_id] : []
    );
    const data = rows.map((row) => ({
      ...row,
      testName: row.test_name || row.testName,
      patientName: row.patientName || row.patient_name,
      doctorName: row.doctorName || row.doctor_name,
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/lab/update-result/:id", authMiddleware, labUpload.array("reports"), async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const uploaded = files.map((file) => `/uploads/lab/${path.basename(file.path)}`);

    const labOrderCols = await getTableColumns("lab_orders");
    const labReportCols = await getTableColumns("lab_reports");
    const orderRows = await query(`SELECT * FROM lab_orders WHERE id = ? LIMIT 1`, [req.params.id]);
    const order = orderRows[0] || null;

    if (!order) {
      return res.status(404).json({ success: false, message: "Lab order not found" });
    }

    const orderStatusCol = firstExistingColumn(labOrderCols, ["status"]);
    const orderNotesCol = firstExistingColumn(labOrderCols, ["notes", "comment", "comments", "description"]);
    const orderUpdates = [];
    const orderParams = [];

    if (orderStatusCol) {
      orderUpdates.push(`\`${orderStatusCol}\` = ?`);
      orderParams.push("completed");
    }

    if (orderNotesCol && req.body.comment) {
      orderUpdates.push(`\`${orderNotesCol}\` = COALESCE(?, \`${orderNotesCol}\`)`);
      orderParams.push(req.body.comment);
    }

    if (orderUpdates.length) {
      orderParams.push(req.params.id);
      await query(`UPDATE lab_orders SET ${orderUpdates.join(", ")} WHERE id = ?`, orderParams);
    }

    const reportValues = {};
    const reportOrderRefCol = firstExistingColumn(labReportCols, ["lab_order_id", "labOrderId", "test_id"]);
    const reportUrlCol = firstExistingColumn(labReportCols, ["report_url", "file_url"]);
    const reportResultCol = firstExistingColumn(labReportCols, ["result"]);
    const reportStatusCol = firstExistingColumn(labReportCols, ["status"]);
    const reportNotesCol = firstExistingColumn(labReportCols, ["notes", "comment", "comments", "description", "findings", "result_summary"]);
    const reportPatientCol = firstExistingColumn(labReportCols, ["patient_id", "patientId"]);
    const reportDoctorCol = firstExistingColumn(labReportCols, ["doctor_id", "doctorId"]);
    const reportHospitalCol = firstExistingColumn(labReportCols, ["hospital_id", "hospitalId"]);
    const reportAppointmentCol = firstExistingColumn(labReportCols, ["appointment_id", "appointmentId"]);
    const reportTestNameCol = firstExistingColumn(labReportCols, ["test_name", "testName", "title"]);
    const reportDateCol = firstExistingColumn(labReportCols, ["report_date"]);

    if (reportOrderRefCol) reportValues[reportOrderRefCol] = req.params.id;
    if (reportUrlCol) reportValues[reportUrlCol] = uploaded[0] || null;
    if (reportResultCol) reportValues[reportResultCol] = JSON.stringify(uploaded);
    if (reportStatusCol) reportValues[reportStatusCol] = "completed";
    if (reportNotesCol) reportValues[reportNotesCol] = req.body.comment || null;
    if (reportPatientCol) reportValues[reportPatientCol] = order.patient_id ?? null;
    if (reportDoctorCol) reportValues[reportDoctorCol] = order.doctor_id ?? null;
    if (reportHospitalCol) reportValues[reportHospitalCol] = order.hospital_id ?? req.user?.hospital_id ?? null;
    if (reportAppointmentCol) reportValues[reportAppointmentCol] = order.appointment_id ?? null;
    if (reportTestNameCol) reportValues[reportTestNameCol] = order.test_name || "Lab Report";
    if (reportDateCol) reportValues[reportDateCol] = new Date().toISOString().slice(0, 10);

    const reportColumns = Object.keys(reportValues);
    if (reportColumns.length) {
      await query(
        `INSERT INTO lab_reports (${reportColumns.map((col) => `\`${col}\``).join(", ")})
         VALUES (${reportColumns.map(() => "?").join(", ")})`,
        reportColumns.map((col) => reportValues[col])
      );
    }

    res.status(201).json({ success: true, message: "Report updated" });
  } catch (error) {
    next(error);
  }
});

router.get("/patients/all", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT * FROM patients WHERE hospital_id = ? ORDER BY created_at DESC, id DESC`,
      [req.user.hospital_id]
    );
    const patients = rows.map((p) => ({
      ...p,
      patient_id: p.patient_id || p.id,
      name: p.name || p.full_name,
    }));
    res.json({ success: true, data: patients, patients });
  } catch (error) {
    next(error);
  }
});

router.get("/reports", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT * FROM lab_reports WHERE hospital_id = ? ORDER BY created_at DESC`,
      [req.user.hospital_id]
    );
    res.json({ success: true, data: rows, reports: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/reports/patient/:patientId", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT * FROM lab_reports WHERE patient_id = ? ORDER BY created_at DESC`,
      [req.params.patientId]
    );
    res.json({ success: true, data: rows, reports: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/reports/generate", authMiddleware, async (req, res, next) => {
  try {
    await query(
      `INSERT INTO lab_reports (patient_id, hospital_id, status)
       VALUES (?, ?, 'pending')`,
      [req.body.patient_id, req.user.hospital_id]
    );
    res.status(201).json({ success: true, message: "Report generated" });
  } catch (error) {
    next(error);
  }
});

router.post("/billing/create", authMiddleware, async (req, res, next) => {
  try {
    const invoiceCols = await getTableColumns("invoices");
    if (!invoiceCols) {
      return res.status(500).json({ success: false, message: "Invoices table not found" });
    }

    const invoiceItemCols = await getTableColumns("invoice_items");
    const paymentCols = await getTableColumns("payments");

    const resolveStatus = (value) => {
      const normalized = String(value || "").toLowerCase().trim();
      return normalized === "paid" ? "paid" : "unpaid";
    };

    const resolveSettlementFromRequest = ({ paymentStatus, paymentScope, totalAmount, surgeryTotal, bedTotal, customPaidAmount }) => {
      const normalizedStatus = String(paymentStatus || "").toLowerCase().trim();
      const normalizedScope = String(paymentScope || "").toLowerCase().trim();
      const total = safeNumber(totalAmount);
      const surgery = safeNumber(surgeryTotal);
      const bed = safeNumber(bedTotal);
      const custom = safeNumber(customPaidAmount);

      if (normalizedStatus === "paid") {
        return {
          payment_status: "paid",
          settlement_scope: normalizedScope || "full_bill",
          paid_amount: total,
          due_amount: 0,
        };
      }

      if (normalizedScope === "surgery_only" && surgery > 0) {
        return {
          payment_status: "surgery_paid",
          settlement_scope: "surgery_only",
          paid_amount: Math.min(surgery, total),
          due_amount: Math.max(total - surgery, 0),
        };
      }

      if (normalizedScope === "bed_only" && bed > 0) {
        return {
          payment_status: "bed_paid",
          settlement_scope: "bed_only",
          paid_amount: Math.min(bed, total),
          due_amount: Math.max(total - bed, 0),
        };
      }

      if (normalizedScope === "custom" && custom > 0) {
        return {
          payment_status: custom >= total ? "paid" : "partially_paid",
          settlement_scope: "custom",
          paid_amount: Math.min(custom, total),
          due_amount: Math.max(total - custom, 0),
        };
      }

      return {
        payment_status: normalizedStatus || "unpaid",
        settlement_scope: normalizedScope || "none",
        paid_amount: 0,
        due_amount: total,
      };
    };

    const resolvePaymentStatus = (value) => {
      const normalized = String(value || "").toLowerCase().trim();
      if (normalized === "paid") return "completed";
      if (normalized === "failed") return "failed";
      return "pending";
    };

    const safeNumber = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    const normalizedSurgeries = Array.isArray(req.body.surgeries)
      ? req.body.surgeries
          .map((item) => ({
            surgery_name: String(item?.surgery_name || "").trim(),
            surgery_cost: safeNumber(item?.surgery_cost),
            surgery_date: item?.surgery_date || null,
            billing_type: String(item?.billing_type || "surgery").trim(),
            notes: String(item?.notes || "").trim(),
          }))
          .filter((item) => item.surgery_name || item.surgery_cost > 0)
      : [];

    const bedPrice = safeNumber(req.body.bed_price);
    const bedTotal = req.body.billing_mode === "full"
      ? safeNumber(req.body.bed_total) || (
          req.body.admission_date && req.body.discharge_date
            ? Math.max(
                1,
                Math.round(
                  (new Date(req.body.discharge_date) - new Date(req.body.admission_date)) /
                    (1000 * 60 * 60 * 24)
                )
              ) * bedPrice
            : 0
        )
      : 0;
    const surgeryTotal = normalizedSurgeries.reduce((sum, item) => sum + safeNumber(item.surgery_cost), 0);
    const subtotal = safeNumber(req.body.subtotal) || bedTotal + surgeryTotal;
    const totalAmount = safeNumber(req.body.grand_total ?? req.body.total_amount) || subtotal;
    const settlement = resolveSettlementFromRequest({
      paymentStatus: req.body.payment_status,
      paymentScope: req.body.payment_scope,
      totalAmount,
      surgeryTotal,
      bedTotal,
      customPaidAmount: req.body.paid_amount,
    });

    const values = {};

    if (invoiceCols.has("hospital_id")) {
      values.hospital_id = await resolveValidHospitalId(req.user.hospital_id || req.body.hospital_id || null);
    }
    if (invoiceCols.has("patient_id")) {
      values.patient_id = req.body.patient_id || null;
    }
    if (invoiceCols.has("invoice_number")) {
      values.invoice_number = req.body.invoice_number || `INV-${Date.now()}`;
    }
    if (invoiceCols.has("appointment_id")) {
      values.appointment_id = req.body.appointment_id || null;
    }
    if (invoiceCols.has("subtotal")) {
      values.subtotal = subtotal;
    }
    if (invoiceCols.has("tax_amount")) {
      values.tax_amount = safeNumber(req.body.tax_amount);
    }
    if (invoiceCols.has("discount_amount")) {
      values.discount_amount = safeNumber(req.body.discount_amount);
    }
    if (invoiceCols.has("total_amount")) {
      values.total_amount = totalAmount;
    }
    if (invoiceCols.has("bed_total")) {
      values.bed_total = bedTotal;
    }
    if (invoiceCols.has("surgery_total")) {
      values.surgery_total = surgeryTotal;
    }
    if (invoiceCols.has("paid_amount")) {
      values.paid_amount = settlement.paid_amount;
    }
    if (invoiceCols.has("due_amount")) {
      values.due_amount = settlement.due_amount;
    }
    if (invoiceCols.has("status")) {
      values.status = settlement.due_amount <= 0 ? "paid" : "unpaid";
    }
    if (invoiceCols.has("payment_status")) {
      values.payment_status = settlement.payment_status;
    }
    if (invoiceCols.has("settlement_scope")) {
      values.settlement_scope = settlement.settlement_scope;
    }
    if (invoiceCols.has("payment_note")) {
      values.payment_note = req.body.payment_note || null;
    }
    if (invoiceCols.has("payment_method")) {
      values.payment_method = req.body.payment_method || null;
    }
    if (invoiceCols.has("transaction_id")) {
      values.transaction_id = req.body.transaction_id || null;
    }
    if (invoiceCols.has("billing_mode")) {
      values.billing_mode = req.body.billing_mode || "full";
    }
    if (invoiceCols.has("admission_date")) {
      values.admission_date = req.body.admission_date || null;
    }
    if (invoiceCols.has("discharge_date")) {
      values.discharge_date = req.body.discharge_date || null;
    }
    if (invoiceCols.has("bed_type")) {
      values.bed_type = req.body.bed_type || null;
    }
    if (invoiceCols.has("bed_number")) {
      values.bed_number = req.body.bed_number || null;
    }
    if (invoiceCols.has("bed_price")) {
      values.bed_price = bedPrice || null;
    }
    if (invoiceCols.has("due_date")) {
      values.due_date = req.body.due_date || req.body.discharge_date || null;
    }

    const insertCols = Object.keys(values).filter((key) => values[key] !== undefined);
    if (!insertCols.length) {
      return res.status(400).json({ success: false, message: "No compatible invoice fields found" });
    }

    const connection = await getConnection();
    let invoiceId = null;
    try {
      await connection.beginTransaction();

      const [invoiceResult] = await connection.execute(
        `INSERT INTO invoices (${insertCols.map((col) => `\`${col}\``).join(", ")})
         VALUES (${insertCols.map(() => "?").join(", ")})`,
        insertCols.map((col) => values[col] ?? null)
      );

      invoiceId = invoiceResult?.insertId || null;

      if (invoiceId && invoiceItemCols) {
        const itemRows = [];

        if (bedTotal > 0) {
          itemRows.push({
            item_name: req.body.bed_type
              ? `Bed Charges (${req.body.bed_type})`
              : "Bed Charges",
            price: bedTotal,
            quantity: 1,
            notes: [req.body.bed_number ? `Bed ${req.body.bed_number}` : "", req.body.admission_date && req.body.discharge_date ? `${req.body.admission_date} to ${req.body.discharge_date}` : ""]
              .filter(Boolean)
              .join(" | "),
            service_date: req.body.admission_date || null,
            billing_type: "bed",
          });
        }

        normalizedSurgeries.forEach((item) => {
          itemRows.push({
            item_name: item.surgery_name || "Surgery Charge",
            price: safeNumber(item.surgery_cost),
            quantity: 1,
            notes: item.notes || null,
            service_date: item.surgery_date || null,
            billing_type: item.billing_type || "surgery",
          });
        });

        for (const row of itemRows) {
          const itemValues = {};
          if (invoiceItemCols.has("invoice_id")) itemValues.invoice_id = invoiceId;
          if (invoiceItemCols.has("item_name")) itemValues.item_name = row.item_name;
          if (invoiceItemCols.has("price")) itemValues.price = row.price;
          if (invoiceItemCols.has("quantity")) itemValues.quantity = row.quantity;
          if (invoiceItemCols.has("notes")) itemValues.notes = row.notes;
          if (invoiceItemCols.has("service_date")) itemValues.service_date = row.service_date;
          if (invoiceItemCols.has("billing_type")) itemValues.billing_type = row.billing_type;

          const itemCols = Object.keys(itemValues).filter((key) => itemValues[key] !== undefined);
          if (!itemCols.length) continue;

          await connection.execute(
            `INSERT INTO invoice_items (${itemCols.map((col) => `\`${col}\``).join(", ")})
             VALUES (${itemCols.map(() => "?").join(", ")})`,
            itemCols.map((col) => itemValues[col] ?? null)
          );
        }
      }

      if (invoiceId && paymentCols) {
        const paymentValues = {};
        if (paymentCols.has("invoice_id")) paymentValues.invoice_id = invoiceId;
        if (paymentCols.has("hospital_id")) paymentValues.hospital_id = values.hospital_id ?? null;
        if (paymentCols.has("patient_id")) paymentValues.patient_id = req.body.patient_id || null;
        if (paymentCols.has("amount")) paymentValues.amount = totalAmount;
        if (paymentCols.has("method")) paymentValues.method = req.body.payment_method || null;
        if (paymentCols.has("reference_no")) paymentValues.reference_no = req.body.transaction_id || null;
        if (paymentCols.has("status")) paymentValues.status = settlement.due_amount <= 0 ? "completed" : settlement.paid_amount > 0 ? "partial" : resolvePaymentStatus(req.body.payment_status);
        if (paymentCols.has("payment_date")) paymentValues.payment_date = new Date();

        const paymentInsertCols = Object.keys(paymentValues).filter((key) => paymentValues[key] !== undefined);
        if (paymentInsertCols.length) {
          await connection.execute(
            `INSERT INTO payments (${paymentInsertCols.map((col) => `\`${col}\``).join(", ")})
             VALUES (${paymentInsertCols.map(() => "?").join(", ")})`,
            paymentInsertCols.map((col) => paymentValues[col] ?? null)
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(201).json({
      success: true,
      message: "Billing saved",
      invoice: {
        id: invoiceId,
        invoice_number: values.invoice_number || null,
        total_amount: totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/register/dashboard", authMiddleware, async (req, res, next) => {
  try {
    const { getTableColumns, firstExistingColumn } = require("../services/dbMeta");
    const date = req.query.date || null;
    const hospitalId = req.user.hospital_id || req.user.hospitalId || null;
    const selectedDate = date || new Date().toISOString().split("T")[0];
    const patientCols = await getTableColumns("patients");
    const doctorCols = await getTableColumns("doctors");
    const patientNameCol = firstExistingColumn(patientCols, ["full_name", "name", "first_name"]);
    const patientDisplayIdCol = firstExistingColumn(patientCols, ["patient_id", "patient_id_no"]);
    const doctorNameCol = firstExistingColumn(doctorCols, ["full_name", "name", "first_name"]);
    const patientNameSelect = patientNameCol ? `p.\`${patientNameCol}\` AS patient_name` : "NULL AS patient_name";
    const patientDisplayIdSelect = patientDisplayIdCol ? `p.\`${patientDisplayIdCol}\` AS display_patient_id` : "NULL AS display_patient_id";
    const doctorNameSelect = doctorNameCol ? `d.\`${doctorNameCol}\` AS doctor_name` : "NULL AS doctor_name";

    const [patientsCount, todayAppointments] = await Promise.all([
      hospitalId
        ? query(`SELECT COUNT(*) AS total FROM patients WHERE hospital_id = ?`, [hospitalId])
        : query(`SELECT COUNT(*) AS total FROM patients`),
      hospitalId
        ? query(
            `SELECT COUNT(*) AS total
               FROM appointments a
               LEFT JOIN patients p ON p.id = a.patient_id
              WHERE COALESCE(a.hospital_id, p.hospital_id) = ?
                AND a.appointment_date = ?`,
            [hospitalId, selectedDate]
          )
        : query(`SELECT COUNT(*) AS total FROM appointments WHERE appointment_date = ?`, [selectedDate]),
    ]);

    const rows = await query(
      `SELECT a.*,
              ${patientNameSelect},
              ${patientDisplayIdSelect},
              ${doctorNameSelect}
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN doctors d ON d.id = a.doctor_id
       WHERE ${hospitalId ? "COALESCE(a.hospital_id, p.hospital_id) = ? AND" : ""} a.appointment_date = ?
       ORDER BY a.appointment_time ASC`,
      hospitalId ? [hospitalId, selectedDate] : [selectedDate]
    );

    const list = rows.map((row) => ({
      ...row,
      patient_id: row.display_patient_id || row.patient_id,
      appointment_patient_id: row.patient_id,
      patientName: row.patient_name,
      doctorName: row.doctor_name,
      time: row.appointment_time,
      date: row.appointment_date,
      paymentStatus: row.payment_status || "pending",
    }));

    res.json({
      success: true,
      totalPatients: patientsCount[0]?.total || 0,
      appointmentsToday: todayAppointments[0]?.total || 0,
      paid: list.filter((item) => String(item.paymentStatus || "").toLowerCase() === "paid").length,
      unpaid: list.filter((item) => ["pending", "unpaid"].includes(String(item.paymentStatus || "").toLowerCase())).length,
      list,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/appointments/my", authMiddleware, async (req, res, next) => {
  try {
    const patient = await resolvePatientByUser(req.user);
    if (!patient) {
      return res.json({ success: true, appointments: [], data: [] });
    }
    const rows = await query(
      `SELECT a.*, d.full_name AS doctor_name
       FROM appointments a
       LEFT JOIN doctors d ON d.id = a.doctor_id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [patient.id]
    );
    const appointments = rows.map(normalizeAppointmentRow);
    res.json({ success: true, data: appointments, appointments });
  } catch (error) {
    next(error);
  }
});

router.patch("/appointments/update/:id", authMiddleware, async (req, res, next) => {
  try {
    await query(`UPDATE appointments SET appointment_date = ? WHERE id = ?`, [req.body.date, req.params.id]);
    res.json({ success: true, message: "Appointment rescheduled" });
  } catch (error) {
    next(error);
  }
});

router.patch("/appointments/cancel/:id", authMiddleware, async (req, res, next) => {
  try {
    const appointmentService = require("../modules/appointments/service");
    const { notifyAppointmentStatusChanged } = require("../modules/notifications/appointmentEvents");

    const before = await appointmentService.getById(req.params.id);
    const oldStatus = before?.status ?? null;

    await query(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`, [req.params.id]);

    try {
      if (before) {
        await notifyAppointmentStatusChanged({ ...before, status: "cancelled" }, oldStatus, "cancelled");
      }
    } catch (err) {
      console.error("Appointment notification skipped:", err?.message || err);
    }
    res.json({ success: true, message: "Appointment cancelled" });
  } catch (error) {
    next(error);
  }
});

router.delete("/appointments/delete/:id", authMiddleware, async (req, res, next) => {
  try {
    await query(`DELETE FROM appointments WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: "Appointment deleted" });
  } catch (error) {
    next(error);
  }
});

router.get("/payments/history/:appointmentId", authMiddleware, async (req, res, next) => {
  try {
    let rows = [];
    try {
      rows = await query(`SELECT * FROM payments WHERE appointment_id = ? ORDER BY payment_date DESC, id DESC`, [req.params.appointmentId]);
    } catch (innerError) {
      rows = await query(`SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC, id DESC`, [req.params.appointmentId]);
    }
    res.json({ success: true, payments: rows, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/claims/active/count", authMiddleware, async (req, res, next) => {
  try {
    const patient = await resolvePatientByUser(req.user);
    if (!patient) return res.json({ success: true, count: 0 });
    const rows = await query(
      `SELECT COUNT(*) AS total FROM insurance_claims WHERE patient_id = ? AND status = 'active'`,
      [patient.id]
    );
    res.json({ success: true, count: rows[0]?.total || 0 });
  } catch (error) {
    next(error);
  }
});

router.get("/lab/reports/pending/count", authMiddleware, async (req, res, next) => {
  try {
    const patient = await resolvePatientByUser(req.user);
    if (!patient) return res.json({ success: true, count: 0 });
    const rows = await query(
      `SELECT COUNT(*) AS total FROM lab_reports WHERE patient_id = ? AND status = 'pending'`,
      [patient.id]
    );
    res.json({ success: true, count: rows[0]?.total || 0 });
  } catch (error) {
    next(error);
  }
});

router.get("/analytics/export", authMiddleware, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, name, quantity, unit_cost FROM inventory_items WHERE hospital_id = ? ORDER BY name`,
      [req.user.hospital_id]
    );
    const header = "id,name,quantity,unit_cost";
    const lines = rows.map((r) => `${r.id},${r.name},${r.quantity},${r.unit_cost}`);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=inventory.csv");
    res.send([header, ...lines].join("\n"));
  } catch (error) {
    next(error);
  }
});

router.post("/ambulance/request", authMiddleware, roleMiddleware("patient"), async (req, res, next) => {
  try {
    const patientId = req.user?.id || null;
    let hospitalId =
      req.user?.hospital_id ||
      req.body.hospital_id ||
      req.body.hospitalId ||
      req.query.hospital_id ||
      null;

    if (!patientId) {
      return res.status(400).json({ success: false, message: "Patient not found for current user" });
    }

    if (!hospitalId) {
      // Best-effort: try to resolve hospital_id from patient row (legacy schemas sometimes omit req.user.hospital_id).
      try {
        const patientCols = await getTableColumns("patients");
        const patientIdCol = firstExistingColumn(patientCols, ["id", "patient_id", "user_id"]);
        const patientHospitalCol = firstExistingColumn(patientCols, ["hospital_id", "hospitalId"]);
        if (patientCols && patientIdCol && patientHospitalCol) {
          const rows = await query(
            `SELECT \`${patientHospitalCol}\` AS hospital_id FROM patients WHERE \`${patientIdCol}\` = ? LIMIT 1`,
            [patientId]
          );
          if (rows.length && rows[0]?.hospital_id) hospitalId = rows[0].hospital_id;
        }
      } catch (err) {
        // ignore
      }
    }

    if (!hospitalId) {
      // Best-effort: infer hospital_id from latest appointment if present.
      try {
        const apptCols = await getTableColumns("appointments");
        const apptHospitalCol = firstExistingColumn(apptCols, ["hospital_id"]);
        const apptPatientCol = firstExistingColumn(apptCols, ["patient_id"]);
        if (apptCols && apptHospitalCol && apptPatientCol) {
          const rows = await query(
            `SELECT \`${apptHospitalCol}\` AS hospital_id FROM appointments WHERE \`${apptPatientCol}\` = ? AND \`${apptHospitalCol}\` IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1`,
            [patientId]
          );
          if (rows.length && rows[0]?.hospital_id) hospitalId = rows[0].hospital_id;
        }
      } catch (err) {
        // ignore
      }
    }

    const pickupAddress = req.body.pickup_address || req.body.pickup_location || req.body.pickupAddress || null;
    const dropAddress = req.body.drop_address || req.body.destination || req.body.dropAddress || null;

    if (!hospitalId && dropAddress) {
      // Best-effort: resolve hospital_id by hospital name when user has no stored hospital_id.
      try {
        const hospCols = await getTableColumns("hospitals");
        const hospIdCol = firstExistingColumn(hospCols, ["id", "hospital_id"]);
        const hospNameCol = firstExistingColumn(hospCols, ["name", "hospital_name"]);
        if (hospCols && hospIdCol && hospNameCol) {
          const rows = await query(
            `SELECT \`${hospIdCol}\` AS id
             FROM hospitals
             WHERE LOWER(\`${hospNameCol}\`) LIKE LOWER(?)
             ORDER BY LENGTH(\`${hospNameCol}\`) ASC
             LIMIT 1`,
            [`%${String(dropAddress).trim()}%`]
          );
          if (rows.length && rows[0]?.id) hospitalId = rows[0].id;
        }
      } catch (err) {
        // ignore
      }
    }

    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "Hospital not found for current user" });
    }

    const ambulanceType = req.body.ambulance_type || req.body.type || req.body.ambulanceType || null;
    const pickupTimeRaw = req.body.pickup_time || req.body.pickupTime || null;
    const contactPhone = req.body.contact_phone || req.body.contactPhone || null;

    if (!pickupAddress || !dropAddress || !contactPhone) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Some schemas define `pickup_time` as DATETIME; UI often sends only "HH:mm".
    // Normalize to "YYYY-MM-DD HH:mm:ss" so it works for DATETIME and still stores fine in VARCHAR/TEXT.
    let pickupTime = pickupTimeRaw;
    if (pickupTimeRaw) {
      const raw = String(pickupTimeRaw).trim();
      const timeOnlyMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (timeOnlyMatch) {
        const hh = timeOnlyMatch[1].padStart(2, "0");
        const mm = timeOnlyMatch[2];
        const ss = (timeOnlyMatch[3] || "00").padStart(2, "0");
        const today = new Date().toISOString().split("T")[0];
        pickupTime = `${today} ${hh}:${mm}:${ss}`;
      }
    }

    const result = await query(
      `INSERT INTO ambulance_requests (hospital_id, patient_id, pickup_address, drop_address, ambulance_type, pickup_time, contact_phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hospitalId,
        patientId,
        pickupAddress,
        dropAddress,
        ambulanceType,
        pickupTime,
        contactPhone,
        "pending",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Ambulance requested",
      request_id: result?.insertId || null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/ambulance/my-requests", authMiddleware, roleMiddleware("patient"), async (req, res, next) => {
  try {
    const patientId = req.user?.id || null;
    const hospitalId = req.user?.hospital_id || req.query.hospital_id || null;
    if (!patientId) return res.json({ success: true, data: [] });

    const where = hospitalId ? "WHERE hospital_id = ? AND patient_id = ?" : "WHERE patient_id = ?";
    const params = hospitalId ? [hospitalId, patientId] : [patientId];

    const rows = await query(
      `SELECT *
       FROM ambulance_requests
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT 10`,
      params
    );

    res.json({ success: true, data: rows, requests: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/ambulance/requests", authMiddleware, roleMiddleware("hospital_admin", "super_admin"), async (req, res, next) => {
  try {
    const scopedHospitalId =
      req.user?.role === "super_admin" ? (req.query.hospital_id || null) : (req.user?.hospital_id || null);

    if (!scopedHospitalId) {
      return res.status(400).json({ success: false, message: "Hospital not found for current user" });
    }

    const statusParam = String(req.query.status || "pending").trim().toLowerCase();
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);

    const ACTIVE_STATUSES = ["pending", "assigned", "enroute", "arrived"];
    const parseStatuses = (value) => {
      const raw = String(value || "").trim().toLowerCase();
      if (!raw) return ["pending"];
      if (raw === "active") return ACTIVE_STATUSES;
      if (raw === "all") return [];
      const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
      return parts.length ? parts : [raw];
    };
    const statuses = parseStatuses(statusParam);

    const patientCols = await getTableColumns("patients");
    const patientIdCol = firstExistingColumn(patientCols, ["id", "patient_id", "user_id"]);
    const patientNameCol = firstExistingColumn(patientCols, ["full_name", "name"]);
    const patientPhoneCol = firstExistingColumn(patientCols, ["phone", "mobile"]);

    const select = [
      "ar.*",
      patientNameCol ? `p.\`${patientNameCol}\` AS patient_name` : "NULL AS patient_name",
      patientPhoneCol ? `p.\`${patientPhoneCol}\` AS patient_phone` : "NULL AS patient_phone",
    ];

    const where = ["ar.hospital_id = ?"];
    const params = [scopedHospitalId];

    if (statuses.length) {
      where.push(`LOWER(ar.status) IN (${statuses.map(() => "?").join(", ")})`);
      params.push(...statuses);
    }

    const rows = await query(
      `SELECT ${select.join(", ")}
       FROM ambulance_requests ar
       LEFT JOIN patients p ON ${patientIdCol ? `p.\`${patientIdCol}\`` : "p.id"} = ar.patient_id
       WHERE ${where.join(" AND ")}
       ORDER BY ar.created_at DESC, ar.id DESC
       LIMIT ${limit}`,
      params
    );

    res.json({ success: true, data: rows, requests: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/ambulances/available", authMiddleware, roleMiddleware("hospital_admin", "super_admin"), async (req, res, next) => {
  try {
    const hospitalId =
      req.user?.role === "super_admin" ? (req.query.hospital_id || null) : (req.user?.hospital_id || null);

    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "Hospital not found for current user" });
    }

    const rows = await query(
      `SELECT id, vehicle_no, type, driver_name, driver_phone, status
       FROM ambulances
       WHERE hospital_id = ? AND LOWER(status) = 'available'
       ORDER BY vehicle_no`,
      [hospitalId]
    );
    res.json({ success: true, data: rows, ambulances: rows });
  } catch (error) {
    next(error);
  }
});

router.put("/admin/ambulance/requests/:id/assign", authMiddleware, roleMiddleware("hospital_admin", "super_admin"), async (req, res, next) => {
  try {
    const hospitalId =
      req.user?.role === "super_admin" ? (req.body.hospital_id || req.query.hospital_id || null) : (req.user?.hospital_id || null);

    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "Hospital not found for current user" });
    }

    const requestId = req.params.id;
    const ambulanceId = req.body.ambulance_id || req.body.ambulanceId || null;
    const driverName = req.body.driver_name || req.body.driverName || null;
    const driverPhone = req.body.driver_phone || req.body.driverPhone || null;
    const etaMinutes = req.body.eta_minutes ?? req.body.etaMinutes ?? null;

    if (!requestId || !ambulanceId) {
      return res.status(400).json({ success: false, message: "Missing request_id or ambulance_id" });
    }

    const reqRows = await query(
      `SELECT id, status FROM ambulance_requests WHERE id = ? AND hospital_id = ? LIMIT 1`,
      [requestId, hospitalId]
    );
    if (!reqRows.length) return res.status(404).json({ success: false, message: "Request not found" });

    const ambRows = await query(
      `SELECT id, status, driver_name, driver_phone FROM ambulances WHERE id = ? AND hospital_id = ? LIMIT 1`,
      [ambulanceId, hospitalId]
    );
    if (!ambRows.length) return res.status(404).json({ success: false, message: "Ambulance not found" });

    const ambStatus = String(ambRows[0]?.status || "").toLowerCase();
    if (ambStatus && ambStatus !== "available") {
      return res.status(400).json({ success: false, message: "Ambulance is not available" });
    }

    const resolvedDriverName = driverName || ambRows[0]?.driver_name || null;
    const resolvedDriverPhone = driverPhone || ambRows[0]?.driver_phone || null;

    await query(
      `UPDATE ambulance_requests
       SET ambulance_id = ?, driver_name = ?, driver_phone = ?, eta_minutes = ?, status = 'assigned'
       WHERE id = ? AND hospital_id = ?`,
      [ambulanceId, resolvedDriverName, resolvedDriverPhone, etaMinutes ?? null, requestId, hospitalId]
    );

    // Mark ambulance busy (fallback to dispatched for schemas that use enums).
    try {
      await query(`UPDATE ambulances SET status = 'busy' WHERE id = ? AND hospital_id = ?`, [ambulanceId, hospitalId]);
    } catch (err) {
      await query(`UPDATE ambulances SET status = 'dispatched' WHERE id = ? AND hospital_id = ?`, [ambulanceId, hospitalId]);
    }

    res.json({ success: true, message: "Ambulance assigned" });
  } catch (error) {
    next(error);
  }
});

router.put("/admin/ambulance/requests/:id/status", authMiddleware, roleMiddleware("hospital_admin", "super_admin"), async (req, res, next) => {
  try {
    const hospitalId =
      req.user?.role === "super_admin" ? (req.body.hospital_id || req.query.hospital_id || null) : (req.user?.hospital_id || null);
    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "Hospital not found for current user" });
    }

    const requestId = req.params.id;
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!requestId || !status) {
      return res.status(400).json({ success: false, message: "Missing request id or status" });
    }

    const rows = await query(
      `SELECT id, ambulance_id FROM ambulance_requests WHERE id = ? AND hospital_id = ? LIMIT 1`,
      [requestId, hospitalId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Request not found" });

    const ambulanceId = rows[0]?.ambulance_id || null;

    // Try requested status; fallback for schemas that use "en_route".
    if (status === "enroute") {
      try {
        await query(`UPDATE ambulance_requests SET status = 'enroute' WHERE id = ? AND hospital_id = ?`, [requestId, hospitalId]);
      } catch (err) {
        await query(`UPDATE ambulance_requests SET status = 'en_route' WHERE id = ? AND hospital_id = ?`, [requestId, hospitalId]);
      }
      return res.json({ success: true, message: "Trip started" });
    }

    if (status === "completed") {
      await query(`UPDATE ambulance_requests SET status = 'completed' WHERE id = ? AND hospital_id = ?`, [requestId, hospitalId]);
      if (ambulanceId) {
        await query(`UPDATE ambulances SET status = 'available' WHERE id = ? AND hospital_id = ?`, [ambulanceId, hospitalId]);
      }
      return res.json({ success: true, message: "Trip completed" });
    }

    return res.status(400).json({ success: false, message: "Unsupported status transition" });
  } catch (error) {
    next(error);
  }
});

router.get("/patient/dashboard", authMiddleware, async (req, res, next) => {
  try {
    const patient = await resolvePatientByUser(req.user);
    if (!patient) {
      return res.json({ success: true, data: null });
    }

    const [appointments, labReports, documents] = await Promise.all([
      query(
        `SELECT a.*, d.full_name AS doctor_name
         FROM appointments a
         LEFT JOIN doctors d ON d.id = a.doctor_id
         WHERE a.patient_id = ?
         ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
        [patient.id]
      ),
      query(`SELECT * FROM lab_reports WHERE patient_id = ? ORDER BY created_at DESC`, [patient.id]),
      query(`SELECT * FROM patient_documents WHERE patient_id = ? ORDER BY created_at DESC`, [patient.id]),
    ]);

    res.json({
      success: true,
      data: {
        patient,
        appointments: appointments.map(normalizeAppointmentRow),
        labReports,
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/doctor/dashboard", authMiddleware, async (req, res, next) => {
  try {
    const doctor = await resolveDoctorByUser(req.user);
    if (!doctor) {
      return res.json({ success: true, data: null });
    }

    const [appointments, patients] = await Promise.all([
      query(
        `SELECT a.*, p.full_name AS patient_name
         FROM appointments a
         LEFT JOIN patients p ON p.id = a.patient_id
         WHERE a.doctor_id = ?
         ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
        [doctor.id]
      ),
      query(
        `SELECT DISTINCT p.*
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.doctor_id = ?
         ORDER BY p.created_at DESC`,
        [doctor.id]
      ),
    ]);

    res.json({
      success: true,
      data: {
        doctor,
        appointments: appointments.map(normalizeAppointmentRow),
        patients,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/dashboard", authMiddleware, async (req, res, next) => {
  try {
    const hospitalId = req.user?.hospital_id;
    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "Hospital not found for current user" });
    }

    const [doctors, nurses, staff, patients, appointments] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM doctors WHERE hospital_id = ?`, [hospitalId]),
      query(`SELECT COUNT(*) AS total FROM nurses WHERE hospital_id = ?`, [hospitalId]),
      query(`SELECT COUNT(*) AS total FROM staff WHERE hospital_id = ?`, [hospitalId]),
      query(`SELECT COUNT(*) AS total FROM patients WHERE hospital_id = ?`, [hospitalId]),
      query(`SELECT COUNT(*) AS total FROM appointments WHERE hospital_id = ?`, [hospitalId]),
    ]);

    res.json({
      success: true,
      data: {
        staff:
          Number(doctors[0]?.total || 0) +
          Number(nurses[0]?.total || 0) +
          Number(staff[0]?.total || 0),
        patients: patients[0]?.total || 0,
        appointments: appointments[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/super-admin/dashboard", authMiddleware, async (req, res, next) => {
  try {
    const [hospitals, users, appointments] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM hospitals`),
      query(`SELECT COUNT(*) AS total FROM users`),
      query(`SELECT COUNT(*) AS total FROM appointments`),
    ]);

    res.json({
      success: true,
      data: {
        hospitals: hospitals[0]?.total || 0,
        users: users[0]?.total || 0,
        appointments: appointments[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
