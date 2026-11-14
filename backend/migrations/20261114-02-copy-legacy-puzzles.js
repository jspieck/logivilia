// Copies puzzles, ratings, solves and comment links from the old per-type
// tables into the generic ones (see scripts/migrateToPuzzles.js for details
// and a dry run). Does nothing on a database without the old tables, e.g. a
// fresh one, or when Puzzles already has rows.
//
// It writes through the current models; if Puzzle, PuzzleRating or
// PuzzleSolve get new columns later, give them defaults in the database (not
// only in the model) or this migration breaks on old databases.

module.exports = {
  async up () {
    const { copyLegacy } = require('../scripts/migrateToPuzzles');
    await copyLegacy();
  },

  async down () {
    throw new Error('Copying the old puzzle tables cannot be undone automatically; restore the backup instead.');
  }
};
