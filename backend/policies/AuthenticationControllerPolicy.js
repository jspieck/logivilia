const Joi = require('joi');
const { sendError } = require('../utils/apiError');

// One password rule for registration and reset (matches the checks shown in
// Register.vue): 8-32 characters, at least one letter and one digit, any
// other characters allowed.
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,32}$/;

module.exports = {
  reset (req, res, next) {
    const schema = Joi.object({
      password: Joi.string().pattern(PASSWORD_REGEX).required()
    });
    const { error } = schema.validate(req.body);
    if (error) {
      switch (error.details[0].context.key) {
        case 'password':
          sendError(res, 400, 'VALIDATION_PASSWORD');
          break;
        default:
          sendError(res, 400, 'VALIDATION_INVALID');
      }
    } else {
      next();
    }
  },
  register (req, res, next) {
    const schema = Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      email: Joi.string().email({ minDomainSegments: 2 }).required(),
      password: Joi.string().pattern(PASSWORD_REGEX).required(),
      gender: Joi.string().allow('').max(50),
      city: Joi.string().allow('').max(100)
    });
    const { error } = schema.validate(req.body);
    if (error) {
      switch (error.details[0].context.key) {
        case 'username':
          sendError(res, 400, 'VALIDATION_USERNAME');
          break;
        case 'email':
          sendError(res, 400, 'VALIDATION_EMAIL');
          break;
        case 'password':
          sendError(res, 400, 'VALIDATION_PASSWORD');
          break;
        case 'gender':
          sendError(res, 400, 'VALIDATION_GENDER');
          break;
        case 'city':
          sendError(res, 400, 'VALIDATION_CITY');
          break;
        default:
          sendError(res, 400, 'VALIDATION_INVALID');
      }
    } else {
      next();
    }
  }
};
