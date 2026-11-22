// The last three seed Logikrätsel whose clues the solver could not check
// get their complete rules (seed/logicalRules.js):
//
//   Kugeltrikolore      clues 1 and 4 compare totals (red + white + black
//                       balls per person): the new rule type `total`.
//   Strohsterne         seven clues talk about the seats at the table, which
//                       are not a category of the table: a hidden category
//                       "Platz" (data.hiddenAttributes) the rules use.
//   Kunstfertige Tiere  the grades repeat (4, 4, 5, 5, 6, 6); the solver now
//                       handles repeated values. Had no rules at all.
//
// Migration 20261116-01 gave the first two the rules of the clues it could
// express. A puzzle is only changed if it is a logical with that name whose
// rules are still exactly those (none for Kunstfertige Tiere), whose
// categories, values and clues still match the entry and whose new rules all
// fit its stored solution, so an edited or user puzzle with the same name is
// left alone. Running it again changes nothing; down restores the old rules.

const puzzles = require('../puzzles')
const { formalize } = require('../seed/logicalRules')

// 0-based indices of the clues that had no rules before.
const FIXES = [
  { name: 'Kugeltrikolore', newRuleClues: [0, 3] },
  { name: 'Strohsterne', newRuleClues: [1, 4, 7, 9, 11, 13, 15] },
  { name: 'Kunstfertige Tiere', newRuleClues: [0, 1, 2, 3, 4, 5, 6, 7], addsOrder: true }
]

function parse (data) {
  return typeof data === 'string' ? JSON.parse(data) : data
}

const same = (x, y) => JSON.stringify(x) === JSON.stringify(y)

/** The complete data for this puzzle, or null if it is left alone. */
async function completed (fix, data) {
  if (!data || !Array.isArray(data.attributes) || data.hiddenAttributes) return null
  let result
  try {
    result = formalize(fix.name, data)
  } catch {
    return null // edited since: values or clues differ
  }
  if (!result || result.gaps.length || result.conflicts.length) return null
  const old = result.data.rules.filter(rule => !fix.newRuleClues.includes(rule.clue))
  if (!same(Array.isArray(data.rules) ? data.rules : [], old)) return null
  const { brokenRules } = await import('../../shared/puzzles/logicalSolver.js')
  if (puzzles.getPlugin('logical').checkData(result.data)) return null
  const broken = brokenRules(result.data)
  return broken && !broken.length ? result.data : null
}

/** The data as before, or null if it is not what `up` made. */
function reverted (fix, data) {
  if (!data || !Array.isArray(data.rules)) return null
  const { hiddenAttributes, ...rest } = data
  let expected
  try {
    expected = formalize(fix.name, rest)
  } catch {
    return null
  }
  if (!expected || !same(expected.data.rules, data.rules)) return null
  const out = { ...rest, rules: data.rules.filter(rule => !fix.newRuleClues.includes(rule.clue)) }
  if (!out.rules.length) delete out.rules
  if (fix.addsOrder) { // its categories had no order marks before
    out.attributes = out.attributes.map(({ ordered, ...attribute }) => attribute)
  }
  return out
}

async function run (qi, direction) {
  await puzzles.ready
  const { sequelize } = qi
  const table = qi.quoteIdentifier('Puzzles')
  const q = name => qi.quoteIdentifier(name)
  const rows = await sequelize.query(
    `SELECT ${q('id')}, ${q('name')}, ${q('data')} FROM ${table} WHERE ${q('type')} = 'logical' AND ${q('name')} IN (?)`,
    { replacements: [FIXES.map(f => f.name)], type: sequelize.QueryTypes.SELECT }
  )
  await sequelize.transaction(async transaction => {
    for (const row of rows) {
      const fix = FIXES.find(f => f.name === row.name)
      const data = parse(row.data)
      const changed = direction === 'up' ? await completed(fix, data) : reverted(fix, data)
      if (!changed) continue
      await sequelize.query(
        `UPDATE ${table} SET ${q('data')} = ? WHERE ${q('id')} = ?`,
        { replacements: [JSON.stringify(changed), row.id], transaction }
      )
    }
  })
}

module.exports = {
  FIXES,
  completed,
  reverted,

  async up (qi) {
    await run(qi, 'up')
  },

  async down (qi) {
    await run(qi, 'down')
  }
}
