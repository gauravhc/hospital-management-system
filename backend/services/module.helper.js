function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function ok(res, data, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function getScopedHospitalId(req, fallback = null) {
  const body = req.body || {};
  return (
    req.hospitalId ||
    req.query.hospital_id ||
    body.hospital_id ||
    body.hospitalId ||
    fallback
  );
}

module.exports = {
  asyncHandler,
  ok,
  getScopedHospitalId,
};
