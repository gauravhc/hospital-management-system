const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, 'Record already exists with that value', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return errorResponse(res, 'Referenced record does not exist', 400);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 'File size too large', 400);
  }

  return errorResponse(res, err.message || 'Internal server error', err.status || 500);
};

const notFound = (req, res) => {
  return errorResponse(res, `Route ${req.method} ${req.path} not found`, 404);
};

module.exports = { errorHandler, notFound };
