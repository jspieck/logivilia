// Linelog editor logic (no Vue): numbers from a picture and its paths, the
// generator that turns a picture into a puzzle, and the uniqueness analysis.
//
// A draft is a picture (rows, stored encoding: 0 = background, k = colour k)
// plus paths (lists of [x, y], at least two cells, all one colour). Every
// coloured cell on no path is a 1. The puzzle's numbers follow from that:
// each path shows its length at both ends.

import { solveLinelog } from './linelogSolver.js';

/** Default for the longest number the generator makes. */
export const DEFAULT_MAX_NUMBER = 12;

const sizeOf = picture => ({ height: picture.length, width: picture.length ? picture[0].length : 0 });

/**
 * Drops paths that no longer fit the picture: off the grid, over background
 * or several colours, not a chain of neighbours, or overlapping an earlier one.
 * @param {number[][]} picture
 * @param {number[][][]} paths
 */
export function cleanPaths (picture, paths) {
  const { width, height } = sizeOf(picture);
  const used = new Set();
  return paths.filter(path => {
    if (!Array.isArray(path) || path.length < 2) return false;
    const colour = picture[path[0]?.[1]]?.[path[0]?.[0]];
    if (!colour) return false;
    const keys = [];
    for (let i = 0; i < path.length; i++) {
      const [x, y] = path[i];
      if (!(x >= 0 && y >= 0 && x < width && y < height) || picture[y][x] !== colour) return false;
      if (i && Math.abs(x - path[i - 1][0]) + Math.abs(y - path[i - 1][1]) !== 1) return false;
      const key = y * width + x;
      if (used.has(key) || keys.includes(key)) return false;
      keys.push(key);
    }
    keys.forEach(key => used.add(key));
    return true;
  });
}

/**
 * The puzzle's numbers and their colours.
 * @returns {{ information: number[][], informationColors: number[][] }}
 */
export function informationOf (picture, paths) {
  const information = picture.map(row => row.map(value => (value ? 1 : 0)));
  const informationColors = picture.map(row => [...row]);
  for (const path of paths) {
    path.forEach(([x, y], i) => {
      const end = i === 0 || i === path.length - 1;
      information[y][x] = end ? path.length : 0;
      if (!end) informationColors[y][x] = 0;
    });
  }
  return { information, informationColors };
}

/** Moves paths with a cell mapping; paths with a cell mapped to null are dropped. */
export function mapPaths (paths, map) {
  return paths
    .map(path => path.map(([x, y]) => map(x, y)))
    .filter(path => path.every(Boolean));
}

/** Path mappings that match the picture transforms of nonogramEditor.js. */
export const pathTransforms = {
  shift: (width, height, dx, dy) => (x, y) => {
    const nx = x + dx;
    const ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < width && ny < height ? [nx, ny] : null;
  },
  flipHorizontal: (width) => (x, y) => [width - 1 - x, y],
  flipVertical: (width, height) => (x, y) => [x, height - 1 - y],
  resize: (oldWidth, oldHeight, width, height) => {
    const dx = Math.floor((width - oldWidth) / 2);
    const dy = Math.floor((height - oldHeight) / 2);
    return pathTransforms.shift(width, height, dx, dy);
  }
};

/**
 * Paths that draw a saved puzzle's picture from its numbers (to edit it), or
 * null if none were found in time.
 * @param {number[][]} picture
 * @param {(number|string)[][]} information
 */
export function layoutFor (picture, information, { maxMillis = 3000 } = {}) {
  const { width, height } = sizeOf(picture);
  const informationColors = information.map((row, y) => row.map((n, x) => (Number(n) ? picture[y][x] : 0)));
  const result = solveLinelog({ width, height, information, informationColors }, { target: picture, layoutOnly: true, maxMillis });
  return result.status === 'unique' && result.paths ? result.paths.filter(p => p.length > 1) : null;
}

const cluesOf = (picture, paths) => {
  const { width, height } = sizeOf(picture);
  return { width, height, ...informationOf(picture, paths) };
};

/** Suggested difficulty 1-5 from size, longest number and how much guessing it needs. */
export function suggestDifficulty ({ width, height, maxNumber, guesses }) {
  const area = width * height;
  let difficulty = area <= 150 ? 1 : area <= 400 ? 2 : 3;
  if (guesses > 0) difficulty += 1;
  if (guesses > 20) difficulty += 1;
  if (maxNumber >= 15) difficulty += 1;
  return Math.min(5, Math.max(1, difficulty));
}

const sameCells = (a, b) => a.length === b.length &&
  (a.every((c, i) => c[0] === b[i][0] && c[1] === b[i][1]) ||
   a.every((c, i) => c[0] === b[b.length - 1 - i][0] && c[1] === b[b.length - 1 - i][1]));

/**
 * Checks a draft as a puzzle.
 * @returns {{ status: 'empty' } |
 *   { status: 'unique', difficulty: number, maxNumber: number, guesses: number } |
 *   { status: 'ambiguous', cells: {x: number, y: number}[], other: number[][], otherPaths: number[][][], conflicts: number[] } |
 *   { status: 'too-complex' }}
 *   cells: where the picture and another solution's picture differ;
 *   conflicts: indices of the draft's paths that the other solution does not use.
 */
