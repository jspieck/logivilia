const passport = require('passport');
const { sendError } = require('../utils/apiError');

module.exports = function(req, res, next) {
  passport.authenticate('jwt', function(err, user) {
    if (err || !user) {
      sendError(res, 403, 'FORBIDDEN')
    } else {
      req.user = user;
      next();
    }
  })(req, res, next);
}