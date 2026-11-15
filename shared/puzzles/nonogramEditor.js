// Nonogram editor logic (no Vue): drawing tools, image import and the
// analysis that tells an author whether the puzzle works.
//
// Grids are arrays of rows in the stored encoding: 0 = background,
// k >= 1 = colour k (colors[k - 1]; the last entry of colors is the background).

import { lineClues, column } from './grid.js';
import { solveNonogram } from './nonogramSolver.js';

export const MIN_SIZE = 2;
export const MAX_SIZE = 100;

export const blankGrid = (width, height) => Array.from({ length: height }, () => new Array(width).fill(0));
const copy = grid => grid.map(row => [...row]);

/** Row and column clues of a grid. */
export function cluesOf (grid) {
  const width = grid.length ? grid[0].length : 0;
  return {
    rowClues: grid.map(lineClues),
    columnClues: Array.from({ length: width }, (_, x) => lineClues(column(grid, x)))
  };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Cells on the straight line from a to b (Bresenham), both ends included. */
export function lineCells (a, b) {
  const cells = [];
  let { x, y } = a;
  const dx = Math.abs(b.x - x);
  const dy = -Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1;
  const sy = y < b.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    cells.push({ x, y });
    if (x === b.x && y === b.y) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return cells;
}

/** Cells of the rectangle spanned by a and b; `filled` or only the outline. */
export function rectCells (a, b, filled = true) {
  const cells = [];
  const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [y0, y1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (filled || y === y0 || y === y1 || x === x0 || x === x1) cells.push({ x, y });
    }
  }
  return cells;
}

/** A copy of `grid` with `cells` set to `value` (cells outside are ignored). */
export function paint (grid, cells, value) {
  const next = copy(grid);
  for (const { x, y } of cells) {
    if (next[y] && x >= 0 && x < next[y].length) next[y][x] = value;
  }
  return next;
}

/** Flood fill (4-neighbourhood) of the area of equal colour around (x, y). */
export function floodFill (grid, x, y, value) {
  const target = grid[y]?.[x];
  if (target === undefined || target === value) return copy(grid);
  const next = copy(grid);
  /** @type {[number, number][]} */
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = /** @type {[number, number]} */ (stack.pop());
    if (next[cy]?.[cx] !== target) continue;
    next[cy][cx] = value;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return next;
}

/** New size; the picture stays centred, cut or padded with background. */
export function resize (grid, width, height) {
  const oldHeight = grid.length;
  const oldWidth = oldHeight ? grid[0].length : 0;
  const offsetX = Math.floor((width - oldWidth) / 2);
  const offsetY = Math.floor((height - oldHeight) / 2);
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const row = grid[y - offsetY];
    return row ? row[x - offsetX] ?? 0 : 0;
  }));
}

/** Moves the picture by (dx, dy); cells moved out are lost. */
export function shift (grid, dx, dy) {
  return grid.map((row, y) => row.map((_, x) => grid[y - dy]?.[x - dx] ?? 0));
}

export const flipHorizontal = grid => grid.map(row => [...row].reverse());
export const flipVertical = grid => [...grid].reverse().map(row => [...row]);

/**
 * Removes colour k (its cells become background) and renumbers the colours
 * above it, so the grid matches a palette without that colour.
 */
export function removeColour (grid, k) {
  return grid.map(row => row.map(v => (v === k ? 0 : v > k ? v - 1 : v)));
}

// ---------------------------------------------------------------------------
// Image import
// ---------------------------------------------------------------------------

/** @param {number[]} rgb */
const hex = rgb => '#' + rgb.slice(0, 3).map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/**
 * Turns an image (RGBA pixels, already scaled to width x height) into a grid
 * with `colourCount` colours plus background, by k-means clustering.
 * The cluster that covers most of the border becomes the background;
 * transparent pixels are treated as white. Deterministic (no randomness).
 * @param {Uint8ClampedArray | number[]} pixels RGBA, row by row
 * @returns {{ grid: number[][], colors: string[] }} colors: fill colours, then the background
 */
