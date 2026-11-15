// Player-side nonogram logic, used by the nonogram board (no Vue here, so it
// can be tested with node --test).
//
// Player state: a flat array, row by row, in the stored encoding plus
// UNKNOWN: -1 = not decided yet, 0 = marked empty (dot), k >= 1 = colour k.

import { solveLine, solveNonogram } from './nonogramSolver.js';
import { lineMatches } from './nonogram.js';

export const UNKNOWN = -1;
export const DOT = 0;

/** The player's line as solver masks: unknown = any colour. */
function toMasks (line, full) {
  return line.map(cell => (cell === UNKNOWN ? full : 1 << cell));
}

function fullMask (clues) {
  let max = 0;
  for (const [colour] of clues) {
    max = Math.max(max, colour);
  }
  return (1 << (max + 1)) - 1;
}

/** Fully decided blocks at the start of `line`: [[colour, length], ...]. */
function closedBlocksFromStart (line) {
  const blocks = [];
  let i = 0;
  while (i < line.length && line[i] !== UNKNOWN) {
    const colour = line[i];
    let j = i;
    while (j < line.length && line[j] === colour) {
      j += 1;
    }
    // A block counts only once its end is known (edge or a decided cell).
    if (j < line.length && line[j] === UNKNOWN) {
      break;
    }
    if (colour !== DOT) {
      blocks.push([colour, j - i]);
    }
    i = j;
  }
  return blocks;
}

/**
 * Status of one row or column for display.
 * - `done[i]`: clue i is certainly placed (matched from either edge, or the
 *   whole line matches its clues).
 * - `complete`: the line matches its clues (unknown cells count as empty).
 * - `error`: the decided cells cannot be completed to match the clues.
 * @param {number[]} line player cells of the line
 * @param {import('../index').ClueBlock[]} clues
 */
export function lineStatus (line, clues) {
  const done = clues.map(() => false);
  const asAnswer = line.map(cell => (cell === UNKNOWN ? 0 : cell));
  const error = solveLine(toMasks(line, fullMask(clues)), clues) === null;
  if (!error && lineMatches(asAnswer, clues)) {
    return { done: done.map(() => true), complete: true, error: false };
  }
  if (!error) {
    const fromStart = closedBlocksFromStart(line);
    const fromEnd = closedBlocksFromStart([...line].reverse());
    // Only while the blocks agree with the clues in order; a mismatch means
    // the line is wrong, which `error` reports.
    for (let i = 0; i < fromStart.length && i < clues.length; i++) {
      if (fromStart[i][0] !== clues[i][0] || fromStart[i][1] !== clues[i][1]) break;
      done[i] = true;
    }
    for (let i = 0; i < fromEnd.length && i < clues.length; i++) {
      const c = clues[clues.length - 1 - i];
      if (fromEnd[i][0] !== c[0] || fromEnd[i][1] !== c[1]) break;
      done[clues.length - 1 - i] = true;
    }
  }
  return { done, complete: false, error };
}

/** Cells of row y / column x of a flat state. */
export const rowOf = (state, width, y) => state.slice(y * width, (y + 1) * width);
export const columnOf = (state, width, height, x) => Array.from({ length: height }, (_, y) => state[y * width + x]);

const single = mask => mask !== 0 && (mask & (mask - 1)) === 0;
const valueOf = mask => 31 - Math.clz32(mask);

/**
 * The next step a player can deduce, or why there is none. Returns one of:
 *   { kind: 'error', axis, index }          the line contradicts its clues
 *   { kind: 'line', axis, index, cells }    cells = [{ x, y, value }] that
 *                                           follow from this line alone
 *   { kind: 'cross', x, y, value }          a cell that follows only from its
 *                                           row and column together (colour
 *                                           puzzles: e.g. the row allows
 *                                           black or empty, the column orange
 *                                           or empty, so it is empty)
 *   { kind: 'solved' }                      nothing left to decide
 *   { kind: 'stuck' }                       no line logic gives anything new
 * Prefers the line that gives the most cells, so the hint is easy to see.
 * @param {number[]} state
 * @param {{ rowClues: import('../index').ClueBlock[][], columnClues: import('../index').ClueBlock[][] }} puzzle
 */
