/**
 * Input Validation Middleware
 * 
 * Reusable validators for common patterns.
 * Each returns an Express middleware that validates req.body
 * and calls next(err) with a 400-status error on failure.
 */

/**
 * Require that specific fields exist in req.body.
 * @param  {...string} fields — field names that must be present and non-empty
 */
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => {
      const val = req.body[f];
      return val === undefined || val === null || val === '';
    });
    if (missing.length) {
      const err = new Error(`Missing required fields: ${missing.join(', ')}`);
      err.status = 400;
      return next(err);
    }
    next();
  };
}

/**
 * Validate date fields are in YYYY-MM-DD format.
 * @param  {...string} fields — field names to check
 */
function validateDates(...fields) {
  return (req, res, next) => {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    for (const f of fields) {
      const val = req.body[f];
      if (val !== undefined && val !== null && val !== '') {
        if (!dateRe.test(val)) {
          const err = new Error(`Invalid date format for "${f}": expected YYYY-MM-DD`);
          err.status = 400;
          return next(err);
        }
      }
    }
    next();
  };
}

/**
 * Validate that end date >= start date.
 * @param {string} startField — field name for start date
 * @param {string} endField   — field name for end date
 */
function validateDateRange(startField, endField) {
  return (req, res, next) => {
    const start = req.body[startField];
    const end   = req.body[endField];
    if (start && end && end < start) {
      const err = new Error(`"${endField}" must be on or after "${startField}"`);
      err.status = 400;
      return next(err);
    }
    next();
  };
}

/**
 * Validate numeric fields are within a range.
 * @param {string} field — field name
 * @param {number} min   — minimum allowed value (inclusive)
 * @param {number} max   — maximum allowed value (inclusive)
 */
function validateRange(field, min, max) {
  return (req, res, next) => {
    const val = req.body[field];
    if (val !== undefined && val !== null) {
      const num = Number(val);
      if (isNaN(num) || num < min || num > max) {
        const err = new Error(`"${field}" must be between ${min} and ${max}`);
        err.status = 400;
        return next(err);
      }
    }
    next();
  };
}

/**
 * Validate that a field value is in a set of allowed values.
 * @param {string}   field   — field name
 * @param {string[]} allowed — array of allowed values
 */
function validateEnum(field, allowed) {
  return (req, res, next) => {
    const val = req.body[field];
    if (val !== undefined && val !== null && val !== '') {
      if (!allowed.includes(val)) {
        const err = new Error(`"${field}" must be one of: ${allowed.join(', ')}`);
        err.status = 400;
        return next(err);
      }
    }
    next();
  };
}

/**
 * Validate that a numeric field is non-negative.
 */
function validateNonNegative(...fields) {
  return (req, res, next) => {
    for (const f of fields) {
      const val = req.body[f];
      if (val !== undefined && val !== null) {
        if (Number(val) < 0) {
          const err = new Error(`"${f}" must not be negative`);
          err.status = 400;
          return next(err);
        }
      }
    }
    next();
  };
}

module.exports = {
  requireFields,
  validateDates,
  validateDateRange,
  validateRange,
  validateEnum,
  validateNonNegative,
};
