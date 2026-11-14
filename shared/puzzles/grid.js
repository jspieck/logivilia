// Grid helpers shared by the puzzle-type plugins.
// Grids use the stored encoding: 0 = empty/background, k = colour k.

/** @param {unknown} grid */
export function isGrid (grid, height, width) {
  return Array.isArray(grid) &&
    grid.length === height &&
    grid.every(row => Array.isArray(row) && row.length === width);
}

/** @param {unknown[][]} grid @returns {number[][]} */
export function toNumberGrid (grid) {
  return grid.map(row => row.map(cell => Number(cell)));
}

export function isIntegerGrid (grid, height, width, maxValue) {
  return isGrid(grid, height, width) &&
    grid.every(row => row.every(cell => Number.isInteger(Number(cell)) && cell >= 0 && cell <= maxValue));
}

/**
 * Run-length clues of one line: [[colour, length], ...], background skipped.
 * @param {number[]} line
 * @returns {import('../index').ClueBlock[]}
 */
export function lineClues (line) {
  /** @type {import('../index').ClueBlock[]} */
  const clues = [];
  let current = 0;
  let length = 0;
  for (const cell of line) {
    if (cell === current) {
      length += 1;
      continue;
    }
    if (current !== 0) {
      clues.push([current, length]);
    }
    current = cell;
    length = 1;
  }
  if (current !== 0) {
    clues.push([current, length]);
  }
  return clues;
}

/** @param {import('../index').ClueBlock[]} a @param {import('../index').ClueBlock[]} b */
export function sameClues (a, b) {
  return a.length === b.length &&
    a.every(([colour, length], i) => colour === b[i][0] && length === b[i][1]);
}

/** @param {number[][]} grid */
export function column (grid, x) {
  return grid.map(row => row[x]);
}

export function isPositiveInt (value, max = Infinity) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= max;
}
