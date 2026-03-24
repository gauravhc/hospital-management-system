const service = require("./service");
const { ok } = require("../../services/module.helper");

function resolveBaseUrl(req) {
  const envBase = String(process.env.BASE_URL || process.env.APP_URL || "").trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0]
    .trim();
  const host = String(req.headers["x-forwarded-host"] || req.get("host") || "").split(",")[0].trim();
  return host ? `${proto}://${host}` : "";
}

async function login(req, res) {
  const result = await service.login(req.body.email, req.body.password);
  if (!result) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const baseUrl = resolveBaseUrl(req);
  const user = result.user || {};
  const profileImage = String(user.profile_image || "").trim();
  let profileImageUrl = String(user.profile_image_url || "").trim();

  if (!profileImageUrl && profileImage) {
    profileImageUrl = `/uploads/profile_images/${profileImage}`;
  }
  if (profileImageUrl && baseUrl && !/^https?:\/\//i.test(profileImageUrl)) {
    profileImageUrl = `${baseUrl}${profileImageUrl.startsWith("/") ? "" : "/"}${profileImageUrl}`;
  }

  return res.status(200).json({
    success: true,
    message: "Login successful",
    token: result.token,
    user: {
      ...user,
      profile_image_url: profileImageUrl,
      profile_image: profileImage,
    },
    user_id: result.user?.id ?? null,
    role: result.user?.role ?? null,
    hospital_id: result.user?.hospital_id ?? null,
    data: result,
  });
}

async function register(req, res) {
  return ok(res, await service.register(req.body), "User registered", 201);
}

async function logout(req, res) {
  return ok(res, null, "Logout successful");
}

async function profile(req, res) {
  return ok(res, await service.getProfile(req.user.id, req.user.role));
}

async function changePassword(req, res) {
  await service.changePassword(req.user.id, req.user.role, req.body.currentPassword, req.body.newPassword);
  return ok(res, null, "Password changed successfully");
}

module.exports = { login, register, logout, profile, changePassword };