export function quantizeImage (pixels, width, height, colourCount) {
  const k = Math.max(2, colourCount + 1);
  const points = [];
  for (let i = 0; i < width * height; i++) {
    const alpha = pixels[i * 4 + 3];
    points.push(alpha >= 128 ? [pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]] : [255, 255, 255]);
  }

  // Farthest-point initialisation: deterministic and spreads the centres.
  const centres = [points[0]];
  while (centres.length < k) {
    let best = points[0];
    let bestDistance = -1;
    for (const p of points) {
      const d = Math.min(...centres.map(c => dist2(p, c)));
      if (d > bestDistance) { bestDistance = d; best = p; }
    }
    if (bestDistance <= 0) break; // fewer distinct colours than asked for
    centres.push(best);
  }

  const assign = new Array(points.length).fill(0);
  for (let iteration = 0; iteration < 12; iteration++) {
    let moved = false;
    points.forEach((p, i) => {
      let best = 0;
      for (let c = 1; c < centres.length; c++) {
        if (dist2(p, centres[c]) < dist2(p, centres[best])) best = c;
      }
      if (assign[i] !== best) { assign[i] = best; moved = true; }
    });
    const sums = centres.map(() => [0, 0, 0, 0]);
    points.forEach((p, i) => {
      const s = sums[assign[i]];
      s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3] += 1;
    });
    sums.forEach((s, c) => { if (s[3]) centres[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    if (!moved && iteration > 0) break;
  }

  // Background: the cluster covering most border pixels.
  const borderVotes = new Map();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        const a = assign[y * width + x];
        borderVotes.set(a, (borderVotes.get(a) || 0) + 1);
      }
    }
  }
  const background = [...borderVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

  // Fill colours: the other clusters, largest first.
  const counts = centres.map((_, c) => assign.filter(a => a === c).length);
  const fills = centres.map((_, c) => c)
    .filter(c => c !== background && counts[c] > 0)
    .sort((a, b) => counts[b] - counts[a]);
  const index = new Map(fills.map((c, i) => [c, i + 1]));
  const grid = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) =>
    index.get(assign[y * width + x]) ?? 0));
  return { grid, colors: [...fills.map(c => hex(centres[c])), hex(centres[background])] };
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * Suggested difficulty 1-5 from size, colours and the technique needed.
 * @param {{ width: number, height: number, colourCount: number, technique: string }} info
 */
export function suggestDifficulty ({ width, height, colourCount, technique }) {
  const cells = width * height;
  let level = cells <= 100 ? 1 : cells <= 225 ? 2 : cells <= 625 ? 3 : 4;
  if (technique === 'contradiction') level += 1;
  if (colourCount >= 3) level += 1;
  return Math.min(5, Math.max(1, level));
}

/**
 * Checks a drawing as a puzzle.
 * @returns {{ status: 'empty' } |
 *   { status: 'unique', technique: string, difficulty: number } |
 *   { status: 'ambiguous', cells: {x: number, y: number}[], other: number[][] } |
 *   { status: 'too-complex' }}
 *   cells: where the drawing and another valid solution differ.
 */
export function analyze (grid, { colourCount = 1, maxMillis = 3000 } = {}) {
  const height = grid.length;
  const width = height ? grid[0].length : 0;
  if (!grid.some(row => row.some(v => v !== 0))) return { status: 'empty' };
  const result = solveNonogram(cluesOf(grid), { limit: 2, maxMillis });
  if (!result.complete) return { status: 'too-complex' };
  if (result.solutions.length > 1) {
    const key = JSON.stringify(grid);
    const other = result.solutions.find(s => JSON.stringify(s) !== key) || result.solutions[1];
    const cells = [];
    grid.forEach((row, y) => row.forEach((v, x) => { if (other[y][x] !== v) cells.push({ x, y }); }));
    return { status: 'ambiguous', cells, other };
  }
  const technique = result.technique === 'search' ? 'search' : result.technique;
  return { status: 'unique', technique, difficulty: suggestDifficulty({ width, height, colourCount, technique }) };
}

/**
 * Single-cell changes that make an ambiguous drawing unique. Tries the
 * ambiguous cells and their neighbours first, as those changes usually keep
 * the picture recognisable. Changes that need only line logic come first.
 * @param {number[][]} grid
 * @param {{x: number, y: number}[]} ambiguousCells from analyze()
 * @param {{ colourCount?: number, limit?: number, maxMillis?: number }} [options]
 * @returns {{ x: number, y: number, value: number, technique: string }[]}
 */
export function suggestFixes (grid, ambiguousCells, { colourCount = 1, limit = 6, maxMillis = 4000 } = {}) {
  const height = grid.length;
  const width = height ? grid[0].length : 0;
  const deadline = Date.now() + maxMillis;
  const seen = new Set();
  const candidates = [];
  const add = (x, y) => {
    const key = y * width + x;
    if (x < 0 || y < 0 || x >= width || y >= height || seen.has(key)) return;
    seen.add(key);
    candidates.push({ x, y });
  };
  for (const { x, y } of ambiguousCells) add(x, y);
  for (const { x, y } of ambiguousCells) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) add(x + dx, y + dy);
  }

  const fixes = [];
  for (const { x, y } of candidates) {
    for (let value = 0; value <= colourCount; value++) {
      if (value === grid[y][x]) continue;
      if (Date.now() > deadline) return rank(fixes).slice(0, limit);
      const next = copy(grid);
      next[y][x] = value;
      if (!next.some(row => row.some(v => v !== 0))) continue;
      const remaining = Math.max(50, deadline - Date.now());
      const result = solveNonogram(cluesOf(next), { limit: 2, maxMillis: Math.min(500, remaining) });
      if (result.complete && result.solutions.length === 1) {
        fixes.push({ x, y, value, technique: result.technique });
        if (fixes.filter(f => f.technique === 'line').length >= limit) return rank(fixes).slice(0, limit);
      }
    }
  }
  return rank(fixes).slice(0, limit);
}

function rank (fixes) {
  const order = { line: 0, contradiction: 1, search: 2 };
  return [...fixes].sort((a, b) => order[a.technique] - order[b.technique]);
}
