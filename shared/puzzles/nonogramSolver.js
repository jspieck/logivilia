// Nonogram solver (audit B6), multi-colour.
//
// Works only from the clues, never from a stored solution, so it can tell
// whether a puzzle has exactly one solution and whether that solution can be
// reached by line logic alone (no guessing).
//
// Cells are bit masks of the colours still possible: bit 0 = empty,
// bit k = colour k. Blocks of the same colour need at least one empty cell
// between them; blocks of different colours may touch.
//
// 1. Line logic: for one row or column, find every colour each cell can take
//    in some placement of the clue blocks that fits the current masks (a
//    forward/backward dynamic programme, O(cells x blocks) per line plus the
//    block lengths). Repeat over dirty lines until nothing changes.
// 2. Contradiction (probing): for each open cell, assume each remaining
//    colour and run line logic. Colours that lead to a contradiction are
//    removed; cells that end up the same in every surviving assumption are
//    set. Repeat 1 and 2 until nothing changes.
// 3. Search: if cells are still open, pick one, try each colour, and go back
//    to 1. Stops after `limit` solutions, `maxNodes` search nodes or
//    `maxMillis` milliseconds (then `complete` is false).
//
// Probing tries each assumption in place and undoes it from a trail of
// changed cells, so a trial costs only the cells it touches.

/** @typedef {import('../index').ClueBlock} ClueBlock */

const EMPTY = 1; // mask of "empty" (bit 0)

function popcount (mask) {
  let n = 0;
  while (mask) {
    mask &= mask - 1;
    n += 1;
  }
  return n;
}

function lowestColour (mask) {
  let c = 0;
  while (!(mask & (1 << c))) {
    c += 1;
  }
  return c;
}

// Scratch buffers reused by solveLine (it is not re-entrant).
let scratch = new Uint8Array(0);
let scratchInt = new Int32Array(0);

/**
 * All colours each cell can take, given the line's clue blocks and current
 * masks. Returns null if no placement fits.
 * @param {number[]} masks current masks of the line's cells
 * @param {ClueBlock[]} blocks
 * @returns {number[] | null}
 */
