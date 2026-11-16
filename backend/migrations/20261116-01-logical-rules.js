// Adds the formal rules of the seed Logikrätsel (seed/logicalRules.js) to the
// puzzles in the database, so admins can see them and the editor checks
// uniqueness when one of them is edited. Players do not get the rules.
//
// A puzzle is only changed if it is a logical with a seed name, has no rules
// yet (so nothing an author formalised is overwritten), its categories,
// values and clues still match the entry, and every rule fits its stored
// solution. Clues that contradict the stored solution (see `conflict` in
// logicalRules.js) get no rules. Running it again changes nothing.
//
// down removes the rules and the `ordered` marks again (a category that got
// an order of its own keeps its new value order; players see the same set).

const puzzles = require('../puzzles')
const { FORMALIZATIONS, formalize } = require('../seed/logicalRules')

function parse (data) {
  return typeof data === 'string' ? JSON.parse(data) : data
}

/** The data with rules added, or null if the puzzle is left alone. */
async function withRules (name, data) {
  if (!data || !Array.isArray(data.attributes) || (Array.isArray(data.rules) && data.rules.length)) return null
  let result
  try {
    result = formalize(name, data)
  } catch {
    return null // edited since: values or clues differ
  }
  if (!result || !result.data.rules.length) return null
  const { brokenRules } = await import('../../shared/puzzles/logicalSolver.js')
  if (puzzles.getPlugin('logical').checkData(result.data)) return null
  const broken = brokenRules(result.data)
  return broken && !broken.length ? result.data : null
}

// Only rules this migration added (the same as the entry gives) are removed.
function withoutRules (name, data) {
  if (!data || !Array.isArray(data.rules) || !data.rules.length) return null
  const { rules, ...rest } = data
  const plain = { ...rest, attributes: rest.attributes.map(({ ordered, ...attribute }) => attribute) }
  let expected
  try {
    expected = formalize(name, plain)
  } catch {
    return null
  }
  return expected && JSON.stringify(expected.data.rules) === JSON.stringify(rules) ? plain : null
}

async function run (qi, direction) {
  await puzzles.ready
  const { sequelize } = qi
  const table = qi.quoteIdentifier('Puzzles')
  const q = name => qi.quoteIdentifier(name)
  const names = Object.keys(FORMALIZATIONS)
  if (!names.length) return
  const rows = await sequelize.query(
    `SELECT ${q('id')}, ${q('name')}, ${q('data')} FROM ${table} WHERE ${q('type')} = 'logical' AND ${q('name')} IN (?)`,
    { replacements: [names], type: sequelize.QueryTypes.SELECT }
  )
  await sequelize.transaction(async transaction => {
    for (const row of rows) {
      const data = parse(row.data)
      const changed = direction === 'up' ? await withRules(row.name, data) : withoutRules(row.name, data)
      if (!changed) continue
      await sequelize.query(
        `UPDATE ${table} SET ${q('data')} = ? WHERE ${q('id')} = ?`,
        { replacements: [JSON.stringify(changed), row.id], transaction }
      )
    }
  })
}

module.exports = {
  withRules,

  async up (qi) {
    await run(qi, 'up')
  },

  async down (qi) {
    await run(qi, 'down')
  }
}
