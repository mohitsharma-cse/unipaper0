export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  if (err.name === 'MulterError') {
    err.statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  }

  if (err.name === 'ValidationError') {
    err.statusCode = 400;
  }

  if (err.code === 11000) {
    err.statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    err.message = `A record with the same ${field} already exists. Choose a different value.`;
  }

  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = 'Invalid ID format.';
  }

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};
