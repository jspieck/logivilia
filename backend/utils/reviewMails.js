// E-mails of the review workflow (utils/puzzleStatus.js):
//  - every Admin hears when a creator submits a puzzle (new or resubmitted),
//  - the author hears when an Admin approves or sends back the puzzle.
// Users have no stored language, so these go out in German (the site's
// default). Sending never fails the request (see utils/mailer.js).

const { Op } = require('sequelize');
const config = require('../config/config');
const { User } = require('../models');
const { mailText } = require('./mails');
const { sendMail } = require('./mailer');
const { ADMIN_ROLE } = require('./puzzleStatus');

const LOCALE = 'de';
const TYPE_NAMES = { nonogram: 'Nonogramm', logical: 'Logikrätsel', linelog: 'Linelog' };

const puzzleName = puzzle => puzzle.name || `#${puzzle.id}`;

/** Tells every Admin (except `author` itself) that `puzzle` waits for review. */
async function notifyAdminsOfSubmission (puzzle, author) {
  try {
    const admins = await User.findAll({
      attributes: ['id', 'email'],
      where: { role: ADMIN_ROLE, email: { [Op.ne]: null }, id: { [Op.ne]: author.id } }
    });
    const text = mailText('puzzleSubmitted', LOCALE, {
      name: puzzleName(puzzle),
      type: TYPE_NAMES[puzzle.type] || puzzle.type,
      author: author.username,
      link: `${config.mail.appUrl}/admin/review`
    });
    for (const admin of admins) {
      sendMail({ to: admin.email, ...text });
    }
  } catch (err) {
    console.error('Review mail to admins failed:', err.message);
  }
}

/** Tells the author of `puzzle` that it was approved or sent back. */
async function notifyAuthorOfReview (puzzle) {
  try {
    const author = puzzle.UserId && await User.findByPk(puzzle.UserId, { attributes: ['id', 'email'] });
    if (!author || !author.email) return;
    const approved = puzzle.status === 'published';
    sendMail({
      to: author.email,
      ...mailText(approved ? 'puzzleApproved' : 'puzzleRejected', LOCALE, {
        name: puzzleName(puzzle),
        note: puzzle.reviewNote,
        link: approved ? `${config.mail.appUrl}/puzzle/${puzzle.id}` : `${config.mail.appUrl}/my-puzzles`
      })
    });
  } catch (err) {
    console.error('Review mail to author failed:', err.message);
  }
}

module.exports = { notifyAdminsOfSubmission, notifyAuthorOfReview };
