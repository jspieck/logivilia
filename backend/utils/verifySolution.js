// Server-side checks that a submitted puzzle state really is a solution.
// All grids use the stored encoding: 0 = empty/background, k = colour k.

function isGrid (grid, height, width) {
  return Array.isArray(grid) &&
    grid.length === height &&
    grid.every(row => Array.isArray(row) && row.length === width);
}

function toNumberGrid (grid) {
  return grid.map(row => row.map(cell => Number(cell)));
}

// Run-length clues of one line: [[colour, length], ...], background skipped.
function lineClues (line) {
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

function sameClues (a, b) {
  return a.length === b.length &&
    a.every(([colour, length], i) => colour === b[i][0] && length === b[i][1]);
}

function column (grid, x) {
  return grid.map(row => row[x]);
}

// The nonogram solution as the player sees it: only the declared
// height x width area counts (some older puzzles store extra rows), and
// colour values outside the palette are treated as empty.
// Returns null if the stored solution is smaller than the declared size.
function normalizedNonogramSolution (nonogram) {
  const raw = toNumberGrid(nonogram.solution || []);
  const height = Number(nonogram.height) || raw.length;
  const width = Number(nonogram.width) || (raw.length ? raw[0].length : 0);
  const paletteSize = Array.isArray(nonogram.colors) ? nonogram.colors.length : Infinity;
  const solution = raw.slice(0, height).map(row =>
    row.slice(0, width).map(cell => (cell >= paletteSize ? 0 : cell))
  );
  if (solution.length !== height || solution.some(row => row.length !== width)) {
    return null;
  }
  return solution;
}

// Row and column clues of a nonogram, as [[colour, length], ...] per line,
// in the stored colour encoding. This is all a player needs to solve it.
function nonogramClues (nonogram) {
  const solution = normalizedNonogramSolution(nonogram);
  if (!solution) {
    return { rowClues: [], columnClues: [] };
  }
  const width = solution.length ? solution[0].length : 0;
  return {
    rowClues: solution.map(lineClues),
    columnClues: Array.from({ length: width }, (_, x) => lineClues(column(solution, x)))
  };
}

// A nonogram is solved when every row and column matches the clues of the
// stored solution. This also accepts other grids that satisfy all clues,
// which is what the player sees in the UI.
function verifyNonogram (nonogram, grid) {
  const solution = normalizedNonogramSolution(nonogram);
  if (!solution) {
    return false;
  }
  const height = solution.length;
  const width = height ? solution[0].length : 0;
  if (!isGrid(grid, height, width)) {
    return false;
  }
  const submitted = toNumberGrid(grid);
  for (let y = 0; y < height; y++) {
    if (!sameClues(lineClues(submitted[y]), lineClues(solution[y]))) {
      return false;
    }
  }
  for (let x = 0; x < width; x++) {
    if (!sameClues(lineClues(column(submitted, x)), lineClues(column(solution, x)))) {
      return false;
    }
  }
  return true;
}

// Colour of every numbered linelog cell (stored encoding), 0 elsewhere.
// The player needs these to draw the numbers; they give away no path.
function linelogInformationColors (linelog) {
  const solution = toNumberGrid(linelog.solution || []);
  return (linelog.information || []).map((row, y) =>
    row.map((cell, x) => (Number(cell) !== 0 && solution[y] ? solution[y][x] || 0 : 0))
  );
}

// A linelog is solved when the coloured grid equals the stored solution.
function verifyLinelog (linelog, grid) {
  const solution = toNumberGrid(linelog.solution);
  const height = solution.length;
  const width = height ? solution[0].length : 0;
  if (!isGrid(grid, height, width)) {
    return false;
  }
  const submitted = toNumberGrid(grid);
  return solution.every((row, y) => row.every((cell, x) => cell === submitted[y][x]));
}

// A logical is solved when the submitted table equals the stored solution
// table (rows in the same order, values compared as strings). Column 0 is
// the fixed row label (a value of the first attribute), not player input,
// so it is not compared.
function verifyLogical (logical, table) {
  const solution = logical.solution;
  if (!Array.isArray(solution) || !Array.isArray(table) || table.length !== solution.length) {
    return false;
  }
  return solution.every((row, i) =>
    Array.isArray(table[i]) &&
    table[i].length === row.length &&
    row.every((cell, j) => j === 0 || String(cell) === String(table[i][j]))
  );
}

module.exports = {
  nonogramClues,
  linelogInformationColors,
  verifyNonogram,
  verifyLinelog,
  verifyLogical
};
