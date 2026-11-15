// Data for the start page in one request: puzzle counts per type, the puzzle
// of the day, the most-solved puzzles and the top players. Only summaries
// (no clues, no solutions), so the page stays small.

const { Op } = require('sequelize');
const { Puzzle, PuzzleSolve, PuzzleRating, User, sequelize } = require('../models');
const { PUZZLE_TYPES } = require('../puzzles');
const { puzzleData } = require('../utils/puzzleView');
const { sendError } = require('../utils/apiError');

const POPULAR_COUNT = 4;
const TOP_PLAYERS = 3;
// The puzzle of the day should be doable in a break.
const DAILY_MAX_DIFFICULTY = 3;
const TIME_ZONE = 'Europe/Berlin';

/** Today's date in Germany as YYYY-MM-DD (the day changes at local midnight). */
function dateKey (now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
}

/** Small stable string hash (FNV-1a), so every server picks the same puzzle. */
function hash (text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * The puzzle of the day for `key` (YYYY-MM-DD) out of `puzzles` (any order).
 * The type rotates daily (nonogram, linelog, logical, ...); within the type
 * the choice is a hash of the date over the puzzles sorted by id.
 */
function pickDaily (puzzles, key) {
  const dayNumber = Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000);
  for (let offset = 0; offset < PUZZLE_TYPES.length; offset++) {
    const type = PUZZLE_TYPES[(dayNumber + offset) % PUZZLE_TYPES.length];
    const candidates = puzzles
      .filter(p => p.type === type && (p.difficulty == null || p.difficulty <= DAILY_MAX_DIFFICULTY))
      .sort((a, b) => a.id - b.id);
    if (candidates.length) {
      return candidates[hash(key) % candidates.length];
    }
  }
  return null;
}

/** Name, type and size of a puzzle, for lists and cards. */
function summary (puzzle) {
  const data = puzzleData(puzzle);
  const result = { id: puzzle.id, type: puzzle.type, name: puzzle.name, difficulty: puzzle.difficulty };
  if (puzzle.type === 'logical') {
    result.question = data.question || null;
    result.image = data.image || null;
  } else {
    result.width = data.width || null;
    result.height = data.height || null;
  }
  return result;
}

async function countsPerType () {
  const rows = await Puzzle.findAll({
    attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['type'],
    raw: true
  });
  const counts = Object.fromEntries(PUZZLE_TYPES.map(type => [type, 0]));
  for (const row of rows) {
    if (row.type in counts) counts[row.type] = Number(row.count);
  }
  return counts;
}

/** Puzzle IDs with the most solves; filled up with the best rated ones. */
async function popularIds () {
  const solved = await PuzzleSolve.findAll({
    attributes: ['PuzzleId', [sequelize.fn('COUNT', sequelize.col('id')), 'solveCount']],
    group: ['PuzzleId'],
    order: [[sequelize.literal('solveCount'), 'DESC'], ['PuzzleId', 'ASC']],
    limit: POPULAR_COUNT,
    raw: true
  });
  const ids = solved.map(row => row.PuzzleId);
  if (ids.length < POPULAR_COUNT) {
    const rated = await PuzzleRating.findAll({
      attributes: ['PuzzleId', [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
      where: ids.length ? { PuzzleId: { [Op.notIn]: ids } } : {},
      group: ['PuzzleId'],
      order: [[sequelize.literal('avgRating'), 'DESC'], ['PuzzleId', 'ASC']],
      limit: POPULAR_COUNT - ids.length,
      raw: true
    });
    ids.push(...rated.map(row => row.PuzzleId));
  }
  return ids;
}

async function topPlayers () {
  const rows = await PuzzleSolve.findAll({
    attributes: ['UserId', [sequelize.fn('COUNT', sequelize.col('id')), 'solvedCount']],
    where: { UserId: { [Op.ne]: null } },
    group: ['UserId'],
    order: [[sequelize.literal('solvedCount'), 'DESC'], ['UserId', 'ASC']],
    limit: TOP_PLAYERS,
    raw: true
  });
  if (!rows.length) return [];
  const users = await User.findAll({ attributes: ['id', 'username'], where: { id: rows.map(r => r.UserId) } });
  const names = new Map(users.map(user => [user.id, user.username]));
  return rows.map(row => ({ id: row.UserId, username: names.get(row.UserId) || '', solvedCount: Number(row.solvedCount) }));
}

module.exports = {
  // GET /home
  async index (req, res) {
    try {
      const key = dateKey();
      const puzzles = await Puzzle.findAll({ attributes: ['id', 'type', 'name', 'difficulty', 'data'] });
      const byId = new Map(puzzles.map(p => [p.id, p]));

      const dailyPuzzle = pickDaily(puzzles, key);
      let daily = null;
      if (dailyPuzzle) {
        const solvedLast24h = await PuzzleSolve.count({
          where: { PuzzleId: dailyPuzzle.id, createdAt: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) } }
        });
        daily = { ...summary(dailyPuzzle), date: key, solvedLast24h };
      }

      const [counts, popular, players] = await Promise.all([countsPerType(), popularIds(), topPlayers()]);
      res.send({
        counts,
        daily,
        popular: popular.map(id => byId.get(id)).filter(Boolean).map(summary),
        topPlayers: players
      });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'HOME_FETCH_FAILED');
    }
  },

  // Exported for tests.
  pickDaily,
  dateKey
};
