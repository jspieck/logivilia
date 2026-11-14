// Registry of puzzle-type plugins, shared by backend and frontend.
//
// A plugin holds everything about a puzzle type that does not depend on Vue
// or Express: which data fields it has, how to check creator input, what
// players see (computeClues), and when an answer is correct (validate).
// The frontend adds the Vue component that renders it
// (frontend/src/puzzles/index.js); the planned solver adds `solve` and `hint`.
//
// Adding a puzzle type: write a module like nonogram.js, list it here, add
// its board component to the frontend registry. No new table, controller,
// route or service is needed.

import nonogram from './nonogram.js';
import linelog from './linelog.js';
import logical from './logical.js';

/** @type {Record<import('../index').PuzzleType, import('../index').PuzzleTypePlugin<any>>} */
export const plugins = { nonogram, linelog, logical };

/** @type {import('../index').PuzzleType[]} */
export const PUZZLE_TYPES = /** @type {any} */ (Object.keys(plugins));

/** @param {string} type */
export function isPuzzleType (type) {
  return Object.prototype.hasOwnProperty.call(plugins, type);
}

/** @param {string} type */
export function getPlugin (type) {
  if (!isPuzzleType(type)) {
    throw new Error(`Unknown puzzle type "${type}"`);
  }
  return plugins[/** @type {import('../index').PuzzleType} */ (type)];
}

export { matchesClues, lineMatches } from './nonogram.js';
export { lineClues, sameClues } from './grid.js';
