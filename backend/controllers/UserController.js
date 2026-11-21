const { Op } = require('sequelize');
const { User, Puzzle, PuzzleSolve, PuzzleRating, PuzzleProgress, Comment, CommentUpvote, sequelize } = require('../models');
const { PUZZLE_TYPES } = require('../puzzles');
const { publicUser, ownUser } = require('../utils/userView');
const { sendError } = require('../utils/apiError');

function emptyCounts () {
  return Object.fromEntries(PUZZLE_TYPES.map(type => [type, 0]));
}

/**
 * Solved and created puzzles per type for one user.
 * @returns {Promise<import('@logivilia/shared').UserStats>}
 */
async function userStats (userId) {
  const solvedRows = await PuzzleSolve.findAll({
    attributes: [[sequelize.col('Puzzle.type'), 'type'], [sequelize.fn('COUNT', sequelize.col('PuzzleSolve.id')), 'count']],
    include: [{ model: Puzzle, attributes: [] }],
    where: { UserId: userId },
    group: ['Puzzle.type'],
    raw: true
  });
  const createdRows = await Puzzle.findAll({
    attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    where: { UserId: userId },
    group: ['type'],
    raw: true
  });
  const solved = emptyCounts();
  const created = emptyCounts();
  for (const row of solvedRows) solved[row.type] = Number(row.count);
  for (const row of createdRows) created[row.type] = Number(row.count);
  return { solved, created };
}

const isOwnAccount = req => String(req.params.userId) === String(req.user.id);

/** Everything stored about a user, for the data export (GDPR Art. 15/20). */
async function exportUser (user) {
  const UserId = user.id;
  const puzzleRef = { model: Puzzle, attributes: ['id', 'type', 'name'] };
  const [solves, ratings, comments, upvotes, puzzles, progress] = await Promise.all([
    PuzzleSolve.findAll({ where: { UserId }, include: [puzzleRef], order: [['id', 'ASC']] }),
    PuzzleRating.findAll({ where: { UserId }, include: [puzzleRef], order: [['id', 'ASC']] }),
    Comment.findAll({ where: { UserId }, order: [['id', 'ASC']] }),
    CommentUpvote.findAll({ where: { UserId }, order: [['id', 'ASC']] }),
    Puzzle.findAll({
      where: { UserId },
      attributes: ['id', 'type', 'name', 'difficulty', 'date', 'author', 'createdAt'],
      order: [['id', 'ASC']]
    }),
    PuzzleProgress.findAll({ where: { UserId }, include: [puzzleRef], order: [['id', 'ASC']] })
  ]);
  const puzzleOf = row => row.Puzzle
    ? { id: row.Puzzle.id, type: row.Puzzle.type, name: row.Puzzle.name }
    : { id: row.PuzzleId };
  return {
    exportedAt: new Date().toISOString(),
    account: { ...ownUser(user), createdAt: user.createdAt, updatedAt: user.updatedAt },
    solves: solves.map(row => ({ puzzle: puzzleOf(row), solvedAt: row.createdAt, bestSeconds: row.bestSeconds })),
    savedGames: progress.map(row => ({ puzzle: puzzleOf(row), state: row.state, savedAt: row.updatedAt })),
    ratings: ratings.map(row => ({ puzzle: puzzleOf(row), rating: row.rating, ratedAt: row.updatedAt })),
    comments: comments.map(row => ({ id: row.id, puzzleId: row.PuzzleId, replyTo: row.replyId, text: row.text, date: row.date })),
    commentUpvotes: upvotes.map(row => ({ commentId: row.CommentId, date: row.createdAt })),
    createdPuzzles: puzzles.map(row => row.toJSON())
  };
}

module.exports = {
  async show (req, res) {
    try {
      const user = await User.findByPk(req.params.userId);
      if (!user) {
        return sendError(res, 404, 'USER_NOT_FOUND');
      }
      res.send({ ...publicUser(user), stats: await userStats(user.id) });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'USER_NOT_FOUND');
    }
  },
  // GET /users/:userId/export - own account only; everything stored about
  // the user, as JSON.
  async exportData (req, res) {
    try {
      if (!isOwnAccount(req)) {
        return sendError(res, 403, 'FORBIDDEN');
      }
      res.set('Content-Disposition', `attachment; filename="logivilia-${req.user.id}.json"`);
      res.send(await exportUser(req.user));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'USER_EXPORT_FAILED');
    }
  },
  // DELETE /users/:userId - own account only, body { password }. Deletes the
  // account with its solves, ratings, comments and upvotes. Published
  // puzzles stay (other players solved and rated them) but lose the link to
  // the account, and the author name if it was the username.
  async destroy (req, res) {
    try {
      if (!isOwnAccount(req)) {
        return sendError(res, 403, 'FORBIDDEN');
      }
      const password = req.body && req.body.password;
      if (typeof password !== 'string' || !await req.user.comparePassword(password)) {
        return sendError(res, 403, 'AUTH_INVALID_CREDENTIALS');
      }
      const user = req.user;
      const UserId = user.id;
      await sequelize.transaction(async transaction => {
        const commentIds = (await Comment.findAll({ where: { UserId }, attributes: ['id'], transaction, raw: true }))
          .map(c => c.id);
        // Upvotes by the user, and other users' upvotes on the user's comments.
        await CommentUpvote.destroy({
          where: { [Op.or]: [{ UserId }, ...(commentIds.length ? [{ CommentId: commentIds }] : [])] },
          transaction
        });
        await Comment.destroy({ where: { UserId }, transaction });
        await PuzzleRating.destroy({ where: { UserId }, transaction });
        await PuzzleSolve.destroy({ where: { UserId }, transaction });
        await PuzzleProgress.destroy({ where: { UserId }, transaction });
        await Puzzle.update({ author: null }, { where: { UserId, author: user.username }, transaction });
        await Puzzle.update({ UserId: null }, { where: { UserId }, transaction });
        await user.destroy({ transaction });
      });
      res.send({ deleted: true });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'USER_DELETE_FAILED');
    }
  },
  async update (req, res) {
    try {
      // Users can only edit their own profile.
      if (!isOwnAccount(req)) {
        return sendError(res, 403, 'FORBIDDEN');
      }
      const user = req.user;
      user.gender = req.body.gender;
      user.city = req.body.city;
      user.birthyear = req.body.birthyear;
      user.bio = req.body.bio;
      await user.save();
      res.send({ success: true });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'USER_NOT_FOUND');
    }
  },
  // GET /users/:userId/solved?type=nonogram - IDs of the puzzles the user
  // solved (of one type, or all). Public, like the counts on the profile.
  async solved (req, res) {
    try {
      const { type } = req.query;
      const solves = await PuzzleSolve.findAll({
        attributes: ['PuzzleId'],
        where: { UserId: parseInt(req.params.userId, 10) || 0 },
        include: [{ model: Puzzle, attributes: [], where: type ? { type: String(type) } : undefined }],
        raw: true
      });
      res.send(solves.map(solve => solve.PuzzleId));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'USER_NOT_FOUND');
    }
  }
};
