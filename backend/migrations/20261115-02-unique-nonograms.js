// Four seed nonograms have more than one solution, found by the solver
// (shared/puzzles/nonogramSolver.js). A player who finds the other solution
// is told it is wrong. One cell each makes them unique, and solvable by line
// logic alone:
//
//   Bobby         row 7, column 11: colour 3 -> empty
//   Mohn im Topf  row 7, column 6:  empty -> colour 3 (stem)
//   Elefant       row 9, column 13: empty -> colour 1 (trunk)
//   Drache        row 14, column 3: empty -> colour 1 (tail tip)
//
// (1-based above, 0-based in FIXES.) A puzzle is only changed if it is a
// nonogram with that name and size, the cell still has the old colour, the
// puzzle currently has several solutions and the change makes it unique, so
// a user puzzle with the same name or an already edited one is left alone.
// Running it again changes nothing.

const puzzles = require('../puzzles')

const FIXES = [
  { name: 'Bobby', width: 15, height: 15, y: 6, x: 10, from: 3, to: 0 },
  { name: 'Mohn im Topf', width: 15, height: 15, y: 6, x: 5, from: 0, to: 3 },
  { name: 'Elefant', width: 15, height: 15, y: 8, x: 12, from: 0, to: 1 },
  { name: 'Drache', width: 11, height: 14, y: 13, x: 2, from: 0, to: 1 }
]

function parse (data) {
  return typeof data === 'string' ? JSON.parse(data) : data
}

function solutionCount (plugin, data) {
  const result = plugin.solve(plugin.computeClues(data))
  return result.complete ? result.solutions.length : -1
}

/**
 * Applies `fix` to `data` (a nonogram's stored data) if it matches; returns
 * the new data or null.
 */
function applyFix (fix, data, { from = fix.from, to = fix.to, checkUnique = true } = {}) {
  const plugin = puzzles.getPlugin('nonogram')
  if (!data || Number(data.width) !== fix.width || Number(data.height) !== fix.height ||
      !Array.isArray(data.solution) || !Array.isArray(data.solution[fix.y]) ||
      Number(data.solution[fix.y][fix.x]) !== from) {
    return null
  }
  const solution = data.solution.map(row => [...row])
  solution[fix.y][fix.x] = to
  const fixed = { ...data, solution }
  if (checkUnique && (solutionCount(plugin, data) < 2 || solutionCount(plugin, fixed) !== 1)) {
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
        `SELECT ${q('id')}, ${q('data')} FROM ${table} WHERE ${q('type')} = 'nonogram' AND ${q('name')} = ?`,
        { replacements: [fix.name], type: sequelize.QueryTypes.SELECT, transaction }
      )
      for (const row of rows) {
        const data = parse(row.data)
        const fixed = direction === 'up'
          ? applyFix(fix, data)
          : applyFix(fix, data, { from: fix.to, to: fix.from, checkUnique: false })
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
