const { validationResult } = require('express-validator');

/**
 * Runs after express-validator chains.
 * If there are errors, responds with 400 and the list of messages.
 * Otherwise calls next().
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = { validate };
