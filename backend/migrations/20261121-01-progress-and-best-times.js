// Saved progress and personal best times (audit item 10).
//
// PuzzleProgresses: one unfinished game per user and puzzle, so a logged-in
// player can continue on another device. `state` is what the board stores
// (the same object guests keep in localStorage); the server does not read it.
// It is deleted when the puzzle is solved or restarted.
//
// PuzzleSolves.bestSeconds: the fastest verified solve of the user, in
// seconds (null for solves recorded before this, or without a time).

const { ensureTable, ensureColumn, ensureIndex, tableExists } = require('./helpers');

const ref = (Sequelize, table) => ({
  type: Sequelize.INTEGER,
  allowNull: true,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE'
});

module.exports = {
  async up (qi, Sequelize) {
    await ensureTable(qi, 'PuzzleProgresses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      state: { type: Sequelize.JSON, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      UserId: ref(Sequelize, 'Users'),
      PuzzleId: ref(Sequelize, 'Puzzles')
    });
    await ensureIndex(qi, 'PuzzleProgresses', ['UserId', 'PuzzleId'], { unique: true });
    await ensureColumn(qi, 'PuzzleSolves', 'bestSeconds', { type: Sequelize.INTEGER, allowNull: true });
  },

  async down (qi) {
    if (await tableExists(qi, 'PuzzleProgresses')) {
      await qi.dropTable('PuzzleProgresses');
    }
    await qi.removeColumn('PuzzleSolves', 'bestSeconds');
  }
};
