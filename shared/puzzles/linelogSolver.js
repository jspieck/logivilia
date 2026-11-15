// Linelog solver: finds the path layouts that connect every pair of numbers.
//
// Rules: two cells with the same number n and the same colour are joined by a
// path of exactly n cells (both numbers included) through horizontally or
// vertically adjacent cells. Paths do not cross or touch other numbers; a 1
// is a path on its own. Cells on no path stay empty.
//
// Players are judged by the coloured picture, not by the paths, so a puzzle
// is "unique" when every solution gives the same picture. The search is a
// depth-first search that always branches on the number with the fewest
// possible paths (most are forced), and stops at a node or time budget.

/**
 * @typedef {object} LinelogClues
 * @property {number|string} width
 * @property {number|string} height
 * @property {(number|string)[][]} information        the numbers, 0 = none
 * @property {(number|string)[][]} informationColors  colour of each number (stored encoding)
 *
 * @typedef {object} LinelogSolveResult
 * @property {'unique'|'ambiguous'|'none'|'too-complex'} status
 * @property {number[][]} [solution]  picture of the first solution (stored encoding)
 * @property {number[][][]} [paths]   its paths as lists of [x, y]
 * @property {number[][]} [other]     a different picture, when ambiguous
 * @property {number[][][]} [otherPaths]
 * @property {number} nodes           search nodes used
 * @property {number} guesses         branch points with more than one option
 */

const TOO_COMPLEX = new Error('too complex');
const FIRST_CAP = 400;

/**
 * @param {LinelogClues} clues
 * @param {{ maxNodes?: number, maxMillis?: number, target?: number[][], layoutOnly?: boolean }} [options]
 *   target: the intended picture; "unique" then means no solution gives a
 *   different picture. layoutOnly (with target): only find paths that draw
 *   the target (status 'unique' if found, 'none' if there are none).
 * @returns {LinelogSolveResult}
 */