export function analyze (picture, paths, { maxMillis = 3000 } = {}) {
  const { width, height } = sizeOf(picture);
  if (!picture.some(row => row.some(Boolean))) return { status: 'empty' };
  const clues = cluesOf(picture, paths);
  const result = solveLinelog(clues, { target: picture, maxMillis });
  if (result.status === 'ambiguous') {
    const other = /** @type {number[][]} */ (result.other);
    const otherPaths = /** @type {number[][][]} */ (result.otherPaths);
    const cells = [];
    other.forEach((row, y) => row.forEach((value, x) => { if (value !== picture[y][x]) cells.push({ x, y }); }));
    const conflicts = paths.map((path, i) => (otherPaths.some(o => sameCells(o, path)) ? -1 : i)).filter(i => i >= 0);
    return { status: 'ambiguous', cells, other, otherPaths, conflicts };
  }
  if (result.status === 'unique') {
    const maxNumber = Math.max(1, ...paths.map(p => p.length));
    return {
      status: 'unique',
      maxNumber,
      guesses: result.guesses,
      difficulty: suggestDifficulty({ width, height, maxNumber, guesses: result.guesses })
    };
  }
  // 'none' cannot happen (the draft's own paths solve it); treat it like a timeout.
  return { status: 'too-complex' };
}

// Small seeded random generator (mulberry32), so "generate" is repeatable.
function random (seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Turns a picture into a puzzle: starts from the given paths and a 1 on every
 * other coloured cell (always unique), then keeps joining neighbouring paths
 * of one colour into longer ones as long as the puzzle stays unique.
 * @param {number[][]} picture
 * @param {number[][][]} paths  paths to start from (kept unless joined)
 * @param {{ maxNumber?: number, maxMillis?: number, seed?: number }} [options]
 * @returns {{ paths: number[][][], complete: boolean }} complete: false if time ran out
 */
export function generate (picture, paths, { maxNumber = DEFAULT_MAX_NUMBER, maxMillis = 6000, seed = 1 } = {}) {
  const { width, height } = sizeOf(picture);
  const started = Date.now();
  const rand = random(seed);
  /** @type {number[][][]} all paths, including single cells */
  let current = cleanPaths(picture, paths).map(p => p.map(c => [...c]));
  const covered = new Set(current.flat().map(([x, y]) => y * width + x));
  picture.forEach((row, y) => row.forEach((value, x) => {
    if (value && !covered.has(y * width + x)) current.push([[x, y]]);
  }));

  const longPaths = list => list.filter(p => p.length > 1);
  const unique = list => solveLinelog(cluesOf(picture, longPaths(list)), {
    target: picture,
    maxNodes: 300000,
    maxMillis: Math.max(200, maxMillis - (Date.now() - started))
  }).status === 'unique';

  // Joins that broke uniqueness are not tried again (they rarely start
  // working after other joins, and retrying them costs most of the time).
  const failed = new Set();
  let complete = true;
  for (;;) {
    // Which path ends where.
    const endAt = new Map();
    current.forEach((path, i) => {
      endAt.set(path[0][1] * width + path[0][0], { i, first: true });
      const [lx, ly] = path[path.length - 1];
      if (path.length > 1) endAt.set(ly * width + lx, { i, first: false });
    });
    /** @type {{ a: number, aFirst: boolean, b: number, bFirst: boolean, score: number }[]} */
    const merges = [];
    endAt.forEach((end, key) => {
      const x = key % width;
      const y = (key - x) / width;
      for (const [nx, ny] of [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const other = endAt.get(ny * width + nx);
        if (!other || other.i <= end.i || picture[ny][nx] !== picture[y][x]) continue;
        const length = current[end.i].length + current[other.i].length;
        if (length > maxNumber) continue;
        // Joining 1s first gets rid of them; otherwise random.
        const singles = (current[end.i].length === 1 ? 1 : 0) + (current[other.i].length === 1 ? 1 : 0);
        merges.push({ a: end.i, aFirst: end.first, b: other.i, bFirst: other.first, score: singles + rand() * 1.5 });
      }
    });
    merges.sort((p, q) => q.score - p.score);

    let joined = false;
    for (const m of merges) {
      if (Date.now() - started > maxMillis) { complete = false; break; }
      // a ends at the shared border, b starts there.
      const a = m.aFirst ? [...current[m.a]].reverse() : current[m.a];
      const b = m.bFirst ? current[m.b] : [...current[m.b]].reverse();
      const joinedPath = [...a, ...b];
      const key = JSON.stringify(joinedPath);
      if (failed.has(key)) continue;
      const next = current.filter((_, i) => i !== m.a && i !== m.b);
      next.push(joinedPath);
      if (unique(next)) {
        current = next;
        joined = true;
        break;
      }
      failed.add(key);
    }
    if (!joined) break;
  }
  return { paths: longPaths(current), complete };
}
