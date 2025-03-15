const logger = require('../utils/logger');

/**
 * Custom application error class
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code
   */
  constructor(message, statusCode = 500, code = 'SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper to catch async errors
 * @param {Function} fn - Async function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'SERVER_ERROR';
  let errors = err.errors || null;
  
  // Log error
  if (statusCode >= 500) {
    logger.error(`${code}: ${message}`, {
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      user: req.user ? req.user.id : null,
      stack: err.stack
    });
  } else {
    logger.warn(`${code}: ${message}`, {
      url: req.originalUrl,
      method: req.method,
      user: req.user ? req.user.id : null
    });
  }
  
  // Handle specific error types
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation error';
    errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    code,
    message,
    errors,
    // Include stack trace in development mode
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 Not Found handler middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  // Skip for HTML requests (let the frontend handle routing)
  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    return next();
  }
  
  const error = new AppError(`Resource not found: ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

module.exports = {
  AppError,
  asyncHandler,
  errorHandler,
  notFoundHandler
}; 