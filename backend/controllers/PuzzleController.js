// Generic puzzle API for every puzzle type. What differs between types
// (data fields, input checks, clues, answer checks) comes from the type's
// plugin in shared/puzzles.

const { Op } = require('sequelize');
const { Puzzle, PuzzleRating, PuzzleSolve, PuzzleProgress, sequelize } = require('../models');
const { getPlugin, isPuzzleType } = require('../puzzles');
const { publicPuzzle, listPuzzle, puzzleData, pickFields, EDITABLE_COMMON_FIELDS } = require('../utils/puzzleView');
const { sendError } = require('../utils/apiError');
const solvableCheck = require('../utils/solvableCheck');

const ADMIN_ROLE = 'Admin';
// Largest saved game accepted (JSON); a 100x100 nonogram needs about 40 KB.
const MAX_PROGRESS_BYTES = 200 * 1024;
// Times above a week are not believable as one sitting; such a time is dropped.
const MAX_SECONDS = 7 * 24 * 3600;

/** A solve time in whole seconds, or null if `value` is not a usable one. */
function solveSeconds (value) {
  return Number.isInteger(value) && value > 0 && value <= MAX_SECONDS ? value : null;
}

function parseId (value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function findPuzzle (req, res) {
  const id = parseId(req.params.puzzleId);
  const puzzle = id && await Puzzle.findByPk(id);
  if (!puzzle) {
    sendError(res, 404, 'PUZZLE_NOT_FOUND');
    return null;
  }
  return puzzle;
}

// Average rating and count per puzzle, as a Map keyed by PuzzleId.
async function ratingSummary (puzzleIds) {
  if (!puzzleIds.length) {
    return new Map();
  }
  const rows = await PuzzleRating.findAll({
    attributes: [
      'PuzzleId',
      [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'ratingCount']
    ],
    where: { PuzzleId: puzzleIds },
    group: ['PuzzleId'],
    raw: true
  });
  return new Map(rows.map(row => [row.PuzzleId, {
    avgRating: row.avgRating == null ? null : Number(row.avgRating),
    ratingCount: Number(row.ratingCount)
  }]));
}

/** Checks `answer` with the type's plugin. */
function isCorrect (puzzle, answer) {
  return getPlugin(puzzle.type).validate(puzzleData(puzzle), answer);
}

// --- Overview list (GET /puzzles?page=...) --------------------------------

const MAX_PER_PAGE = 100;
const SORTABLE = ['name', 'difficulty', 'width', 'height', 'numColor', 'avgRating', 'date', 'solved', 'id'];

const qid = name => sequelize.getQueryInterface().quoteIdentifier(name);
// Correlated subqueries on the outer "Puzzle" row. userId is the integer ID
// of the verified token's user, never taken from the query string.
const avgRatingSql = () =>
  `(SELECT AVG(${qid('r')}.${qid('rating')}) FROM ${qid('PuzzleRatings')} AS ${qid('r')} ` +
  `WHERE ${qid('r')}.${qid('PuzzleId')} = ${qid('Puzzle')}.${qid('id')})`;
const solvedIdsSql = userId =>
  `(SELECT ${qid('s')}.${qid('PuzzleId')} FROM ${qid('PuzzleSolves')} AS ${qid('s')} ` +
  `WHERE ${qid('s')}.${qid('UserId')} = ${Number(userId)})`;
const solvedSql = userId =>
  `(CASE WHEN ${qid('Puzzle')}.${qid('id')} IN ${solvedIdsSql(userId)} THEN 1 ELSE 0 END)`;

/** A non-negative integer from the query string, at most `max`, or null. */
function queryInt (value, max = Infinity) {
  if (value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? Math.min(n, max) : null;
}

/** Text filter from the query string (trimmed, at most 100 characters). */
function queryText (value) {
  return typeof value === 'string' ? value.trim().slice(0, 100) : '';
}

/**
 * "column contains text", case-insensitive. INSTR instead of LIKE because
 * MySQL and SQLite escape LIKE wildcards differently; both have INSTR.
 */
function contains (column, text) {
  return sequelize.where(
    sequelize.fn('INSTR', sequelize.fn('LOWER', sequelize.col(column)), text.toLowerCase()),
    Op.gt, 0
  );
}

/**
 * WHERE conditions from the query string. Every filter is optional;
 * malformed values are ignored rather than rejected, so an old bookmark
 * never breaks the page.
 */
function listWhere (query, userId) {
  const and = [];
  if (query.type) and.push({ type: query.type });

  const text = queryText(query.q);
  if (text) and.push(contains('name', text));
  const author = queryText(query.author);
  if (author) and.push(contains('author', author));

  const minDifficulty = queryInt(query.minDifficulty);
  const maxDifficulty = queryInt(query.maxDifficulty);
  if (minDifficulty !== null) and.push({ difficulty: { [Op.gte]: minDifficulty } });
  if (maxDifficulty !== null) and.push({ difficulty: { [Op.lte]: maxDifficulty } });

  // Size: the larger side of the grid lies in [minSize, maxSize].
  const minSize = queryInt(query.minSize);
  const maxSize = queryInt(query.maxSize);
  if (minSize !== null) {
    and.push({ [Op.or]: [{ width: { [Op.gte]: minSize } }, { height: { [Op.gte]: minSize } }] });
  }
  if (maxSize !== null) {
    and.push({ width: { [Op.lte]: maxSize } }, { height: { [Op.lte]: maxSize } });
  }

  const minColors = queryInt(query.minColors);
  const maxColors = queryInt(query.maxColors);
  if (minColors !== null) and.push({ numColor: { [Op.gte]: minColors } });
  if (maxColors !== null) and.push({ numColor: { [Op.lte]: maxColors } });

  const minRating = queryInt(query.minRating, 5);
  if (minRating) {
    and.push(sequelize.where(sequelize.literal(avgRatingSql()), Op.gte, minRating));
  }

  // Solved / unsolved only mean something for a logged-in player.
  if (userId && (query.status === 'solved' || query.status === 'unsolved')) {
    const op = query.status === 'solved' ? Op.in : Op.notIn;
    and.push({ id: { [op]: sequelize.literal(solvedIdsSql(userId)) } });
  }
  return { [Op.and]: and };
}

function listOrder (query, userId) {
  const field = SORTABLE.includes(query.sort) ? query.sort : 'id';
  const dir = query.order === 'desc' ? 'DESC' : 'ASC';
  let first = [field, dir];
  if (field === 'avgRating') {
    first = [sequelize.literal(avgRatingSql()), dir];
  } else if (field === 'solved') {
    first = userId ? [sequelize.literal(solvedSql(userId)), dir] : null;
  }
  // id as the tie-breaker, so pages never overlap or skip rows.
  return first && field !== 'id' ? [first, ['id', dir]] : [['id', dir]];
}

/** The logged-in user's ID if a valid token was sent, else null. */
function optionalUserId (req) {
  if (!req.headers.authorization) return Promise.resolve(null);
  return new Promise(resolve => {
    const passport = require('../passport');
    passport.authenticate('jwt', { session: false }, (err, user) => {
      resolve(!err && user ? user.id : null);
    })(req, {}, () => resolve(null));
  });
}

async function listPage (req, res) {
  const userId = await optionalUserId(req);
  const page = Math.max(1, queryInt(req.query.page) || 1);
  const perPage = Math.max(1, queryInt(req.query.perPage, MAX_PER_PAGE) || 10);
  const where = listWhere(req.query, userId);
  const [total, rows] = await Promise.all([
    Puzzle.count({ where }),
    Puzzle.findAll({
      attributes: ['id', 'type', 'name', 'difficulty', 'width', 'height', 'numColor', 'date', 'author'],
      where,
      order: listOrder(req.query, userId),
      limit: perPage,
      offset: (page - 1) * perPage
    })
  ]);
  const ids = rows.map(p => p.id);
  const [ratings, solves] = await Promise.all([
    ratingSummary(ids),
    userId && ids.length
      ? PuzzleSolve.findAll({ attributes: ['PuzzleId'], where: { UserId: userId, PuzzleId: ids }, raw: true })
      : []
  ]);
  const solved = new Set(solves.map(s => s.PuzzleId));
  res.send({
    items: rows.map(p => listPuzzle(p, {
      ...(ratings.get(p.id) || { avgRating: null, ratingCount: 0 }),
      solved: solved.has(p.id)
    })),
    total,
    page,
    perPage
  });
}

module.exports = {
  // GET /puzzles?type=nonogram - every puzzle of a type (or all), without
  // solutions, with average rating.
  //
  // With ?page=N the overview's paged list instead. Optional: perPage
  // (1-100), sort (name|difficulty|width|height|numColor|avgRating|date|
  // solved), order (asc|desc), q (name contains), author (contains),
  // minDifficulty, maxDifficulty, minSize, maxSize (larger grid side),
  // minColors, maxColors, minRating (1-5), status (solved|unsolved; needs a
  // login, ignored for guests).
  // -> { items: [{ id, name, difficulty, width, height, numColor, date,
  //      author, avgRating, ratingCount, solved }], total, page, perPage }
  async index (req, res) {
    try {
      const { type } = req.query;
      if (type !== undefined && !isPuzzleType(type)) {
        return sendError(res, 400, 'PUZZLE_TYPE_INVALID');
      }
      if (req.query.page !== undefined) {
        return await listPage(req, res);
      }
      const puzzles = await Puzzle.findAll({
        where: type ? { type } : {},
        order: [['id', 'ASC']]
      });
      const ratings = await ratingSummary(puzzles.map(p => p.id));
      res.send(puzzles.map(puzzle =>
        publicPuzzle(puzzle, ratings.get(puzzle.id) || { avgRating: null, ratingCount: 0 })
      ));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PUZZLE_LIST_FAILED');
    }
  },

  // GET /puzzles/:puzzleId/next - { id } of the next puzzle of the same type
  // after this one (by ID, wrapping around) that the logged-in player has
  // not solved; for guests simply the next one. { id: null } if none is left.
  async next (req, res) {
    try {
      const puzzle = await findPuzzle(req, res);
      if (!puzzle) {
        return;
      }
      const userId = await optionalUserId(req);
      const base = [{ type: puzzle.type }, { id: { [Op.ne]: puzzle.id } }];
      if (userId) {
        base.push({ id: { [Op.notIn]: sequelize.literal(solvedIdsSql(userId)) } });
      }
      const find = extra => Puzzle.findOne({
        attributes: ['id'],
        where: { [Op.and]: [...base, ...extra] },
        order: [['id', 'ASC']]
      });
      const next = await find([{ id: { [Op.gt]: puzzle.id } }]) || await find([]);
      res.send({ id: next ? next.id : null });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PUZZLE_FETCH_FAILED');
    }
  },

  async show (req, res) {
    try {
      const puzzle = await findPuzzle(req, res);
      if (puzzle) {
        res.send(publicPuzzle(puzzle));
      }
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PUZZLE_FETCH_FAILED');
    }
  },

  // GET /puzzles/:puzzleId/source - common columns plus the stored data
  // (with the solution), for the owner's editor. Owner or Admin only.
  async source (req, res) {
    try {
      const puzzle = await findPuzzle(req, res);
      if (!puzzle) {
        return;
      }
      const isOwner = puzzle.UserId != null && puzzle.UserId === req.user.id;
      if (!isOwner && req.user.role !== ADMIN_ROLE) {
        return sendError(res, 403, 'FORBIDDEN');
      }
      const row = puzzle.get({ plain: true });
      const result = { ...puzzleData(puzzle) };
      for (const field of ['id', 'type', 'name', 'difficulty', 'date', 'author', 'UserId']) {
        result[field] = row[field] === undefined ? null : row[field];
      }
      res.send(result);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PUZZLE_FETCH_FAILED');
    }
  },

  // GET /puzzles/legacy/:type/:legacyId - the new ID of a puzzle from the
  // old per-type tables, for redirecting old links.
  async legacy (req, res) {
    try {
      const { type } = req.params;
      const legacyId = parseId(req.params.legacyId);
      const puzzle = isPuzzleType(type) && legacyId &&
        await Puzzle.findOne({ where: { type, legacyId }, attributes: ['id'] });
      if (!puzzle) {
        return sendError(res, 404, 'PUZZLE_NOT_FOUND');
      }
      res.send({ id: puzzle.id });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PUZZLE_FETCH_FAILED');
    }
  },

  // POST /puzzles - body: { type, name, difficulty, ..., <data fields> }
  async post (req, res) {
    try {
      const { type } = req.body || {};
      if (!isPuzzleType(type)) {
        return sendError(res, 400, 'PUZZLE_TYPE_INVALID');
      }
      const plugin = getPlugin(type);
      const data = pickFields(req.body, plugin.dataFields);
      const problem = plugin.checkData(data);
      if (problem) {
        return sendError(res, 400, 'PUZZLE_INVALID', { reason: problem });
      }
      const unsolvable = plugin.checkSolvable && await solvableCheck.checkSolvable(type, data);
      if (unsolvable) {
        return sendError(res, 400, unsolvable.code, unsolvable.params);
      }
      const puzzle = await Puzzle.create({
        ...pickFields(req.body, EDITABLE_COMMON_FIELDS),
        type,
        data,
        UserId: req.user.id
      });
      res.send(publicPuzzle(puzzle));
    } catch (err) {
      if (err instanceof solvableCheck.QueueFullError) {
        return sendError(res, 429, 'RATE_LIMITED');
      }
      console.error(err);
      sendError(res, 500, 'PUZZLE_CREATE_FAILED');
    }
  },

  // PUT /puzzles/:puzzleId - owner or Admin; any subset of the fields.
  async put (req, res) {
    try {
      const puzzle = await findPuzzle(req, res);
      if (!puzzle) {
        return;
      }
      const isOwner = puzzle.UserId != null && puzzle.UserId === req.user.id;
      if (!isOwner && req.user.role !== ADMIN_ROLE) {
        return sendError(res, 403, 'FORBIDDEN');
      }
      const plugin = getPlugin(puzzle.type);
      const changes = pickFields(req.body, plugin.dataFields);
      const data = { ...puzzleData(puzzle), ...changes };
      const problem = plugin.checkData(data);
      if (problem) {
        return sendError(res, 400, 'PUZZLE_INVALID', { reason: problem });
      }
      // Only when the puzzle itself changes, so renaming an old puzzle works.
      const unsolvable = Object.keys(changes).length > 0 && plugin.checkSolvable &&
        await solvableCheck.checkSolvable(puzzle.type, data);
      if (unsolvable) {
        return sendError(res, 400, unsolvable.code, unsolvable.params);
      }
      await puzzle.update({ ...pickFields(req.body, EDITABLE_COMMON_FIELDS), data });
      res.send(publicPuzzle(puzzle));
    } catch (err) {
      if (err instanceof solvableCheck.QueueFullError) {
        return sendError(res, 429, 'RATE_LIMITED');
      }
      console.error(err);
      sendError(res, 500, 'PUZZLE_UPDATE_FAILED');
    }
  },

  // POST /puzzles/:puzzleId/check - { answer } -> { solved }. Anyone may ask;
  // nothing is recorded. Rate-limited in routes.js.
  async check (req, res) {
    try {
      const puzzle = await findPuzzle(req, res);
      if (puzzle) {
        res.send({ solved: isCorrect(puzzle, req.body && req.body.answer) });
      }
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PUZZLE_FETCH_FAILED');
    }
  },

  // POST /puzzles/:puzzleId/solve - { answer, seconds? }. Records a solve
  // for the logged-in user after checking the answer, keeps the fastest
  // time and deletes the saved game. Solving again is harmless (and may set
  // a new best time). -> { solved, firstSolve, bestSeconds, newBest }
  async solve (req, res) {
    try {
      const puzzle = await findPuzzle(req, res);
      if (!puzzle) {
        return;
      }
      if (!isCorrect(puzzle, req.body && req.body.answer)) {
        return sendError(res, 400, 'SOLUTION_INCORRECT');
      }
      const seconds = solveSeconds(req.body.seconds);
      const where = { UserId: req.user.id, PuzzleId: puzzle.id };
      const [solve, created] = await PuzzleSolve.findOrCreate({ where, defaults: { bestSeconds: seconds } });
      const previousBest = created ? null : solve.bestSeconds;
      const newBest = seconds !== null && (previousBest === null || seconds < previousBest);
      if (!created && newBest) {
        await solve.update({ bestSeconds: seconds });
      }
      await PuzzleProgress.destroy({ where });
      res.send({
        solved: true,
        firstSolve: created,
        bestSeconds: newBest ? seconds : previousBest,
        newBest: newBest && previousBest !== null
      });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'SOLUTION_SAVE_FAILED');
    }
  },

  // GET /puzzles/:puzzleId/progress - the logged-in user's saved game and
  // best time: { progress: { state, updatedAt } | null, bestSeconds }.
  async progress (req, res) {
    try {
      const puzzle = await findPuzzle(req, res);
      if (!puzzle) {
        return;
      }
      const where = { UserId: req.user.id, PuzzleId: puzzle.id };
      const [progress, solve] = await Promise.all([
        PuzzleProgress.findOne({ where }),
        PuzzleSolve.findOne({ where, attributes: ['bestSeconds'] })
      ]);
      res.send({
        progress: progress ? { state: progress.state, updatedAt: progress.updatedAt } : null,
        bestSeconds: solve ? solve.bestSeconds : null
      });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PROGRESS_FETCH_FAILED');
    }
  },

  // PUT /puzzles/:puzzleId/progress - { state }: creates or replaces the
  // saved game. `state` is any JSON object up to MAX_PROGRESS_BYTES.
  async saveProgress (req, res) {
    try {
      const state = req.body && req.body.state;
      if (!state || typeof state !== 'object' || Array.isArray(state) ||
          JSON.stringify(state).length > MAX_PROGRESS_BYTES) {
        return sendError(res, 400, 'PROGRESS_INVALID');
      }
      const puzzle = await findPuzzle(req, res);
      if (!puzzle) {
        return;
      }
      const where = { UserId: req.user.id, PuzzleId: puzzle.id };
      const [entry, created] = await PuzzleProgress.findOrCreate({ where, defaults: { state } });
      if (!created) {
        // changed() because Sequelize does not notice a replaced JSON value
        // that compares equal by reference.
        entry.set('state', state);
        entry.changed('state', true);
        await entry.save();
      }
      res.send({ updatedAt: entry.updatedAt });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PROGRESS_SAVE_FAILED');
    }
  },

  // DELETE /puzzles/:puzzleId/progress - the player restarted the puzzle.
  async deleteProgress (req, res) {
    try {
      const id = parseId(req.params.puzzleId);
      if (id) {
        await PuzzleProgress.destroy({ where: { UserId: req.user.id, PuzzleId: id } });
      }
      res.send({ progress: null });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PROGRESS_SAVE_FAILED');
    }
  },

  // GET /puzzles/:puzzleId/rating - the logged-in user's rating or null.
  async myRating (req, res) {
    try {
      const rating = await PuzzleRating.findOne({
        where: { PuzzleId: req.params.puzzleId, UserId: req.user.id }
      });
      res.send({ rating: rating ? rating.rating : null });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'RATING_FETCH_FAILED');
    }
  },

  // PUT /puzzles/:puzzleId/rating - { rating: 1..5 }, creates or replaces.
  async rate (req, res) {
    try {
      const { rating } = req.body || {};
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return sendError(res, 400, 'RATING_INVALID');
      }
      const puzzle = await findPuzzle(req, res);
      if (!puzzle) {
        return;
      }
      const [entry, created] = await PuzzleRating.findOrCreate({
        where: { PuzzleId: puzzle.id, UserId: req.user.id },
        defaults: { rating }
      });
      if (!created && entry.rating !== rating) {
        await entry.update({ rating });
      }
      res.send({ rating });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'RATING_SAVE_FAILED');
    }
  },

  // DELETE /puzzles/:puzzleId/rating
  async unrate (req, res) {
    try {
      await PuzzleRating.destroy({
        where: { PuzzleId: req.params.puzzleId, UserId: req.user.id }
      });
      res.send({ rating: null });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'RATING_DELETE_FAILED');
    }
  }
};
