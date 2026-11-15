// Nonogram (picture logic, multi-colour).
// data: { width, height, numColor, colors, solution }
// Players get row and column clues; any grid that satisfies every clue is
// accepted, not only the stored solution.

import { isGrid, isIntegerGrid, toNumberGrid, lineClues, sameClues, column, isPositiveInt } from './grid.js';
import { solveNonogram } from './nonogramSolver.js';

const MAX_SIZE = 100;

// Time the uniqueness check may take when a puzzle is saved. It runs on the
// request thread; realistic 50x50 puzzles need well under a second.
const SOLVABLE_CHECK_MILLIS = 3000;

// The solution as the player sees it: only the declared height x width area
// counts (some older puzzles store extra rows), and colour values outside the
// palette count as empty. Returns null if the solution is smaller than declared.
export function normalizedSolution (data) {
  const raw = toNumberGrid(Array.isArray(data.solution) ? data.solution : []);
  const height = Number(data.height) || raw.length;
  const width = Number(data.width) || (raw.length ? raw[0].length : 0);
  const paletteSize = Array.isArray(data.colors) ? data.colors.length : Infinity;
  const solution = raw.slice(0, height).map(row =>
    row.slice(0, width).map(cell => (cell >= paletteSize ? 0 : cell))
  );
  if (solution.length !== height || solution.some(row => row.length !== width)) {
    return null;
  }
  return solution;
}

/**
 * True when `grid` matches every row and column clue. Used by the server
 * (with clues computed from the solution) and by the solve page (with the
 * clues it received), so both decide "solved" the same way.
 * @param {{ rowClues: import('../index').ClueBlock[][], columnClues: import('../index').ClueBlock[][] }} clues
 * @param {unknown} grid
 */
export function matchesClues ({ rowClues, columnClues }, grid) {
  const height = rowClues.length;
  const width = columnClues.length;
  if (!isGrid(grid, height, width)) {
    return false;
  }
  const submitted = toNumberGrid(/** @type {unknown[][]} */ (grid));
  return rowClues.every((clues, y) => sameClues(lineClues(submitted[y]), clues)) &&
    columnClues.every((clues, x) => sameClues(lineClues(column(submitted, x)), clues));
}

/** @param {number[]} line @param {import('../index').ClueBlock[]} clues */
export function lineMatches (line, clues) {
  return sameClues(lineClues(line), clues);
}

function clues (data) {
  const solution = normalizedSolution(data);
  if (!solution) {
    return { rowClues: [], columnClues: [] };
  }
  const width = solution.length ? solution[0].length : 0;
  return {
    rowClues: solution.map(lineClues),
    columnClues: Array.from({ length: width }, (_, x) => lineClues(column(solution, x)))
  };
}

/** @type {import('../index').PuzzleTypePlugin<'nonogram'>} */
const nonogram = {
  type: 'nonogram',
  dataFields: ['width', 'height', 'numColor', 'colors', 'solution'],

  checkData (data) {
    if (!isPositiveInt(data.width, MAX_SIZE) || !isPositiveInt(data.height, MAX_SIZE)) {
      return 'width and height must be integers from 1 to ' + MAX_SIZE;
    }
    if (!Array.isArray(data.colors) || data.colors.length < 2 ||
        !data.colors.every(c => typeof c === 'string')) {
      return 'colors must be a list of at least two colour strings';
    }
    const height = Number(data.height);
    const width = Number(data.width);
    const solution = Array.isArray(data.solution)
      ? data.solution.slice(0, height).map(row => (Array.isArray(row) ? row.slice(0, width) : row))
      : null;
    if (!solution || !isIntegerGrid(solution, height, width, data.colors.length - 1)) {
      return 'solution must be a height x width grid of colour indices';
    }
    if (!solution.some(row => row.some(cell => cell !== 0))) {
      return 'solution must have at least one filled cell';
    }
    return null;
  },

  computeClues (data) {
    const { solution, ...rest } = data;
    return { ...rest, ...clues(data) };
  },

  validate (data, answer) {
    if (!normalizedSolution(data)) {
      return false;
    }
    return matchesClues(clues(data), answer);
  },

  checkSolvable (data) {
    const solution = normalizedSolution(data);
    if (!solution) {
      return { code: 'PUZZLE_INVALID' };
    }
    const result = solveNonogram(clues(data), { limit: 2, maxMillis: SOLVABLE_CHECK_MILLIS });
    if (!result.complete) {
      return { code: 'PUZZLE_TOO_COMPLEX' };
    }
    if (result.solutions.length > 1) {
      const [a, b] = result.solutions;
      const cells = a.reduce((sum, row, y) => sum + row.filter((cell, x) => cell !== b[y][x]).length, 0);
      return { code: 'PUZZLE_NOT_UNIQUE', params: { cells } };
    }
    return null;
  },

  solve (puzzleClues, options) {
    return solveNonogram(puzzleClues, options);
  }
};

export default nonogram;
