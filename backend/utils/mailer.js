// Sends e-mails over SMTP (settings in config/config.js). Fire and forget:
// a failure is logged, never thrown, so a request does not fail because a
// mail could not go out. In tests, mails are collected in testOutbox instead.

const nodemailer = require('nodemailer');
const config = require('../config/config');

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

/** @param {{ to: string, subject: string, text: string }} mailOptions */
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

module.exports = { sendMail, testOutbox };