export function solveLinelog (clues, { maxNodes = 5e7, maxMillis = 5000, target, layoutOnly = false } = {}) {
  const width = Number(clues.width);
  const height = Number(clues.height);
  const size = width * height;
  const num = new Int32Array(size);
  const col = new Int32Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      num[y * width + x] = Number(clues.information?.[y]?.[x]) || 0;
      col[y * width + x] = Number(clues.informationColors?.[y]?.[x]) || 0;
    }
  }

  // Neighbours of each cell.
  const neighbours = Array.from({ length: size }, (_, i) => {
    const x = i % width;
    const y = (i - x) / width;
    const list = [];
    if (x > 0) list.push(i - 1);
    if (x < width - 1) list.push(i + 1);
    if (y > 0) list.push(i - width);
    if (y < height - 1) list.push(i + width);
    return list;
  });
  const distance = (a, b) => Math.abs((a % width) - (b % width)) + Math.abs(Math.floor(a / width) - Math.floor(b / width));

  const targetColour = new Int32Array(size);
  if (target) {
    for (let i = 0; i < size; i++) targetColour[i] = Number(target[Math.floor(i / width)]?.[i % width]) || 0;
  }
  // occupied[i]: 1 if a placed path covers cell i. Number cells are never free.
  const occupied = new Uint8Array(size);
  const connected = new Uint8Array(size);
  const onPath = new Uint8Array(size);
  const reach = new Int32Array(size);
  const reachStamp = new Int32Array(size);
  let stamp = 0;
  /** @type {number[]} endpoints (numbers > 1), small numbers first */
  const endpoints = [];
  for (let i = 0; i < size; i++) {
    if (num[i] > 1) endpoints.push(i);
  }
  endpoints.sort((a, b) => num[a] - num[b]);
  // Possible partners of each endpoint: same number and colour, reachable
  // with the right parity (the grid is bipartite).
  /** @type {Map<number, number[]>} */
  const partnersOf = new Map(endpoints.map(s => [s, endpoints.filter(t => t !== s &&
    num[t] === num[s] && col[t] === col[s] && distance(s, t) <= num[s] - 1 &&
    (num[s] - 1 - distance(s, t)) % 2 === 0)]));

  const started = Date.now();
  let nodes = 0;
  let guesses = 0;
  const tick = () => {
    nodes += 1;
    if (nodes > maxNodes || ((nodes & 1023) === 0 && Date.now() - started > maxMillis)) throw TOO_COMPLEX;
  };

  /**
   * The free partners of endpoint s, and in reach (cells stamped `stamp`) the
   * steps from each free cell to the nearest of them, around placed paths and
   * other numbers. (An entry counts only if it carries the current stamp, so
   * the array never needs clearing.)
   */
  function partnerDistances (s) {
    const n = num[s];
    const partners = /** @type {number[]} */ (partnersOf.get(s)).filter(t => !connected[t]);
    stamp += 1;
    let queue = partners.slice();
    for (const t of partners) { reach[t] = 0; reachStamp[t] = stamp; }
    for (let d = 1; queue.length && d < n; d++) {
      const next = [];
      for (const cell of queue) {
        for (const nb of neighbours[cell]) {
          if (reachStamp[nb] !== stamp && num[nb] === 0 && !occupied[nb]) {
            reach[nb] = d;
            reachStamp[nb] = stamp;
            next.push(nb);
          }
        }
      }
      queue = next;
    }
    return partners;
  }

  /**
   * Paths (cell index lists) from endpoint s to a free partner, at most `cap`.
   * @returns {number[][]}
   */
  function pathsFrom (s, cap) {
    const n = num[s];
    /** @type {number[][]} */
    const found = [];
    const partners = partnerDistances(s);
    if (!partners.length) return found;
    // Free-cell distances are a lower bound: the path's own cells are ignored.
    const pathStamp = stamp;
    const path = [s];
    onPath[s] = 1;
    const walk = (cell, remaining) => {
      tick();
      for (const next of neighbours[cell]) {
        if (remaining === 1) {
          if (num[next] === n && col[next] === col[s] && next !== s && !connected[next] && partners.includes(next)) {
            found.push([...path, next]);
            if (found.length >= cap) return true;
          }
          continue;
        }
        if (num[next] !== 0 || occupied[next] || onPath[next]) continue;
        if (layoutOnly && targetColour[next] !== col[s]) continue;
        if (reachStamp[next] !== pathStamp || reach[next] > remaining - 1) continue;
        path.push(next);
        onPath[next] = 1;
        const stop = walk(next, remaining - 1);
        onPath[next] = 0;
        path.pop();
        if (stop) return true;
      }
      return false;
    };
    walk(s, n - 1);
    onPath[s] = 0;
    return found;
  }

  /** @type {number[][]} */
  const placed = [];
  const place = path => {
    for (const i of path) occupied[i] = 1;
    connected[path[0]] = 1;
    connected[path[path.length - 1]] = 1;
    placed.push(path);
  };
  const unplace = path => {
    for (const i of path) occupied[i] = 0;
    connected[path[0]] = 0;
    connected[path[path.length - 1]] = 0;
    placed.pop();
  };

  const picture = () => {
    const grid = Array.from({ length: height }, () => new Array(width).fill(0));
    for (let i = 0; i < size; i++) {
      if (num[i] === 1) grid[Math.floor(i / width)][i % width] = col[i];
    }
    for (const path of placed) {
      for (const i of path) grid[Math.floor(i / width)][i % width] = col[path[0]];
    }
    return grid;
  };
  const toXY = list => list.map(path => path.map(i => [i % width, Math.floor(i / width)]));
  const samePicture = (a, b) => a.every((row, y) => row.every((v, x) => v === b[y][x]));

  // With a target picture, a different picture needs a path over a cell of
  // another colour ("straying"): paths that stay on cells of their own colour
  // cover exactly the target's coloured cells (their total length is fixed),
  // so they reproduce the target. That lets the search skip the many layouts
  // that only rearrange paths inside one colour.
  const strays = path => path.some(i => targetColour[i] !== col[path[0]]);
  const fromStart = new Int32Array(size);
  const fromStartStamp = new Int32Array(size);

  // False if no path from s can reach a cell of another colour (a lower
  // bound by free-cell distances; the path's own crossings are ignored).
  function canStray (s) {
    const n = num[s];
    if (n < 3) return false;
    if (!partnerDistances(s).length) return false;
    const partnerStamp = stamp;
    stamp += 1;
    let queue = [s];
    fromStart[s] = 0;
    fromStartStamp[s] = stamp;
    for (let d = 1; queue.length && d <= n - 2; d++) {
      const next = [];
      for (const cell of queue) {
        for (const nb of neighbours[cell]) {
          if (fromStartStamp[nb] === stamp || num[nb] !== 0 || occupied[nb]) continue;
          fromStart[nb] = d;
          fromStartStamp[nb] = stamp;
          if (targetColour[nb] !== col[s] && reachStamp[nb] === partnerStamp && d + reach[nb] <= n - 1) return true;
          next.push(nb);
        }
      }
      queue = next;
    }
    return false;
  }

  /** @type {'any' | 'differ' | 'stray'} any: stop at the first solution;
   *  differ: find a picture other than `first`; stray: find one other than the target. */
  let mode = 'any';
  let straying = 0;
  /** @type {number[][] | null} */
  let first = null;
  /** @type {number[][][] | null} */
  let firstPaths = null;
  /** @type {number[][] | null} */
  let other = null;
  /** @type {number[][][] | null} */
  let otherPaths = null;

  function search () {
    tick();
    const needStray = mode === 'stray' && straying === 0;
    let best = -1;
    let open = false;
    let anyStray = !needStray;
    /** @type {number[][] | null} */
    let options = null;
    let bestStrays = false;
    for (const s of endpoints) {
      if (connected[s]) continue;
      open = true;
      const stray = needStray && canStray(s);
      if (stray) anyStray = true;
      // Branch on the number with the fewest paths; on a tie, on one whose
      // path could stray (that is where a different picture can come from).
      const cap = options ? options.length + (stray && !bestStrays ? 1 : 0) : FIRST_CAP;
      const list = pathsFrom(s, cap);
      if (list.length === 0) return false;
      if (!options || list.length < options.length || (list.length === options.length && stray && !bestStrays)) {
        best = s;
        options = list;
        bestStrays = stray;
        if (list.length === 1) break;
      }
    }
    if (!open) {
      const grid = picture();
      if (mode === 'any') {
        first = grid;
        firstPaths = toXY(placed);
        return true;
      }
      const reference = mode === 'stray' ? /** @type {number[][]} */ (target) : /** @type {number[][]} */ (first);
      if (!samePicture(grid, reference)) {
        other = grid;
        otherPaths = toXY(placed);
        return true;
      }
      return false;
    }
    // Nothing can stray any more: every completion repeats the target.
    if (!anyStray && (options === null || options.length > 1)) return false;
    const list = /** @type {number[][]} */ (options);
    let all = list.length >= FIRST_CAP ? pathsFrom(best, Infinity) : list;
    if (all.length > 1) guesses += 1;
    if (needStray) all = [...all.filter(strays), ...all.filter(p => !strays(p))];
    for (const path of all) {
      const stray = mode === 'stray' && strays(path);
      place(path);
      if (stray) straying += 1;
      const stop = search();
      if (stray) straying -= 1;
      unplace(path);
      if (stop) return true;
    }
    return false;
  }

  /** @type {LinelogSolveResult['status']} */
  let status;
  try {
    // First any solution, then one with a different picture.
    search();
    if (!first) {
      status = 'none';
    } else if (layoutOnly) {
      status = 'unique';
    } else if (target && !samePicture(first, target)) {
      other = first;
      otherPaths = firstPaths;
      status = 'ambiguous';
    } else {
      mode = target ? 'stray' : 'differ';
      search();
      status = other ? 'ambiguous' : 'unique';
    }
  } catch (error) {
    if (error !== TOO_COMPLEX) throw error;
    status = other ? 'ambiguous' : 'too-complex';
  }
  /** @type {LinelogSolveResult} */
  const result = { status, nodes, guesses };
  // (Set inside search(), which TypeScript cannot see.)
  const found = /** @type {{ first: number[][] | null, firstPaths: number[][][] | null, other: number[][] | null, otherPaths: number[][][] | null }} */ ({ first, firstPaths, other, otherPaths });
  if (found.first && found.firstPaths) { result.solution = found.first; result.paths = found.firstPaths; }
  if (found.other && found.otherPaths) { result.other = found.other; result.otherPaths = found.otherPaths; }
  return result;
}
