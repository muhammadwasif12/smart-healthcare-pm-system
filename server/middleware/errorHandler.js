/**
 * Global Error Handler Middleware
 * 
 * Catches all unhandled errors and returns a consistent JSON response.
 * Status code comes from error.status (set by services) or defaults to 500.
 */

function errorHandler(err, req, res, _next) {
  const status  = err.status || 500;
  const message = err.message || 'Internal server error';

  // Log server errors (not client errors)
  if (status >= 500) {
    console.error(`❌ [${req.method} ${req.path}]`, err);
  }

  res.status(status).json({
    error: true,
    status,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