export function solveLine (masks, blocks) {
  const n = masks.length;
  const m = blocks.length;
  const stride = n + 1;
  const size = (m + 1) * stride;

  // State (j, i, s): blocks 0..j-1 are placed in cells [0, i); s = A if cell
  // i-1 is empty (or i = 0), s = B if block j-1 ends at cell i-1.
  // Buffer layout: fwdA, fwdB, bwdA, bwdB, placeA, placeB (each `size`).
  // placeA[j][i]: block j can start at cell i after an empty cell;
  // placeB[j][i]: the same right after block j-1 (needs a different colour).
  if (scratch.length < 6 * size) {
    scratch = new Uint8Array(6 * size * 2);
  }
  const buf = scratch;
  buf.fill(0, 0, 6 * size);
  const FA = 0;
  const FB = size;
  const BA = 2 * size;
  const BB = 3 * size;
  const PA = 4 * size;
  const PB = 5 * size;

  // cannot[i] = number of cells in [0, i) that cannot take the block's
  // colour, computed once per distinct colour.
  if (scratchInt.length < stride * 2) {
    scratchInt = new Int32Array(stride * 4);
  }
  const cannot = scratchInt;
  let lastColour = -1;
  // Placements per block; blocks of the same colour share the prefix sums,
  // so blocks are processed grouped by colour.
  const order = Array.from({ length: m }, (_, j) => j).sort((p, q) => blocks[p][0] - blocks[q][0]);
  for (const j of order) {
    const [colour, length] = blocks[j];
    if (colour !== lastColour) {
      lastColour = colour;
      const bit = 1 << colour;
      cannot[0] = 0;
      for (let i = 0; i < n; i++) {
        cannot[i + 1] = cannot[i] + ((masks[i] & bit) ? 0 : 1);
      }
    }
    const sameAsPrev = j > 0 && blocks[j - 1][0] === colour;
    const row = j * stride;
    for (let i = 0; i + length <= n; i++) {
      if (cannot[i + length] === cannot[i]) {
        buf[PA + row + i] = 1;
        if (!sameAsPrev && j > 0) {
          buf[PB + row + i] = 1;
        }
      }
    }
  }

  // Only states that leave room for the blocks before and after them can
  // be part of a placement: at cell i, j blocks are placed only if
  // need[j] <= i and needAfter[j] <= n - i. jFrom/jTo give that band per i.
  const need = new Int32Array(m + 1);
  for (let j = 0; j < m; j++) {
    need[j + 1] = need[j] + blocks[j][1] + (j > 0 && blocks[j - 1][0] === blocks[j][0] ? 1 : 0);
  }
  const needAfter = new Int32Array(m + 1);
  for (let j = m - 1; j >= 0; j--) {
    needAfter[j] = needAfter[j + 1] + blocks[j][1] + (j < m - 1 && blocks[j + 1][0] === blocks[j][0] ? 1 : 0);
  }
  if (need[m] > n) {
    return null;
  }
  const jFrom = new Int32Array(n + 1);
  const jTo = new Int32Array(n + 1);
  for (let i = 0, lo = 0, hi = 0; i <= n; i++) {
    while (lo < m && needAfter[lo] > n - i) {
      lo += 1;
    }
    while (hi < m && need[hi + 1] <= i) {
      hi += 1;
    }
    jFrom[i] = lo;
    jTo[i] = hi;
  }

  // Forward: which states can be reached from the start.
  buf[FA] = 1;
  for (let i = 0; i < n; i++) {
    const emptyOk = (masks[i] & EMPTY) !== 0;
    for (let j = jFrom[i]; j <= jTo[i]; j++) {
      const k = j * stride + i;
      const a = buf[FA + k];
      const b = buf[FB + k];
      if (!a && !b) {
        continue;
      }
      if (emptyOk) {
        buf[FA + k + 1] = 1;
      }
      if (j < m && ((a && buf[PA + k]) || (b && buf[PB + k]))) {
        buf[FB + (j + 1) * stride + i + blocks[j][1]] = 1;
      }
    }
  }
  const last = m * stride + n;
  if (!buf[FA + last] && !buf[FB + last]) {
    return null;
  }

  // Backward: from which states the rest of the line can be completed.
  buf[BA + last] = 1;
  buf[BB + last] = 1;
  for (let i = n - 1; i >= 0; i--) {
    const emptyOk = (masks[i] & EMPTY) !== 0;
    for (let j = jFrom[i]; j <= jTo[i]; j++) {
      const k = j * stride + i;
      const viaEmpty = emptyOk && buf[BA + k + 1] === 1;
      let afterA = viaEmpty;
      let afterB = viaEmpty;
      if (j < m) {
        const end = i + blocks[j][1];
        if (end <= n && buf[BB + (j + 1) * stride + end]) {
          afterA = afterA || buf[PA + k] === 1;
          afterB = afterB || buf[PB + k] === 1;
        }
      }
      buf[BA + k] = afterA ? 1 : 0;
      buf[BB + k] = afterB ? 1 : 0;
    }
  }

  // Colours used by some complete placement. Block colours are written as
  // range additions per colour (difference arrays) and summed afterwards.
  const result = new Array(n).fill(0);
  /** @type {Map<number, Int32Array>} */
  const coverage = new Map();
  for (let i = 0; i < n; i++) {
    const emptyOk = (masks[i] & EMPTY) !== 0;
    for (let j = jFrom[i]; j <= jTo[i]; j++) {
      const k = j * stride + i;
      const a = buf[FA + k];
      const b = buf[FB + k];
      if (!a && !b) {
        continue;
      }
      if (emptyOk && buf[BA + k + 1]) {
        result[i] |= EMPTY;
      }
      if (j < m && ((a && buf[PA + k]) || (b && buf[PB + k]))) {
        const [colour, length] = blocks[j];
        const end = i + length;
        if (buf[BB + (j + 1) * stride + end]) {
          let diff = coverage.get(colour);
          if (!diff) {
            diff = new Int32Array(n + 1);
            coverage.set(colour, diff);
          }
          diff[i] += 1;
          diff[end] -= 1;
        }
      }
    }
  }
  for (const [colour, diff] of coverage) {
    let running = 0;
    const bit = 1 << colour;
    for (let i = 0; i < n; i++) {
      running += diff[i];
      if (running > 0) {
        result[i] |= bit;
      }
    }
  }
  return result;
}

/**
 * @typedef {object} Context
 * @property {ClueBlock[][]} rowClues
 * @property {ClueBlock[][]} columnClues
 * @property {number} lines line passes so far
 * @property {number} nodes search nodes so far
 * @property {number} deadline Date.now() value after which the solver gives up
 * @property {boolean} timedOut
 */

