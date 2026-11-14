// What the API sends for a puzzle: the common columns plus the type's public
// data (computeClues), flattened into one object. The stored solution never
// leaves the server; the server checks answers with the plugin's validate().

const { getPlugin } = require('../puzzles');

const COMMON_FIELDS = ['id', 'type', 'name', 'difficulty', 'date', 'author', 'UserId', 'legacyId', 'createdAt', 'updatedAt'];

// Columns a creator may set. The type is set on create and cannot change.
const EDITABLE_COMMON_FIELDS = ['name', 'difficulty', 'date', 'author'];

function plain (puzzle) {
  return typeof puzzle.get === 'function' ? puzzle.get({ plain: true }) : puzzle;
}

/**
 * Stored `data` as an object. Some MySQL-compatible servers (MariaDB) store
 * JSON as text, so a string is parsed here.
 */
function puzzleData (puzzle) {
  const data = plain(puzzle).data;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data || {};
}

/** @returns {import('@logivilia/shared').PublicPuzzle} */
function publicPuzzle (puzzle, extra = {}) {
  const row = plain(puzzle);
  const result = { ...getPlugin(row.type).computeClues(puzzleData(row)) };
  for (const field of COMMON_FIELDS) {
    result[field] = row[field] === undefined ? null : row[field];
  }
  return Object.assign(result, extra);
}

function pickFields (source, fields) {
  const result = {};
  for (const field of fields) {
    if (source && source[field] !== undefined) {
      result[field] = source[field];
    }
  }
  return result;
}

module.exports = {
  publicPuzzle,
  puzzleData,
  pickFields,
  EDITABLE_COMMON_FIELDS
};
