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

const toCount = value => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * The list columns (width, height, numColor) a puzzle row should have:
 * copies of its data fields, so the overview can filter and sort on them in
 * SQL. Null for types without a grid (logic puzzles).
 */
function listColumns (puzzle) {
  const row = plain(puzzle);
  if (row.type === 'logical') {
    return { width: null, height: null, numColor: null };
  }
  const data = puzzleData(row);
  return { width: toCount(data.width), height: toCount(data.height), numColor: toCount(data.numColor) };
}

/** What the overview tables show of a puzzle: no clues, no solution. */
function listPuzzle (puzzle, extra = {}) {
  const row = plain(puzzle);
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    difficulty: row.difficulty,
    width: row.width ?? null,
    height: row.height ?? null,
    numColor: row.numColor ?? null,
    date: row.date,
    author: row.author,
    ...extra
  };
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
  listPuzzle,
  listColumns,
  puzzleData,
  pickFields,
  EDITABLE_COMMON_FIELDS
};
