// Linelog (number paths): numbered cells are joined by paths whose length
// equals the number; a path's colour is the colour of its two endpoints.
// data: { width, height, numColor, colors, information, solution }
// Players get the numbers and the colour of each numbered cell, not the paths.

import { isGrid, isIntegerGrid, toNumberGrid, isPositiveInt } from './grid.js';
import { solveLinelog } from './linelogSolver.js';

const MAX_SIZE = 100;

// Time the uniqueness check may take when a puzzle is saved (request thread).
const SOLVABLE_CHECK_MILLIS = 3000;

// Colour of every numbered cell (stored encoding), 0 elsewhere.
function informationColors (data) {
  const solution = toNumberGrid(Array.isArray(data.solution) ? data.solution : []);
  return (data.information || []).map((row, y) =>
    row.map((cell, x) => (Number(cell) !== 0 && solution[y] ? solution[y][x] || 0 : 0))
  );
}

/** @type {import('../index').PuzzleTypePlugin<'linelog'>} */
const linelog = {
  type: 'linelog',
  dataFields: ['width', 'height', 'numColor', 'colors', 'information', 'solution'],

  checkData (data) {
    const width = Number(data.width);
    const height = Number(data.height);
    if (!isPositiveInt(width, MAX_SIZE) || !isPositiveInt(height, MAX_SIZE)) {
      return 'width and height must be integers from 1 to ' + MAX_SIZE;
    }
    if (!Array.isArray(data.colors) || data.colors.length < 2 ||
        !data.colors.every(c => typeof c === 'string')) {
      return 'colors must be a list of at least two colour strings';
    }
    if (!isIntegerGrid(data.information, height, width, width * height)) {
      return 'information must be a height x width grid of numbers';
    }
    if (!isIntegerGrid(data.solution, height, width, data.colors.length - 1)) {
      return 'solution must be a height x width grid of colour indices';
    }
    return null;
  },

  computeClues (data) {
    const { solution, ...rest } = data;
    return { ...rest, informationColors: informationColors(data) };
  },

  // The coloured grid must equal the stored solution. A puzzle with a second
  // valid path layout would reject it; the solver (audit B6) should rule
  // such puzzles out when they are created.
  validate (data, answer) {
    const solution = toNumberGrid(Array.isArray(data.solution) ? data.solution : []);
    const height = solution.length;
    const width = height ? solution[0].length : 0;
    if (!isGrid(answer, height, width)) {
      return false;
    }
    const submitted = toNumberGrid(/** @type {unknown[][]} */ (answer));
    return solution.every((row, y) => row.every((cell, x) => cell === submitted[y][x]));
  },

  // The numbers must lead to exactly one picture, the stored one.
  checkSolvable (data) {
    const solution = toNumberGrid(data.solution);
    const clues = linelog.computeClues(data);
    // First: can the numbers draw the stored picture at all?
    const layout = solveLinelog(clues, { target: solution, layoutOnly: true, maxMillis: SOLVABLE_CHECK_MILLIS });
    if (layout.status === 'none') {
      return { code: 'PUZZLE_INVALID' };
    }
    const result = solveLinelog(clues, { target: solution, maxMillis: SOLVABLE_CHECK_MILLIS });
    if (result.status === 'too-complex') {
      return { code: 'PUZZLE_TOO_COMPLEX' };
    }
    if (result.status === 'none') {
      return { code: 'PUZZLE_INVALID' };
    }
    if (result.status === 'ambiguous') {
      const other = /** @type {number[][]} */ (result.other);
      const cells = solution.reduce((sum, row, y) => sum + row.filter((cell, x) => cell !== other[y][x]).length, 0);
      return { code: 'PUZZLE_NOT_UNIQUE', params: { cells } };
    }
    return null;
  }
};

export default linelog;
