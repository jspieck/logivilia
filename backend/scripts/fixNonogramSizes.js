// Crops nonogram solutions to their declared width x height.
//
// Some nonograms were resized in the editor and kept stale cells outside
// their visible area. The UI and the server-side verifier already ignore
// those cells, so cropping changes nothing a player sees; it just makes the
// stored data match the puzzle (needed before clues are computed on the
// server).
//
// Usage (from the backend folder):
//   node scripts/fixNonogramSizes.js --seed          rewrite seed/nonograms.json
//   node scripts/fixNonogramSizes.js                 dry run against the database
//   node scripts/fixNonogramSizes.js --apply         update the database

const fs = require('fs');
const path = require('path');

function cropSolution (nonogram) {
  const width = Number(nonogram.width);
  const height = Number(nonogram.height);
  const solution = Array.isArray(nonogram.solution) ? nonogram.solution : [];
  return solution.slice(0, height).map(row => row.slice(0, width));
}

function needsCrop (nonogram) {
  const solution = Array.isArray(nonogram.solution) ? nonogram.solution : [];
  return solution.length > Number(nonogram.height) ||
    solution.some(row => row.length > Number(nonogram.width));
}

function fixSeedFile () {
  const file = path.join(__dirname, '../seed/nonograms.json');
  const nonograms = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fixed = nonograms.filter(needsCrop);
  for (const nonogram of fixed) {
    nonogram.solution = cropSolution(nonogram);
  }
  fs.writeFileSync(file, JSON.stringify(nonograms));
  console.log(`Cropped ${fixed.length} seed nonogram(s):`, fixed.map(n => n.name).join(', ') || '-');
}

async function fixDatabase (apply) {
  const { Puzzle, sequelize } = require('../models');
  const { puzzleData } = require('../utils/puzzleView');
  await require('../puzzles').ready;
  const nonograms = await Puzzle.findAll({ where: { type: 'nonogram' } });
  const broken = nonograms.filter(n => needsCrop(puzzleData(n)));
  for (const nonogram of broken) {
    console.log(`${apply ? 'Cropping' : 'Would crop'} #${nonogram.id} "${nonogram.name}"`);
    if (apply) {
      const data = puzzleData(nonogram);
      nonogram.data = { ...data, solution: cropSolution(data) };
      nonogram.changed('data', true);
      await nonogram.save();
    }
  }
  console.log(`${broken.length} nonogram(s) ${apply ? 'cropped' : 'need cropping (run with --apply)'}.`);
  await sequelize.close();
}

module.exports = { cropSolution, needsCrop };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--seed')) {
    fixSeedFile();
  } else {
    fixDatabase(args.includes('--apply')).catch(err => {
      console.error(err);
      process.exit(1);
    });
  }
}
