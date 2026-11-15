// Runs the nonogram solver over every seed nonogram (or a JSON file of
// nonograms in the same format) and reports the ones that have no unique
// solution, plus how many need which technique (audit B6/B7).
//
// Usage (from the backend folder):
//   node scripts/checkNonograms.js                  seed/nonograms.json
//   node scripts/checkNonograms.js path/to/file.json
//
// Exits with code 1 if any puzzle has no or several solutions.

const path = require('path');
const puzzles = require('../puzzles');

async function checkNonograms (nonograms) {
  await puzzles.ready;
  const plugin = puzzles.getPlugin('nonogram');
  const techniques = { line: 0, contradiction: 0, search: 0 };
  const problems = [];
  nonograms.forEach((data, index) => {
    const result = plugin.solve(plugin.computeClues(data));
    techniques[result.technique] += 1;
    const label = `#${index} "${data.name}" (${data.width}x${data.height})`;
    if (!result.complete) {
      problems.push(`${label}: solver gave up, uniqueness unknown`);
    } else if (result.solutions.length === 0) {
      problems.push(`${label}: no solution`);
    } else if (result.solutions.length > 1) {
      problems.push(`${label}: several solutions`);
    }
  });
  return { techniques, problems };
}

if (require.main === module) {
  const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '../seed/nonograms.json');
  const nonograms = require(file);
  checkNonograms(nonograms).then(({ techniques, problems }) => {
    console.log(`${nonograms.length} nonograms. Hardest technique needed:`, techniques);
    console.log(problems.length ? problems.join('\n') : 'All have exactly one solution.');
    process.exitCode = problems.length ? 1 : 0;
  }).catch(error => {
    console.error(error);
    process.exitCode = 2;
  });
}

module.exports = { checkNonograms };