/**
 * Applies line logic to the dirty rows and columns until nothing changes.
 * Mutates `cells`; if `trail` is given, pushes y, x and the old mask of every
 * changed cell so the caller can undo. Returns false on a contradiction.
 * @param {number[][]} cells
 * @param {Context} ctx
 * @param {Set<number>} dirtyRows
 * @param {Set<number>} dirtyCols
 * @param {number[] | null} [trail]
 */
function propagate (cells, ctx, dirtyRows, dirtyCols, trail = null) {
  const { rowClues, columnClues } = ctx;
  const height = rowClues.length;
  const width = columnClues.length;
  while (dirtyRows.size || dirtyCols.size) {
    for (const y of dirtyRows) {
      dirtyRows.delete(y);
      const line = cells[y];
      const next = solveLine(line, rowClues[y]);
      ctx.lines += 1;
      if (!next) {
        return false;
      }
      for (let x = 0; x < width; x++) {
        if (next[x] !== line[x]) {
          if (trail) {
            trail.push(y, x, line[x]);
          }
          line[x] = next[x];
          dirtyCols.add(x);
        }
      }
    }
    for (const x of dirtyCols) {
      dirtyCols.delete(x);
      const line = cells.map(row => row[x]);
      const next = solveLine(line, columnClues[x]);
      ctx.lines += 1;
      if (!next) {
        return false;
      }
      for (let y = 0; y < height; y++) {
        if (next[y] !== line[y]) {
          if (trail) {
            trail.push(y, x, line[y]);
          }
          cells[y][x] = next[y];
          dirtyRows.add(y);
        }
      }
    }
  }
  return true;
}

/** Undoes the changes recorded in `trail` (newest first). */
function undo (cells, trail) {
  for (let i = trail.length - 3; i >= 0; i -= 3) {
    cells[trail[i]][trail[i + 1]] = trail[i + 2];
  }
  trail.length = 0;
}

/** The open cell with the fewest remaining colours, or null if all are decided. */
function pickCell (cells) {
  let best = null;
  let bestCount = Infinity;
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      const count = popcount(cells[y][x]);
      if (count > 1 && count < bestCount) {
        best = [y, x];
        bestCount = count;
        if (count === 2) {
          return best;
        }
      }
    }
  }
  return best;
}

/**
 * Probing: assume each remaining colour of each open cell and keep what all
 * consistent assumptions agree on. Mutates `cells`. Returns null on a
 * contradiction or timeout (`ctx.timedOut` tells which), otherwise whether
 * anything changed.
 * @param {number[][]} cells
 * @param {Context} ctx
 */
function probe (cells, ctx) {
  const height = cells.length;
  const width = height ? cells[0].length : 0;
  /** @type {number[]} */
  const trail = [];
  // A cell's probe result only changes when the grid does, so cells probed
  // since the last change are skipped.
  let version = 0;
  const probedAt = new Int32Array(height * width).fill(-1);
  // Per probed cell: OR of the masks each successful trial left in the cells
  // it changed, how many successful trials changed each cell, and the last
  // trial that counted it (a cell can appear several times in a trail).
  /** @type {Map<number, number>} */
  const unionMask = new Map();
  /** @type {Map<number, number>} */
  const hits = new Map();
  /** @type {Map<number, number>} */
  const lastTrial = new Map();
  let changedAny = false;
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let options = cells[y][x];
        if (popcount(options) < 2 || probedAt[y * width + x] === version) {
          continue;
        }
        if (Date.now() > ctx.deadline) {
          ctx.timedOut = true;
          return null;
        }
        probedAt[y * width + x] = version;
        unionMask.clear();
        hits.clear();
        lastTrial.clear();
        let successes = 0;
        while (options) {
          const colour = lowestColour(options);
          options &= ~(1 << colour);
          trail.push(y, x, cells[y][x]);
          cells[y][x] = 1 << colour;
          if (propagate(cells, ctx, new Set([y]), new Set([x]), trail)) {
            successes += 1;
            for (let i = 0; i < trail.length; i += 3) {
              const key = trail[i] * width + trail[i + 1];
              if (lastTrial.get(key) !== successes) {
                lastTrial.set(key, successes);
                hits.set(key, (hits.get(key) || 0) + 1);
                unionMask.set(key, (unionMask.get(key) || 0) | cells[trail[i]][trail[i + 1]]);
              }
            }
          }
          undo(cells, trail);
        }
        if (!successes) {
          return null;
        }
        // Cells some successful trial left alone keep all their colours, so
        // only cells changed in every successful trial can be narrowed.
        const dirtyRows = new Set();
        const dirtyCols = new Set();
        for (const [key, mask] of unionMask) {
          if (hits.get(key) !== successes) {
            continue;
          }
          const yy = Math.floor(key / width);
          const xx = key % width;
          const narrowed = cells[yy][xx] & mask;
          if (narrowed !== cells[yy][xx]) {
            cells[yy][xx] = narrowed;
            dirtyRows.add(yy);
            dirtyCols.add(xx);
          }
        }
        if (dirtyRows.size) {
          changed = true;
          changedAny = true;
          version += 1;
          if (!propagate(cells, ctx, dirtyRows, dirtyCols)) {
            return null;
          }
        }
      }
    }
  }
  return changedAny;
}

