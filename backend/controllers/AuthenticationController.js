const {User} = require('../models');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { ownUser } = require('../utils/userView');
const { sendError } = require('../utils/apiError');
const { mailLocale, mailText } = require('../utils/mails');
const { sendMail, testOutbox } = require('../utils/mailer');

const ONE_WEEK = 60 * 60 * 24 * 7;
const ONE_HOUR_S = 60 * 60;

// resetPasswordExpires holds Unix *seconds*. It was a 32-bit INTEGER column,
// which milliseconds (Date.now()) overflowed, so MySQL rejected the save and
// "forgot password" silently broke; it is BIGINT since migration
// 20261114-03, but stays in seconds.
function nowSeconds () {
  return Math.floor(Date.now() / 1000);
}

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

function sendForgotPasswordEmail (userEmail, token, locale) {
  const { appUrl } = config.mail;
  sendMail({ to: userEmail, ...mailText('forgot', locale, { appUrl, link: `${appUrl}/reset/${token}` }) });
}

function sendVerificationEmail (userEmail, token, locale) {
  sendMail({ to: userEmail, ...mailText('verify', locale, { link: `${config.mail.appUrl}/verify/${token}` }) });
}

/** Gives the user a new verification token and mails the link. */
async function startVerification (user, locale) {
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = hashToken(token);
  await user.save();
  sendVerificationEmail(user.email, token, locale);
}

function sendPasswordResetConfirmation (userEmail, locale) {
  sendMail({ to: userEmail, ...mailText('resetDone', locale) });
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
        joined: new Date().toISOString().slice(0, 10)
      });
      await startVerification(user, mailLocale(req));
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
        user.resetPasswordExpires = nowSeconds() + ONE_HOUR_S;
        await user.save();
        sendForgotPasswordEmail(user.email, token, mailLocale(req));
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
            [Op.gte]: nowSeconds()
          }
        }
      });
      if (!user) {
        return sendError(res, 400, 'AUTH_RESET_EXPIRED');
      }
      user.password = req.body.password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = 0;
      // The reset link reached this address, which proves it as well.
      user.emailVerified = true;
      user.emailVerificationToken = null;
      await user.save();
      sendPasswordResetConfirmation(user.email, mailLocale(req));
      res.send({
        user: ownUser(user),
        token: jwtSignUser(user)
      });
    } catch (err) {
      console.error('Password reset failed:', err.message);
      sendError(res, 400, 'AUTH_RESET_FAILED');
    }
  },
  // POST /verify/:token - the link from the verification e-mail.
  async verifyEmail (req, res) {
    try {
      const user = await User.findOne({
        where: { emailVerificationToken: hashToken(String(req.params.token)) }
      });
      if (!user) {
        return sendError(res, 400, 'AUTH_VERIFY_INVALID');
      }
      user.emailVerified = true;
      user.emailVerificationToken = null;
      await user.save();
      res.send({ user: ownUser(user) });
    } catch (err) {
      console.error('E-mail verification failed:', err.message);
      sendError(res, 500, 'INTERNAL_ERROR');
    }
  },
  // POST /verify/resend - logged in; sends a new link (the old one stops working).
  async resendVerification (req, res) {
    try {
      if (req.user.emailVerified) {
        return res.send({ user: ownUser(req.user) });
      }
      await startVerification(req.user, mailLocale(req));
      res.send({ message: 'VERIFY_EMAIL_SENT' });
    } catch (err) {
      console.error('Resending verification failed:', err.message);
      sendError(res, 500, 'INTERNAL_ERROR');
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
