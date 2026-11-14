const {User} = require('../models');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { ownUser } = require('../utils/userView');
const { sendError } = require('../utils/apiError');

const ONE_WEEK = 60 * 60 * 24 * 7;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Only the user id goes into the token. Everything else is loaded from the
// database by the passport strategy on each request.
function jwtSignUser (user) {
  return jwt.sign({ id: user.id }, config.authentication.jwtSecret, {
    expiresIn: ONE_WEEK
  });
}

// Reset tokens are stored hashed, so a leaked database does not leak
// usable reset links.
function hashToken (token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getTransporter () {
  if (!config.mail.password) {
    throw new Error('SMTP_PASSWORD is not set - cannot send e-mail.');
  }
  return nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
      user: config.mail.user,
      pass: config.mail.password
    }
  });
}

// In tests, e-mails are collected here instead of being sent.
const testOutbox = [];

function sendMail (mailOptions) {
  if (process.env.NODE_ENV === 'test') {
    testOutbox.push(mailOptions);
    return;
  }
  try {
    const transporter = getTransporter();
    transporter.sendMail({ from: config.mail.from, ...mailOptions }, function (error, info) {
      if (error) {
        console.error('E-mail could not be sent:', error.message);
      } else {
        // No recipient address in the log, only that the server accepted it.
        console.log(`E-mail "${mailOptions.subject}" accepted by ${config.mail.host}:`, info && info.response);
      }
    });
  } catch (err) {
    console.error(err.message);
  }
}

function sendForgotPasswordEmail (userEmail, token) {
  sendMail({
    to: userEmail,
    subject: '[Logivilia] Informationen zum Zurücksetzen des Passworts',
    text: `Sie erhalten diese E-Mail, da Sie (oder jemand anderes) das Zurücksetzen des Passworts Ihres Accounts bei ${config.mail.appUrl} beantragt hat.\n` +
    'Bitte klicken Sie auf folgenden Link oder kopieren Sie diesen in ihren Browser, um diesen Prozess fertigzustellen.\n\n' +
    `${config.mail.appUrl}/reset/${token} \n\n` +
    'Wenn Sie das Zurücksetzen Ihres Passworts nicht beantragt haben, ignorieren Sie bitte diese E-Mail und Ihr Passwort bleibt unverändert.\n\n' +
    'Mit freundlichen Grüßen\n' +
    'Ihr Logivilia Team'
  });
}

function sendPasswordResetConfirmation (userEmail) {
  sendMail({
    to: userEmail,
    subject: '[Logivilia] Passwort erfolgreich geändert',
    text: 'Sie erhalten diese E-Mail, da Sie das Passwort erfolgreich geändert haben.\n' +
    'Sie können sich nun mit Ihrem neuen Passwort anmelden.\n\n' +
    'Mit freundlichen Grüßen\n' +
    'Ihr Logivilia Team'
  });
}

module.exports = {
  async register (req, res) {
    try {
      const { username, email, password, gender, city } = req.body;
      const user = await User.create({
        username,
        email,
        password,
        gender,
        city,
        role: 'Mitglied',
        joined: new Date().toISOString().slice(0, 10),
        solvedLogicals: [],
        solvedNonograms: [],
        solvedLinelogs: [],
        createdLogicals: [],
        createdNonograms: [],
        createdLinelogs: []
      });
      res.send({
        user: ownUser(user),
        token: jwtSignUser(user)
      });
    } catch (err) {
      console.error('Registration failed:', err.name);
      sendError(res, 400, 'AUTH_ACCOUNT_EXISTS');
    }
  },
  async forgot (req, res) {
    // Always answer the same way, so this endpoint cannot be used to find
    // out which e-mail addresses have an account.
    const genericResponse = {
      // Translated by the frontend (messages.FORGOT_EMAIL_SENT).
      message: 'FORGOT_EMAIL_SENT'
    };
    try {
      const email = typeof req.body.email === 'string' ? req.body.email : '';
      const user = email ? await User.findOne({ where: { email } }) : null;
      if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = hashToken(token);
        user.resetPasswordExpires = Date.now() + ONE_HOUR_MS;
        await user.save();
        sendForgotPasswordEmail(user.email, token);
      }
      res.send(genericResponse);
    } catch (err) {
      console.error('Forgot password failed:', err.message);
      res.send(genericResponse);
    }
  },
  async reset (req, res) {
    try {
      const user = await User.findOne({
        where: {
          resetPasswordToken: hashToken(String(req.params.token)),
          resetPasswordExpires: {
            [Op.gte]: Date.now()
          }
        }
      });
      if (!user) {
        return sendError(res, 400, 'AUTH_RESET_EXPIRED');
      }
      user.password = req.body.password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = 0;
      await user.save();
      sendPasswordResetConfirmation(user.email);
      res.send({
        user: ownUser(user),
        token: jwtSignUser(user)
      });
    } catch (err) {
      console.error('Password reset failed:', err.message);
      sendError(res, 400, 'AUTH_RESET_FAILED');
    }
  },
  async login (req, res) {
    try {
      const {email, password} = req.body;
      if (typeof email !== 'string' || typeof password !== 'string') {
        return sendError(res, 403, 'AUTH_INVALID_CREDENTIALS');
      }
      const user = await User.findOne({
        where: { email }
      });
      if (!user) {
        return sendError(res, 403, 'AUTH_INVALID_CREDENTIALS');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return sendError(res, 403, 'AUTH_INVALID_CREDENTIALS');
      }
      res.send({
        user: ownUser(user),
        token: jwtSignUser(user)
      });
    } catch (err) {
      console.error('Login failed:', err.message);
      sendError(res, 500, 'AUTH_LOGIN_FAILED');
    }
  },
  testOutbox
};
