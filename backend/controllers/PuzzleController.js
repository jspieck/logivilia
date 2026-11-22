// Generic puzzle API for every puzzle type. What differs between types
// (data fields, input checks, clues, answer checks) comes from the type's
// plugin in shared/puzzles.

const { Op } = require('sequelize');
const { Puzzle, PuzzleRating, PuzzleSolve, PuzzleProgress, PuzzleDraft, sequelize } = require('../models');
const { getPlugin, isPuzzleType } = require('../puzzles');
const { publicPuzzle, listPuzzle, puzzleData, pickFields, EDITABLE_COMMON_FIELDS } = require('../utils/puzzleView');
const { sendError } = require('../utils/apiError');
const solvableCheck = require('../utils/solvableCheck');
const { STATUS, canView, canEdit, isLocked, initialStatus, statusAfterEdit } = require('../utils/puzzleStatus');
const { notifyAdminsOfSubmission } = require('../utils/reviewMails');
// Data fields whose text data.translations repeats in other languages.
const TRANSLATED_FIELDS = ['description', 'question', 'clues', 'attributes'];
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

/**
 * The puzzle of the URL if this request may see it (published, or the
 * caller is its author or an Admin); otherwise sends 404 and returns null.
 * Unpublished puzzles answer 404 rather than 403, so their IDs reveal nothing.
 */
