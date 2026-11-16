// Checks the formal rules of the seed Logikrätsel (seed/logicalRules.js):
// every rule must fit the stored solution, and a puzzle whose clues are all
// formalised must have exactly that one solution.
//
//   node scripts/checkLogicals.js          table of all puzzles
//   node scripts/checkLogicals.js --json   the same as JSON

const puzzles = require('../puzzles');
const logicals = require('../seed/logicals.json');
const { FORMALIZATIONS, formalize } = require('../seed/logicalRules');

/**
 * One result per seed puzzle: { name, status, clues, gaps, broken, technique,
 * error }. status: 'unique' | 'ambiguous' | 'none' | 'tooComplex' |
 * 'partial' (some clues not formalised), 'conflict' (clues contradict the
 * stored solution) | 'brokenRules' | 'dataError' |
 * 'missing' (no entry) | 'invalid' (entry does not resolve or check).
 */
async function checkLogicals () {
  await puzzles.ready;
  const plugin = puzzles.getPlugin('logical');
  const { solveLogical, brokenRules } = await import('../../shared/puzzles/logicalSolver.js');
  return logicals.map(seed => {
    const base = { name: seed.name, clues: seed.clues.length };
    const entry = FORMALIZATIONS[seed.name];
    if (!entry) return { ...base, status: 'missing' };
    if (entry.dataError) return { ...base, status: 'dataError', error: entry.dataError };
    let result;
    try {
      result = formalize(seed.name, seed);
    } catch (err) {
      return { ...base, status: 'invalid', error: err.message };
    }
    const { data, gaps, conflicts } = result;
    const problem = plugin.checkData(data);
    if (problem) return { ...base, status: 'invalid', error: problem, gaps };
    const broken = brokenRules(data);
    if (!broken) return { ...base, status: 'invalid', error: 'solution does not match the categories', gaps };
    if (broken.length) {
      return { ...base, status: 'brokenRules', gaps, broken: [...new Set(broken.map(i => data.rules[i].clue + 1))] };
    }
    const solved = solveLogical(data, { limit: 2, maxMillis: 10000 });
    const outcome = !solved.complete && solved.solutions.length < 2
      ? 'tooComplex'
      : solved.solutions.length === 1 ? 'unique' : solved.solutions.length ? 'ambiguous' : 'none';
    return {
      ...base,
      status: conflicts.length ? 'conflict' : gaps.length ? 'partial' : outcome,
      solverWithKnownRules: outcome,
      technique: solved.technique,
      gaps: gaps.map(i => i + 1),
      conflicts: conflicts.map(i => i + 1)
    };
  });
}

module.exports = { checkLogicals };

if (require.main === module) {
  checkLogicals().then(results => {
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    for (const r of results) {
      const extra = [
        r.technique && r.status !== 'partial' ? r.technique : '',
        r.gaps && r.gaps.length ? `gaps in clues ${r.gaps.join(', ')}` : '',
        r.conflicts && r.conflicts.length ? `clues ${r.conflicts.join(', ')} contradict the solution` : '',
        ['partial', 'conflict'].includes(r.status) ? `with the other rules: ${r.solverWithKnownRules}` : '',
        r.broken ? `rules of clues ${r.broken.join(', ')} do not fit the solution` : '',
        r.error || ''
      ].filter(Boolean).join(' - ');
      console.log(`${r.status.padEnd(12)} ${r.name}${extra ? '  (' + extra + ')' : ''}`);
    }
    const count = status => results.filter(r => r.status === status).length;
    console.log(`\n${results.length} puzzles: ${count('unique')} unique, ${count('ambiguous')} ambiguous, ` +
      `${count('partial')} partial, ${count('conflict')} with clues that contradict the solution, ${count('brokenRules')} with rules that break the solution, ` +
      `${count('dataError')} data errors, ${count('invalid')} invalid, ${count('missing')} missing`);
  });
}
