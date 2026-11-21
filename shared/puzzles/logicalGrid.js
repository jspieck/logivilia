// Logic grid puzzle: the player's helper grid, without Vue (used by
// frontend/src/puzzles/logical/LogicGrid.vue and LogicalDisplay.vue).
//
// Layout (n categories, m values each, B = n - 1 blocks):
//   columns: categories 1 .. n-1, left to right
//   rows:    category 0, then n-1, n-2, ..., 2 (top to bottom)
// so every pair of categories meets in exactly one block, and the blocks
// form a staircase: block row r has B - r blocks.
// The grid is only a scratch pad for the player; the answer is the table.

export const EMPTY = 0
export const NO = 1
export const YES = 2

/**
 * Geometry of the staircase grid for n categories of m values.
 * @param {number} n
 * @param {number} m
 */
export function gridGeometry (n, m) {
  const blocks = Math.max(n - 1, 0)
  const size = blocks * m
  return {
    n,
    m,
    blocks,
    size,
    /** Category shown in block column c. */
    colAttr: c => c + 1,
    /** Category shown in block row r. */
    rowAttr: r => (r === 0 ? 0 : n - r),
    isValid: (x, y) => Math.floor(x / m) + Math.floor(y / m) < blocks,
    idx: (x, y) => y * size + x,
    /** Number of cells in grid row y (the staircase). */
    rowLength: y => (blocks - Math.floor(y / m)) * m,
    /** Number of cells in grid column x. */
    colLength: x => (blocks - Math.floor(x / m)) * m
  }
}

/** An empty grid (all cells EMPTY, including the unused corner). */
export function emptyGrid (geo) {
  return new Array(geo.size * geo.size).fill(EMPTY)
}

/** One empty answer per value of category 0 and category j + 1: "i_j". */
export function emptyInputs (geo) {
  const inputs = {}
  for (let i = 0; i < geo.m; i++) {
    for (let j = 0; j < geo.n - 1; j++) inputs[`${i}_${j}`] = null
  }
  return inputs
}

/**
 * Sets one cell in `cells` (mutated). With autoCross, a YES rules out every
 * other still-empty value of both categories in its block.
 */
export function setCell (cells, geo, x, y, value, autoCross) {
  if (!geo.isValid(x, y)) return
  const { m, idx } = geo
  cells[idx(x, y)] = value
  if (value !== YES || !autoCross) return
  const bx = Math.floor(x / m) * m
  const by = Math.floor(y / m) * m
  for (let k = 0; k < m; k++) {
    if (bx + k !== x && cells[idx(bx + k, y)] === EMPTY) cells[idx(bx + k, y)] = NO
    if (by + k !== y && cells[idx(x, by + k)] === EMPTY) cells[idx(x, by + k)] = NO
  }
}

/** Paints the rectangle from `from` to `to` on a copy of `before`. */
export function paintRect (before, geo, from, to, value, autoCross) {
  const cells = [...before]
  for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) {
    for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) {
      setCell(cells, geo, x, y, value, autoCross)
    }
  }
  return cells
}

/**
 * Grid "yes" marks in the top block row fill the answer table: returns the
 * answers after a stroke changed the grid from `before` to `after`. A mark
 * taken back clears its answer only if the answer still is that value.
 * @param {number[]} before
 * @param {number[]} after
 * @param {ReturnType<typeof gridGeometry>} geo
 * @param {{ values: string[] }[]} attributes
 * @param {Record<string, string | null>} inputs
 */
export function syncTable (before, after, geo, attributes, inputs) {
  const next = { ...inputs }
  for (let i = 0; i < geo.m; i++) {
    for (let x = 0; x < geo.size; x++) {
      const was = before[geo.idx(x, i)]
      const now = after[geo.idx(x, i)]
      if (was === now) continue
      const c = Math.floor(x / geo.m)
      const key = `${i}_${c}`
      const value = attributes[geo.colAttr(c)].values[x % geo.m]
      if (now === YES) next[key] = value
      else if (was === YES && next[key] === value) next[key] = null
    }
  }
  return next
}

/** True if `cells` is a grid of this size holding only EMPTY / NO / YES. */
export function isGrid (cells, geo) {
  return Array.isArray(cells) && cells.length === geo.size * geo.size &&
    cells.every(v => v === EMPTY || v === NO || v === YES)
}
