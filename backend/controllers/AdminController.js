// Admin-only diagnostics. On hosts where the app's console output is not
// visible (e.g. netcup Plesk), these endpoints report problems directly in
// the HTTP response instead.

const nodemailer = require('nodemailer');
const config = require('../config/config');
const { sendError } = require('../utils/apiError');
const { mailLocale, mailText } = require('../utils/mails');

const { Puzzle, User } = require('../models');
const { listPuzzle } = require('../utils/puzzleView');
const { STATUS, ADMIN_ROLE } = require('../utils/puzzleStatus');
const { notifyAuthorOfReview } = require('../utils/reviewMails');
const logger = require('../utils/logger');

const MAX_NOTE_LENGTH = 2000;

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
  // GET /api/admin/review - puzzles waiting for review, oldest first:
  // [{ id, type, name, ..., createdAt, updatedAt, reviewNote, creator: { id, username } }]
  async reviewQueue (req, res) {
    if (req.user.role !== ADMIN_ROLE) {
      return sendError(res, 403, 'FORBIDDEN');
    }
    try {
      const rows = await Puzzle.findAll({
        attributes: ['id', 'type', 'name', 'names', 'difficulty', 'width', 'height', 'numColor', 'date', 'author',
          'reviewNote', 'createdAt', 'updatedAt', 'UserId'],
        where: { status: STATUS.PENDING },
        include: [{ model: User, attributes: ['id', 'username'] }],
        order: [['updatedAt', 'ASC'], ['id', 'ASC']]
      });
      res.send(rows.map(p => listPuzzle(p, {
        status: STATUS.PENDING,
        reviewNote: p.reviewNote ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        creator: p.User ? { id: p.User.id, username: p.User.username } : null
      })));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PUZZLE_LIST_FAILED');
    }
  },

  // POST /api/admin/puzzles/:puzzleId/review - { decision: 'approve' |
  // 'reject', note? }. Approving publishes the puzzle (and clears the note);
  // rejecting sends it back to the author with the note, which is required.
  // Only pending puzzles can be reviewed. -> { id, status, reviewNote }
  async review (req, res) {
    if (req.user.role !== ADMIN_ROLE) {
      return sendError(res, 403, 'FORBIDDEN');
    }
    try {
      const { decision } = req.body || {};
      const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, MAX_NOTE_LENGTH) : '';
      if ((decision !== 'approve' && decision !== 'reject') || (decision === 'reject' && !note)) {
        return sendError(res, 400, 'REVIEW_INVALID');
      }
      const id = Number(req.params.puzzleId);
      const puzzle = Number.isInteger(id) && id > 0 && await Puzzle.findByPk(id);
      if (!puzzle) {
        return sendError(res, 404, 'PUZZLE_NOT_FOUND');
      }
      if (puzzle.status !== STATUS.PENDING) {
        return sendError(res, 409, 'REVIEW_NOT_PENDING');
      }
      await puzzle.update(decision === 'approve'
        ? { status: STATUS.PUBLISHED, reviewNote: null }
        : { status: STATUS.REJECTED, reviewNote: note });
      await notifyAuthorOfReview(puzzle);
      res.send({ id: puzzle.id, status: puzzle.status, reviewNote: puzzle.reviewNote });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PUZZLE_UPDATE_FAILED');
    }
  },

  // GET /api/admin/logs?lines=200 - the last lines of the server log file
  // as plain text (max 2000), since the host shows no Node output.
  logs (req, res) {
    if (req.user.role !== ADMIN_ROLE) {
      return sendError(res, 403, 'FORBIDDEN');
    }
    const lines = Math.min(Math.max(parseInt(req.query.lines, 10) || 200, 1), 2000);
    res.set('Cache-Control', 'no-store');
    res.type('text/plain; charset=utf-8').send(
      logger.file ? logger.tail(lines) : '(file logging is off in this environment)');
  },

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
        ...mailText('test', mailLocale(req))
      });
      res.send({ ok: true, sentTo: req.user.email, response: info.response, settings });
    } catch (err) {
      res.send({ ok: false, step: 'send', error: err.message, code: err.code, settings });
    }
  }
};