/**
 * Depth-first search from `cells` with line logic at every node. Pushes
 * solutions (as colour grids) until `limit`; returns false if the node or
 * time budget ran out before the search was exhausted.
 * @param {number[][]} cells
 * @param {Context} ctx
 * @param {{ limit: number, maxNodes: number, deadline: number }} budget
 * @param {number[][][]} solutions
 */
function search (cells, ctx, budget, solutions) {
  let exhausted = true;
  const visit = grid => {
    if (solutions.length >= budget.limit || !exhausted) {
      return;
    }
    ctx.nodes += 1;
    if (ctx.nodes > budget.maxNodes || ((ctx.nodes & 63) === 0 && Date.now() > budget.deadline)) {
      exhausted = false;
      return;
    }
    const cell = pickCell(grid);
    if (!cell) {
      solutions.push(grid.map(row => row.map(lowestColour)));
      return;
    }
    const [y, x] = cell;
    let options = grid[y][x];
    while (options && solutions.length < budget.limit && exhausted) {
      const colour = lowestColour(options);
      options &= ~(1 << colour);
      const next = grid.map(row => [...row]);
      next[y][x] = 1 << colour;
      if (propagate(next, ctx, new Set([y]), new Set([x]))) {
        visit(next);
      }
    }
  };
  visit(cells);
  return exhausted || solutions.length >= budget.limit;
}

/**
 * Solves a nonogram from its clues: line logic, then probing, then a search
 * (with line logic only at each node, which is much cheaper than probing
 * there) for whatever is still open.
 * @param {{ rowClues: ClueBlock[][], columnClues: ClueBlock[][] }} clues
 * @param {{ limit?: number, maxNodes?: number, maxMillis?: number }} [options]
 *   limit: stop after this many solutions (2 proves "not unique").
 *   maxNodes, maxMillis: work budget; `complete` is false if it ran out.
 * @returns {import('../index').SolveResult<'nonogram'>}
 */
export function solveNonogram ({ rowClues, columnClues }, { limit = 2, maxNodes = 200000, maxMillis = 5000 } = {}) {
  const startedAt = Date.now();
  const height = rowClues.length;
  const width = columnClues.length;
  let maxColour = 0;
  for (const line of [...rowClues, ...columnClues]) {
    for (const [colour] of line) {
      maxColour = Math.max(maxColour, colour);
    }
  }
  const full = (1 << (maxColour + 1)) - 1;
  /** @type {Context} */
  const ctx = { rowClues, columnClues, lines: 0, nodes: 0, deadline: startedAt + maxMillis, timedOut: false };
  const all = n => new Set(Array.from({ length: n }, (_, i) => i));
  const cells = Array.from({ length: height }, () => new Array(width).fill(full));

  const result = (technique, solutions, complete) => ({
    solutions,
    logicalOnly: complete && solutions.length === 1 && technique !== 'search',
    technique,
    steps,
    complete
  });

  const ok = propagate(cells, ctx, all(height), all(width));
  const steps = ctx.lines;
  if (!ok) {
    return result('line', [], true);
  }
  if (pickCell(cells) === null) {
    return result('line', [cells.map(row => row.map(lowestColour))], true);
  }

  // Probing, then a search for what is left.
  const probed = probe(cells, ctx);
  if (ctx.timedOut) {
    return result('search', [], false);
  }
  if (probed === null) {
    return result('contradiction', [], true);
  }
  if (pickCell(cells) === null) {
    return result('contradiction', [cells.map(row => row.map(lowestColour))], true);
  }
  /** @type {number[][][]} */
  const solutions = [];
  const done = search(cells, ctx, { limit, maxNodes, deadline: ctx.deadline }, solutions);
  return result('search', solutions, done);
}
