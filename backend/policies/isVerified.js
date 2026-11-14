const { sendError } = require('../utils/apiError');

// After isAuthenticated: only users who confirmed their e-mail address may
// publish content others see (comments, puzzles).
module.exports = function isVerified (req, res, next) {
  if (!req.user || !req.user.emailVerified) {
    return sendError(res, 403, 'EMAIL_NOT_VERIFIED');
  }
  next();
};
