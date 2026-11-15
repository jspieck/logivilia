// Two seed linelogs have numbers that also draw a different picture, found by
// the linelog solver (shared/puzzles/linelogSolver.js). A player who finds the
// other picture is told it is wrong. Splitting one path into two makes each
// unique and solvable without guessing; the picture stays the same, only
// three numbers change:
//
//   Kasette   the 8 along the top row becomes a 1 and a 7:
//             (1, 1) 8 -> 1, (2, 1) empty -> 7, (8, 1) 8 -> 7
//   Leuchten  the 5 at the left becomes a 1 and a 4:
//             (1, 5) 5 -> 1, (2, 5) empty -> 4, (3, 7) 5 -> 4
//
// ((column, row), 1-based above; 0-based x, y in FIXES.) A puzzle is only
// changed if it is a linelog with that name and size, every listed cell still
// has the old number, the puzzle is currently ambiguous and the change makes
// it unique, so a user puzzle with the same name or an already edited one is
// left alone. Running it again changes nothing.

const puzzles = require('../puzzles')

const FIXES = [
  {
    name: 'Kasette',
    width: 15,
    height: 10,
    cells: [{ x: 0, y: 0, from: 8, to: 1 }, { x: 1, y: 0, from: 0, to: 7 }, { x: 7, y: 0, from: 8, to: 7 }]
  },
  {
    name: 'Leuchten',
    width: 10,
    height: 10,
    cells: [{ x: 0, y: 4, from: 5, to: 1 }, { x: 1, y: 4, from: 0, to: 4 }, { x: 2, y: 6, from: 5, to: 4 }]
  }
]

function parse (data) {
  return typeof data === 'string' ? JSON.parse(data) : data
}

const problemOf = data => puzzles.getPlugin('linelog').checkSolvable(data)

/**
 * Applies `fix` to `data` (a linelog's stored data) if it matches; returns
 * the new data or null. `reverse` undoes the fix (no uniqueness check).
 */
function applyFix (fix, data, { reverse = false } = {}) {
  if (!data || Number(data.width) !== fix.width || Number(data.height) !== fix.height ||
      !Array.isArray(data.information)) {
    return null
  }
  const from = cell => (reverse ? cell.to : cell.from)
  const to = cell => (reverse ? cell.from : cell.to)
  if (!fix.cells.every(cell => Number(data.information[cell.y]?.[cell.x]) === from(cell))) return null
  const information = data.information.map(row => row.map(Number))
  for (const cell of fix.cells) information[cell.y][cell.x] = to(cell)
  const fixed = { ...data, information }
  if (!reverse && (problemOf(data)?.code !== 'PUZZLE_NOT_UNIQUE' || problemOf(fixed) !== null)) {
    return null
  }
  return fixed
}

async function run (qi, direction) {
  await puzzles.ready
  const { sequelize } = qi
  const table = qi.quoteIdentifier('Puzzles')
  const q = name => qi.quoteIdentifier(name)
  await sequelize.transaction(async transaction => {
    for (const fix of FIXES) {
      const rows = await sequelize.query(
        `SELECT ${q('id')}, ${q('data')} FROM ${table} WHERE ${q('type')} = 'linelog' AND ${q('name')} = ?`,
        { replacements: [fix.name], type: sequelize.QueryTypes.SELECT, transaction }
      )
      for (const row of rows) {
        const fixed = applyFix(fix, parse(row.data), { reverse: direction === 'down' })
        if (!fixed) continue
        await sequelize.query(
          `UPDATE ${table} SET ${q('data')} = ? WHERE ${q('id')} = ?`,
          { replacements: [JSON.stringify(fixed), row.id], transaction }
        )
      }
    }
  })
}

module.exports = {
  FIXES,
  applyFix,

  async up (qi) {
    await run(qi, 'up')
  },

  async down (qi) {
    await run(qi, 'down')
  }
}
