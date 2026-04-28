function normalizeRoleAlias(value) {
  const role = String(value || "").toLowerCase().trim();
  if (role === "reception" || role === "receptionist") return "register";
  if (role === "labtechnician" || role === "lab_technician" || role === "lab technician") return "lab";
  if (role === "inventorymanager" || role === "inventory_manager") return "inventory";
  if (role === "hrmanager" || role === "hr_manager" || role === "hr manager") return "hr";
  if (role === "insurance_manager" || role === "insurance manager" || role === "insurancemanager") return "insurance";
  if (role === "superadmin" || role === "super-admin") return "super_admin";
  if (role === "administrator") return "hospital_admin";
  return role;
}

function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const actorRole = normalizeRoleAlias(req.user.role);
    const allowed = roles.map((r) => normalizeRoleAlias(r));

    if (!allowed.includes(actorRole)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  };
}

function hospitalScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const actorRole = normalizeRoleAlias(req.user.role);

  if (actorRole === "patient") {
    return next();
  }

  if (actorRole === "super_admin") {
    return next();
  }

  const body = req.body || {};
  const scopedHospitalId =
    req.headers["x-hospital-id"] ||
    req.query.hospital_id ||
    body.hospital_id ||
    body.hospitalId ||
    req.params.hospitalId;

  if (scopedHospitalId && String(scopedHospitalId) !== String(req.user.hospital_id)) {
    return res.status(403).json({ success: false, message: "Hospital access denied" });
  }

  req.hospitalId = req.user.hospital_id;
  next();
}

function selfOrRoles(getTargetUserId, ...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    const targetUserId = getTargetUserId(req);
    if (targetUserId && targetUserId === req.user.id) {
      return next();
    }

    return res.status(403).json({ success: false, message: "Forbidden" });
  };
}

module.exports = {
  roleMiddleware,
  hospitalScope,
  selfOrRoles,
};
