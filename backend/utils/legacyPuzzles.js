// Converts data from the old per-type tables (Nonograms, Linelogs, Logicals,
// their *Ratings tables and the solved* arrays on Users) into the generic
// Puzzles / PuzzleRatings / PuzzleSolves tables.
//
// Used by scripts/migrateToPuzzles.js (live database) and by the seed
// (seed/*.json still has the old shape), so both go through the same code.

const { getPlugin, PUZZLE_TYPES } = require('../puzzles');

/** Where each type's data lived before the generic model. */
const LEGACY = {
  nonogram: { table: 'Nonograms', ratingTable: 'NonogramRatings', ratingKey: 'NonogramId', solvedField: 'solvedNonograms' },
  linelog: { table: 'Linelogs', ratingTable: 'LinelogRatings', ratingKey: 'LinelogId', solvedField: 'solvedLinelogs' },
  logical: { table: 'Logicals', ratingTable: 'LogicalRatings', ratingKey: 'LogicalId', solvedField: 'solvedLogicals' }
};

function parseJson (value) {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toInt (value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

/** A row of an old per-type table as a Puzzles row. */
function toPuzzleRow (type, row, legacyId) {
  const plugin = getPlugin(type);
  const data = {};
  for (const field of plugin.dataFields) {
    if (row[field] !== undefined && row[field] !== null) {
      data[field] = parseJson(row[field]);
    }
  }
  const puzzle = {
    type,
    legacyId,
    name: row.name ?? null,
    difficulty: toInt(row.difficulty),
    date: row.date ?? null,
    author: row.author ?? null,
    UserId: toInt(row.UserId),
    data
  };
  if (row.createdAt) puzzle.createdAt = row.createdAt;
  if (row.updatedAt) puzzle.updatedAt = row.updatedAt;
  return puzzle;
}

/**
 * Writes the converted data and returns a lookup from (type, legacyId) to
 * the new puzzle ID.
 *
 * @param {object} db models from ../models
 * @param {object} legacy
 * @param {Record<string, object[]>} legacy.puzzles  old rows per type (each needs `id`)
 * @param {Record<string, object[]>} legacy.ratings  old rating rows per type
 * @param {object[]} legacy.users  rows with `id` and the old solved* arrays
 * @param {object} [options] { transaction }
 */
async function importLegacy (db, legacy, options = {}) {
  const { Puzzle, PuzzleRating, PuzzleSolve } = db;
  const { transaction } = options;
  const report = { puzzles: {}, ratings: 0, ratingsSkipped: 0, solves: 0, solvesSkipped: 0, creatorsUnknown: 0 };

  // Old rows may point at users that no longer exist; the new tables have
  // foreign keys, so such creators become null and such ratings are skipped.
  const userIds = new Set((legacy.users || []).map(user => toInt(user.id)));

  for (const type of PUZZLE_TYPES) {
    const rows = (legacy.puzzles[type] || []).map(row => {
      const puzzle = toPuzzleRow(type, row, toInt(row.id));
      if (puzzle.UserId != null && !userIds.has(puzzle.UserId)) {
        puzzle.UserId = null;
        report.creatorsUnknown += 1;
      }
      return puzzle;
    });
    await Puzzle.bulkCreate(rows, { transaction });
    report.puzzles[type] = rows.length;
  }

  const created = await Puzzle.findAll({ attributes: ['id', 'type', 'legacyId'], transaction, raw: true });
  const ids = new Map(created.map(p => [`${p.type}:${p.legacyId}`, p.id]));
  const idFor = (type, legacyId) => ids.get(`${type}:${toInt(legacyId)}`) ?? null;

  // Ratings: one per user and puzzle; the last one wins if there are several.
  const ratings = new Map();
  for (const type of PUZZLE_TYPES) {
    for (const row of legacy.ratings[type] || []) {
      const PuzzleId = idFor(type, row[LEGACY[type].ratingKey]);
      const rating = toInt(row.rating);
      const UserId = toInt(row.UserId);
      if (!PuzzleId || !userIds.has(UserId) || rating == null || rating < 1 || rating > 5) {
        report.ratingsSkipped += 1;
        continue;
      }
      ratings.set(`${UserId}:${PuzzleId}`, { UserId, PuzzleId, rating });
    }
  }
  await PuzzleRating.bulkCreate([...ratings.values()], { transaction });
  report.ratings = ratings.size;

  // Solves from the users' solved* arrays (they hold old per-type IDs).
  const solves = new Map();
  for (const user of legacy.users || []) {
    for (const type of PUZZLE_TYPES) {
      const list = parseJson(user[LEGACY[type].solvedField]);
      for (const legacyId of Array.isArray(list) ? list : []) {
        const PuzzleId = idFor(type, legacyId);
        if (!PuzzleId) {
          report.solvesSkipped += 1;
          continue;
        }
        solves.set(`${user.id}:${PuzzleId}`, { UserId: user.id, PuzzleId });
      }
    }
  }
  await PuzzleSolve.bulkCreate([...solves.values()], { transaction });
  report.solves = solves.size;

  return { idFor, report };
}

module.exports = { LEGACY, toPuzzleRow, importLegacy, parseJson };
