const service = require("./service");
const usersService = require("../users/service");
const { query } = require("../../config/database");
const { getTableColumns, firstExistingColumn } = require("../../services/dbMeta");
const { ok, getScopedHospitalId } = require("../../services/module.helper");

const normalizeProfileImage = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("profile_images/")) return raw;
  if (raw.startsWith("uploads/")) return raw.replace(/^uploads\//, "");
  if (raw.startsWith("/uploads/")) return raw.replace(/^\/uploads\//, "");
  return raw;
};

const buildProfileImageUrl = (profileImage) => {
  const normalized = normalizeProfileImage(profileImage);
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.includes("/")) return `/uploads/${normalized}`;
  return `/uploads/profile_images/${normalized}`;
};

async function list(req, res) {
  const rows = await service.list(getScopedHospitalId(req));
  const doctors = rows.map((row) => ({
    ...row,
    name: row.name || row.full_name,
    username: row.username || row.full_name,
    doctor_id: row.doctor_id || row.id,
    department: row.department || row.specialization,
  }));
  return res.json({ success: true, message: "Success", data: doctors, doctors });
}
async function listByHospital(req, res) {
  const rows = await service.list(req.params.hospitalId);
  const doctors = rows.map((row) => ({
    ...row,
    name: row.name || row.full_name,
    username: row.username || row.full_name,
    doctor_id: row.doctor_id || row.id,
    department: row.department || row.specialization,
  }));
  return res.json({ success: true, message: "Success", data: doctors, doctors });
}
async function create(req, res) { await service.create(req.body, getScopedHospitalId(req)); return ok(res, null, "Doctor created", 201); }
async function getById(req, res) {
  const row = await service.getById(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Doctor not found" });
  const doctor = {
    ...row,
    name: row.name || row.full_name,
    username: row.username || row.full_name,
    doctor_id: row.doctor_id || row.id,
    department: row.department || row.specialization,
  };
  return res.json({ success: true, message: "Success", data: doctor, doctor, ...doctor });
}
async function update(req, res) { await service.update(req.params.id, req.body); return ok(res, null, "Doctor updated"); }
async function remove(req, res) { await service.remove(req.params.id); return ok(res, null, "Doctor deleted"); }
async function appointments(req, res) { return ok(res, await service.appointments(req.params.id)); }
async function schedule(req, res) { return ok(res, await service.schedule(req.params.id)); }
async function updateSchedule(req, res) { await service.updateSchedule(req.params.id, req.body); return ok(res, null, "Schedule updated"); }
async function updateAvailability(req, res) {
  const role = String(req.user?.role || "").toLowerCase().trim();
  const doctorId = role === "doctor" ? req.user.id : (req.body.doctor_id || req.body.doctorId || null);
  await service.updateAvailability(
    {
      doctor_id: doctorId,
      available_date: req.body.available_date || req.body.availableDate || null,
      available_time: req.body.available_time || req.body.availableTime || null,
      status: req.body.status || "available",
    },
    req.user
  );
  return ok(res, null, "Availability updated");
}

async function getProfile(req, res) {
  const doctorId = req.user?.id;
  if (!doctorId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const doctor = await service.getById(doctorId);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

  // Best-effort merge with ERP `users` table if this doctor row references it.
  let merged = doctor;
  const userId = doctor.user_id || doctor.userId || null;
  if (userId) {
    try {
      const userCols = await getTableColumns("users");
      if (userCols) {
        const idCol = firstExistingColumn(userCols, ["id"]);
        const firstNameCol = firstExistingColumn(userCols, ["first_name"]);
        const lastNameCol = firstExistingColumn(userCols, ["last_name"]);
        const emailCol = firstExistingColumn(userCols, ["email"]);
        const phoneCol = firstExistingColumn(userCols, ["phone"]);
        const genderCol = firstExistingColumn(userCols, ["gender"]);
        const dobCol = firstExistingColumn(userCols, ["date_of_birth"]);

        const select = [];
        if (idCol) select.push(`\`${idCol}\` AS id`);
        if (firstNameCol) select.push(`\`${firstNameCol}\` AS first_name`);
        if (lastNameCol) select.push(`\`${lastNameCol}\` AS last_name`);
        if (emailCol) select.push(`\`${emailCol}\` AS email`);
        if (phoneCol) select.push(`\`${phoneCol}\` AS phone`);
        if (genderCol) select.push(`\`${genderCol}\` AS gender`);
        if (dobCol) select.push(`\`${dobCol}\` AS date_of_birth`);

        if (idCol && select.length) {
          const rows = await query(`SELECT ${select.join(", ")} FROM \`users\` WHERE \`${idCol}\` = ? LIMIT 1`, [userId]);
          if (rows.length) merged = { ...doctor, user: rows[0], ...rows[0] };
        }
      }
    } catch {
      // ignore merge failures
    }
  }

  const displayName =
    merged.full_name ||
    merged.name ||
    merged.fullName ||
    (merged.first_name || merged.last_name ? [merged.first_name, merged.last_name].filter(Boolean).join(" ") : "") ||
    "";

  const profileImage = normalizeProfileImage(merged.profile_image || merged.profile_image_url || "");
  return res.json({
    success: true,
    message: "Success",
    data: {
      ...merged,
      name: displayName || merged.name || merged.full_name || "",
      profile_image: profileImage,
      profile_image_url: buildProfileImageUrl(profileImage),
    },
  });
}

async function updateSelfProfile(req, res) {
  const doctorId = req.user?.id;
  if (!doctorId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const payload = req.body || {};
  const updatePayload = {
    role: "doctor",
    name: payload.name ?? payload.full_name ?? payload.fullName,
    phone: payload.phone ?? payload.mobile,
    gender: payload.gender,
    specialization: payload.specialization,
    department: payload.department,
    dob: payload.dob,
    date_of_birth: payload.date_of_birth,
  };

  await usersService.update(doctorId, updatePayload);

  // Best-effort sync to `users` when doctor row references it.
  try {
    const doctorRow = await service.getById(doctorId);
    const userId = doctorRow?.user_id || null;
    if (userId) {
      const userCols = await getTableColumns("users");
      if (userCols) {
        const idCol = firstExistingColumn(userCols, ["id"]);
        const updates = [];
        const params = [];

        const firstNameCol = firstExistingColumn(userCols, ["first_name"]);
        const lastNameCol = firstExistingColumn(userCols, ["last_name"]);
        const phoneCol = firstExistingColumn(userCols, ["phone"]);
        const genderCol = firstExistingColumn(userCols, ["gender"]);
        const dobCol = firstExistingColumn(userCols, ["date_of_birth"]);

        if (firstNameCol || lastNameCol) {
          const parts = String(updatePayload.name || "").trim().split(/\s+/).filter(Boolean);
          const first = parts[0] || null;
          const last = parts.length > 1 ? parts.slice(1).join(" ") : null;
          if (firstNameCol && updatePayload.name !== undefined) {
            updates.push(`\`${firstNameCol}\` = ?`);
            params.push(first);
          }
          if (lastNameCol && updatePayload.name !== undefined) {
            updates.push(`\`${lastNameCol}\` = ?`);
            params.push(last);
          }
        }
        if (phoneCol && updatePayload.phone !== undefined) {
          updates.push(`\`${phoneCol}\` = ?`);
          params.push(updatePayload.phone || null);
        }
        if (genderCol && updatePayload.gender !== undefined) {
          updates.push(`\`${genderCol}\` = ?`);
          params.push(updatePayload.gender || null);
        }
        const nextDob = updatePayload.dob || updatePayload.date_of_birth;
        if (dobCol && nextDob !== undefined) {
          updates.push(`\`${dobCol}\` = ?`);
          params.push(nextDob || null);
        }

        if (idCol && updates.length) {
          params.push(userId);
          await query(`UPDATE \`users\` SET ${updates.join(", ")} WHERE \`${idCol}\` = ?`, params);
        }
      }
    }
  } catch {
    // ignore sync failures
  }

  // Return fresh profile.
  return getProfile(req, res);
}

async function updateProfile(req, res) {
  const doctorId = req.user?.id;
  if (!doctorId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const fileName = req.file?.filename ? String(req.file.filename).trim() : "";
  if (!fileName) return res.status(400).json({ success: false, message: "profile_image file is required" });

  const profileImage = `profile_images/${fileName}`;

  // 1) Update doctor role table (preferred for auth/profile).
  await usersService.update(doctorId, { role: "doctor", profile_image: profileImage });

  // 2) Best-effort sync to `users` (legacy join queries rely on it).
  try {
    const userCols = await getTableColumns("users");
    if (userCols) {
      const idCol = firstExistingColumn(userCols, ["id", "user_id"]);
      const imageCol = firstExistingColumn(userCols, ["profile_image", "avatar_url", "photo_url", "profile_image_url"]);

      let userId = null;
      const doctorCols = await getTableColumns("doctors");
      const doctorUserIdCol = doctorCols ? firstExistingColumn(doctorCols, ["user_id"]) : null;
      if (doctorCols && doctorUserIdCol) {
        const rows = await query(`SELECT \`${doctorUserIdCol}\` AS user_id FROM doctors WHERE id = ? LIMIT 1`, [doctorId]);
        userId = rows[0]?.user_id || null;
      } else {
        userId = doctorId;
      }

      if (idCol && imageCol && userId) {
        await query(`UPDATE \`users\` SET \`${imageCol}\` = ? WHERE \`${idCol}\` = ?`, [profileImage, userId]);
      }
    }
  } catch {
    // ignore sync failures
  }

  return res.json({
    success: true,
    message: "Profile image updated successfully",
    profile_image: profileImage,
    profile_image_url: buildProfileImageUrl(profileImage),
  });
}

module.exports = { list, listByHospital, create, getById, update, remove, appointments, schedule, updateSchedule, updateAvailability, getProfile, updateSelfProfile, updateProfile };