export function nextHint (state, { rowClues, columnClues }) {
  const width = columnClues.length;
  const height = rowClues.length;
  let maxColour = 0;
  for (const clues of [...rowClues, ...columnClues]) {
    for (const [colour] of clues) maxColour = Math.max(maxColour, colour);
  }
  const full = (1 << (maxColour + 1)) - 1;

  // What each line alone allows for each of its cells.
  const rowMasks = [];
  const columnMasks = [];
  for (let y = 0; y < height; y++) {
    const result = solveLine(toMasks(rowOf(state, width, y), full), rowClues[y]);
    if (!result) return { kind: 'error', axis: 'row', index: y };
    rowMasks.push(result);
  }
  for (let x = 0; x < width; x++) {
    const result = solveLine(toMasks(columnOf(state, width, height, x), full), columnClues[x]);
    if (!result) return { kind: 'error', axis: 'column', index: x };
    columnMasks.push(result);
  }

  let best = null;
  const consider = (axis, index, cells) => {
    if (cells.length && (!best || cells.length > best.cells.length)) {
      best = { kind: 'line', axis, index, cells };
    }
  };
  for (let y = 0; y < height; y++) {
    const cells = [];
    for (let x = 0; x < width; x++) {
      if (state[y * width + x] === UNKNOWN && single(rowMasks[y][x])) cells.push({ x, y, value: valueOf(rowMasks[y][x]) });
    }
    consider('row', y, cells);
  }
  for (let x = 0; x < width; x++) {
    const cells = [];
    for (let y = 0; y < height; y++) {
      if (state[y * width + x] === UNKNOWN && single(columnMasks[x][y])) cells.push({ x, y, value: valueOf(columnMasks[x][y]) });
    }
    consider('column', x, cells);
  }
  if (best) return best;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const both = rowMasks[y][x] & columnMasks[x][y];
      if (state[y * width + x] === UNKNOWN && single(both)) return { kind: 'cross', x, y, value: valueOf(both) };
    }
  }
  return state.includes(UNKNOWN) ? { kind: 'stuck' } : { kind: 'solved' };
}

/**
 * The solution, worked out from the clues (puzzles are unique, so this is
 * the stored one). Flat, stored encoding. Null if the solver gives up.
 */
export function solutionFromClues ({ rowClues, columnClues }) {
  const result = solveNonogram({ rowClues, columnClues }, { limit: 1, maxMillis: 4000 });
  return result.solutions.length ? result.solutions[0].flat() : null;
}

/** Indexes of decided cells that differ from `solution` (dots on filled cells too). */
export function wrongCells (state, solution) {
  const wrong = [];
  state.forEach((cell, i) => {
    if (cell !== UNKNOWN && cell !== solution[i]) {
      wrong.push(i);
    }
  });
  return wrong;
}

/**
 * Cells of a straight drag from `start` to `end`: along the row or column in
 * which the pointer moved further.
 * @param {{x: number, y: number}} start
 * @param {{x: number, y: number}} end
 */
export function dragLine (start, end) {
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const cells = [];
  if (horizontal) {
    const step = end.x >= start.x ? 1 : -1;
    for (let x = start.x; x !== end.x + step; x += step) cells.push({ x, y: start.y });
  } else {
    const step = end.y >= start.y ? 1 : -1;
    for (let y = start.y; y !== end.y + step; y += step) cells.push({ x: start.x, y });
  }
  return cells;
}

/**
 * What a press on a cell does, decided once per drag:
 * pressing with a value the cell already has clears (to unknown) every
 * dragged cell with that value; otherwise it sets the value on the pressed
 * cell and on unknown cells along the drag (so a drag never overwrites work).
 * @returns {{ mode: 'set' | 'clear', value: number }}
 */
export function dragAction (current, value) {
  return current === value ? { mode: 'clear', value } : { mode: 'set', value };
}

/** Applies a drag to a copy of `state`. */
export function applyDrag (state, width, cells, { mode, value }) {
  const next = [...state];
  cells.forEach(({ x, y }, i) => {
    const k = y * width + x;
    if (mode === 'clear') {
      if (next[k] === value) next[k] = UNKNOWN;
    } else if (i === 0 || next[k] === UNKNOWN) {
      next[k] = value;
    }
  });
  return next;
}
