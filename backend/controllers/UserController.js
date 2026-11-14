const { User, Puzzle, PuzzleSolve, sequelize } = require('../models');
const { PUZZLE_TYPES } = require('../puzzles');
const { publicUser } = require('../utils/userView');
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
  async update (req, res) {
    try {
      // Users can only edit their own profile.
      if (String(req.params.userId) !== String(req.user.id)) {
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
