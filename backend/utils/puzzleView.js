// What the API sends for a puzzle: the common columns plus the type's public
// data (computeClues), flattened into one object. The stored solution never
// leaves the server; the server checks answers with the plugin's validate().

const { getPlugin } = require('../puzzles');

// status and reviewNote: only the author and Admins can load an unpublished
// puzzle, and an approval clears the note.
const COMMON_FIELDS = ['id', 'type', 'name', 'difficulty', 'date', 'author', 'UserId', 'legacyId', 'status', 'reviewNote',
  'createdAt', 'updatedAt'];

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

/**
 * The puzzle's name in other languages, { [locale]: name }, from
 * data.translations; null if it has none. Kept in the `names` column (set by
 * the Puzzle model), so lists can show it without loading `data`.
 */
function nameTranslations (puzzle) {
  const translations = puzzleData(puzzle).translations;
  if (!translations || typeof translations !== 'object') return null;
  const names = {};
  for (const [locale, tr] of Object.entries(translations)) {
    if (tr && typeof tr.name === 'string' && tr.name.trim()) names[locale] = tr.name;
  }
  return Object.keys(names).length ? names : null;
}

/** The stored `names` column as an object (MariaDB may return JSON as text). */
function namesOf (puzzle) {
  let names = plain(puzzle).names;
  if (typeof names === 'string') {
    try {
      names = JSON.parse(names);
    } catch {
      return null;
    }
  }
  return names && typeof names === 'object' ? names : null;
}

const COLOR = /^#[0-9a-f]{3,8}$/i;

/**
 * The colours a player paints with (data.colors without the background, the
 * last one), for the overview's swatches; null for puzzles without colours
 * or when `data` was not loaded.
 */
function listColors (row) {
  if (row.data === undefined || row.data === null) return null;
  const data = puzzleData(row);
  if (!Array.isArray(data.colors)) return null;
  const count = toCount(data.numColor) ?? data.colors.length - 1;
  const colors = data.colors.slice(0, count).filter(c => typeof c === 'string' && COLOR.test(c));
  return colors.length ? colors : null;
}

/** What the overview tables show of a puzzle: no clues, no solution. */
function listPuzzle (puzzle, extra = {}) {
  const row = plain(puzzle);
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    names: namesOf(row),
    difficulty: row.difficulty,
    width: row.width ?? null,
    height: row.height ?? null,
    numColor: row.numColor ?? null,
    colors: listColors(row),
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
  nameTranslations,
  namesOf,
  puzzleData,
  pickFields,
  EDITABLE_COMMON_FIELDS
};
