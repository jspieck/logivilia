// Admin-only diagnostics. On hosts where the app's console output is not
// visible (e.g. netcup Plesk), these endpoints report problems directly in
// the HTTP response instead.

const nodemailer = require('nodemailer');
const config = require('../config/config');
const { sendError } = require('../utils/apiError');

const ADMIN_ROLE = 'Admin';

// The mail settings in use, without the password itself.
function mailSettings () {
  return {
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    user: config.mail.user,
    from: config.mail.from,
    appUrl: config.mail.appUrl,
    passwordSet: Boolean(config.mail.password)
  };
}

module.exports = {
  // POST /api/admin/test-mail: sends a test e-mail to the logged-in admin's
  // own address and returns the SMTP result or the exact error.
  async testMail (req, res) {
    if (req.user.role !== ADMIN_ROLE) {
      return sendError(res, 403, 'FORBIDDEN');
    }
    const settings = mailSettings();
    if (!settings.passwordSet) {
      return res.send({ ok: false, step: 'config', error: 'SMTP_PASSWORD is not set', settings });
    }

    const transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: { user: config.mail.user, pass: config.mail.password },
      connectionTimeout: 15000
    });

    try {
      await transporter.verify();
    } catch (err) {
      return res.send({ ok: false, step: 'connect/login', error: err.message, code: err.code, settings });
    }

    try {
      const info = await transporter.sendMail({
        from: config.mail.from,
        to: req.user.email,
        subject: '[Logivilia] Test-E-Mail',
        text: 'Diese Test-E-Mail bestätigt, dass Logivilia E-Mails versenden kann.'
      });
      res.send({ ok: true, sentTo: req.user.email, response: info.response, settings });
    } catch (err) {
      res.send({ ok: false, step: 'send', error: err.message, code: err.code, settings });
    }
  }
};