async function findPuzzle (req, res) {
  const id = parseId(req.params.puzzleId);
  const puzzle = id && await Puzzle.findByPk(id);
  const user = puzzle && puzzle.status !== STATUS.PUBLISHED
    ? req.user || await optionalUser(req)
    : null;
  if (!puzzle || !canView(puzzle, user)) {
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
  // Only published puzzles are listed (see utils/puzzleStatus.js).
  const and = [{ status: STATUS.PUBLISHED }];
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

/** The logged-in user if a valid token was sent, else null. */
function optionalUser (req) {
  if (!req.headers.authorization) return Promise.resolve(null);
  return new Promise(resolve => {
    const passport = require('../passport');
    passport.authenticate('jwt', { session: false }, (err, user) => {
      resolve(!err && user ? user : null);
    })(req, {}, () => resolve(null));
  });
}

/** The logged-in user's ID if a valid token was sent, else null. */
async function optionalUserId (req) {
  const user = await optionalUser(req);
  return user ? user.id : null;
}

async function listPage (req, res) {
  const userId = await optionalUserId(req);
  const page = Math.max(1, queryInt(req.query.page) || 1);
  const perPage = Math.max(1, queryInt(req.query.perPage, MAX_PER_PAGE) || 10);
  const where = listWhere(req.query, userId);
  const [total, rows] = await Promise.all([
    Puzzle.count({ where }),
    Puzzle.findAll({
      // data only for the colour swatches (listPuzzle sends nothing else of it).
      attributes: ['id', 'type', 'name', 'names', 'difficulty', 'width', 'height', 'numColor', 'date', 'author', 'data'],
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
  // -> { items: [{ id, name, difficulty, width, height, numColor, colors,
  //      date, author, avgRating, ratingCount, solved }], total, page, perPage }
  //    (colors: the paint colours without the background, or null)
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
        where: type ? { type, status: STATUS.PUBLISHED } : { status: STATUS.PUBLISHED },
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
  // after this one that the logged-in player has not solved (for guests
  // simply the next one), wrapping around; { id: null } if none is left.
  //
  // "Next" follows the overview the player came from: the same optional
  // filters and sort as GET /puzzles?page=... (q, author, min/max...,
  // minRating, status, sort, order). Without them it is ID order.
  async next (req, res) {
    try {
      const puzzle = await findPuzzle(req, res);
      if (!puzzle) {
        return;
      }
      const userId = await optionalUserId(req);
      const query = { ...req.query, type: puzzle.type };
      // The list in overview order, with this puzzle in it even if the
      // filters leave it out (e.g. "unsolved only" right after solving it),
      // so we know where to continue from.
      const filtered = listWhere(query, userId);
      const unfiltered = listWhere({ type: puzzle.type }, null);
      const where = {
        [Op.or]: [filtered[Op.and].length > unfiltered[Op.and].length ? filtered : unfiltered, { id: puzzle.id }]
      };
      const rows = await Puzzle.findAll({
        attributes: ['id'],
        where,
        order: listOrder(query, userId),
        raw: true
      });
      const solved = new Set(userId
        ? (await PuzzleSolve.findAll({ attributes: ['PuzzleId'], where: { UserId: userId }, raw: true })).map(s => s.PuzzleId)
        : []);
      const ids = rows.map(r => r.id);
      const at = ids.indexOf(puzzle.id);
      let next = null;
      for (let k = 1; k < ids.length; k++) {
        const id = ids[(at + k) % ids.length];
        if (id !== puzzle.id && !solved.has(id)) {
          next = id;
          break;
        }
      }
      res.send({ id: next });
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
      if (!canEdit(puzzle, req.user)) {
        return sendError(res, 403, 'FORBIDDEN');
      }
      const row = puzzle.get({ plain: true });
      const result = { ...puzzleData(puzzle) };
      for (const field of ['id', 'type', 'name', 'difficulty', 'date', 'author', 'UserId', 'status', 'reviewNote']) {
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
        status: initialStatus(req.user),
        UserId: req.user.id
      });
      // The editor's server draft (if it came from one) is done now.
      const draftId = parseId(req.body.draftId);
      if (draftId) {
        await PuzzleDraft.destroy({ where: { id: draftId, UserId: req.user.id } });
      }
      if (puzzle.status === STATUS.PENDING) {
        await notifyAdminsOfSubmission(puzzle, req.user);
      }
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
      if (!canEdit(puzzle, req.user)) {
        return sendError(res, 403, 'FORBIDDEN');
      }
      if (isLocked(puzzle, req.user)) {
        return sendError(res, 403, 'PUZZLE_LOCKED');
      }
      const plugin = getPlugin(puzzle.type);
      const changes = pickFields(req.body, plugin.dataFields);
      const before = puzzleData(puzzle);
      const data = { ...before, ...changes };
      // Translations follow the German text; once that is edited they would
      // tell a different puzzle, so they go (unless new ones come along).
      if (data.translations && changes.translations === undefined &&
          TRANSLATED_FIELDS.some(field => field in changes && JSON.stringify(changes[field]) !== JSON.stringify(before[field]))) {
        delete data.translations;
      }
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
      const resubmitted = statusAfterEdit(puzzle, req.user) !== puzzle.status;
      await puzzle.update({
        ...pickFields(req.body, EDITABLE_COMMON_FIELDS),
        data,
        status: statusAfterEdit(puzzle, req.user)
      });
      if (resubmitted) {
        await notifyAdminsOfSubmission(puzzle, req.user);
      }
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
      // The author or an Admin trying out an unpublished puzzle: correct,
      // but nothing is recorded (no ranking points before the review).
      if (puzzle.status !== STATUS.PUBLISHED) {
        return res.send({ solved: true, firstSolve: false, bestSeconds: null, newBest: false, recorded: false });
      }
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

  // GET /my/puzzles - the logged-in user's own puzzles in every status,
  // most recently changed first, for "Meine Rätsel":
  // [{ id, type, name, names, difficulty, ..., status, reviewNote, updatedAt }]
  async mine (req, res) {
    try {
      const rows = await Puzzle.findAll({
        attributes: ['id', 'type', 'name', 'names', 'difficulty', 'width', 'height', 'numColor', 'date', 'author',
          'status', 'reviewNote', 'createdAt', 'updatedAt'],
        where: { UserId: req.user.id },
        order: [['updatedAt', 'DESC'], ['id', 'DESC']]
      });
      res.send(rows.map(p => listPuzzle(p, {
        status: p.status,
        reviewNote: p.reviewNote ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'PUZZLE_LIST_FAILED');
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
      if (puzzle.status !== STATUS.PUBLISHED) {
        return sendError(res, 404, 'PUZZLE_NOT_FOUND');
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
