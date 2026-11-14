const { User, Puzzle, PuzzleSolve, sequelize } = require('../models');
const { PUZZLE_TYPES } = require('../puzzles');
const { sendError } = require('../utils/apiError');

const TOP = 10;

module.exports = {
  // GET /rankings - the 10 users with the most solves, per puzzle type.
  // Counted in SQL from PuzzleSolves; users without solves are not listed.
  async index (req, res) {
    try {
      const rows = await PuzzleSolve.findAll({
        attributes: [
          'UserId',
          [sequelize.col('Puzzle.type'), 'type'],
          [sequelize.fn('COUNT', sequelize.col('PuzzleSolve.id')), 'solvedCount']
        ],
        include: [{ model: Puzzle, attributes: [] }],
        group: [sequelize.col('PuzzleSolve.UserId'), sequelize.col('Puzzle.type')],
        raw: true
      });

      /** @type {import('@logivilia/shared').Rankings} */
      const rankings = /** @type {any} */ (Object.fromEntries(PUZZLE_TYPES.map(type => [type, []])));
      for (const row of rows) {
        if (rankings[row.type]) {
          rankings[row.type].push({ id: row.UserId, solvedCount: Number(row.solvedCount) });
        }
      }
      const userIds = new Set();
      for (const type of PUZZLE_TYPES) {
        rankings[type] = rankings[type]
          .sort((a, b) => b.solvedCount - a.solvedCount || a.id - b.id)
          .slice(0, TOP);
        rankings[type].forEach(entry => userIds.add(entry.id));
      }

      const users = await User.findAll({ attributes: ['id', 'username'], where: { id: [...userIds] } });
      const names = new Map(users.map(user => [user.id, user.username]));
      for (const type of PUZZLE_TYPES) {
        rankings[type] = rankings[type].map(entry => ({ ...entry, username: names.get(entry.id) || '' }));
      }
      res.send(rankings);
    } catch (error) {
      console.error('Error fetching rankings:', error);
      sendError(res, 500, 'RANKING_FETCH_FAILED');
    }
  }
};
