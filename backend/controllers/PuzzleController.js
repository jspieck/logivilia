// Generic puzzle API for every puzzle type. What differs between types
// (data fields, input checks, clues, answer checks) comes from the type's
// plugin in shared/puzzles.

const { Puzzle, PuzzleRating, PuzzleSolve, PuzzleProgress, sequelize } = require('../models');
const { getPlugin, isPuzzleType } = require('../puzzles');
const { publicPuzzle, puzzleData, pickFields, EDITABLE_COMMON_FIELDS } = require('../utils/puzzleView');
const { sendError } = require('../utils/apiError');

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

module.exports = {
  // GET /puzzles?type=nonogram - every puzzle of a type (or all), without
  // solutions, with average rating.
  async index (req, res) {
    try {
      const { type } = req.query;
      if (type !== undefined && !isPuzzleType(type)) {
        return sendError(res, 400, 'PUZZLE_TYPE_INVALID');
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
      const unsolvable = plugin.checkSolvable && plugin.checkSolvable(data);
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
      const unsolvable = Object.keys(changes).length > 0 && plugin.checkSolvable && plugin.checkSolvable(data);
      if (unsolvable) {
        return sendError(res, 400, unsolvable.code, unsolvable.params);
      }
      await puzzle.update({ ...pickFields(req.body, EDITABLE_COMMON_FIELDS), data });
      res.send(publicPuzzle(puzzle));
    } catch (err) {
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
