// Creator workflow (audit "Finish the creator workflow").
//
// Puzzles.status: 'published' (everyone sees it), 'pending' (waits for an
// Admin's review) or 'rejected' (sent back; reviewNote says why). Only
// published puzzles appear in lists, on the start page and in "next"; the
// author and Admins can still open the others. Existing puzzles are
// published.
//
// PuzzleDrafts: unfinished editor work of logged-in creators, so it follows
// them to other devices (it used to live in localStorage). `state` is the
// editor's own snapshot; the server only stores it.

const { ensureTable, ensureColumn, ensureIndex, removeColumnIfExists, tableExists } = require('./helpers');

module.exports = {
  async up (qi, Sequelize) {
    await ensureColumn(qi, 'Puzzles', 'status', {
      type: Sequelize.STRING(20), allowNull: false, defaultValue: 'published'
    });
    await ensureColumn(qi, 'Puzzles', 'reviewNote', { type: Sequelize.TEXT, allowNull: true });
    await ensureIndex(qi, 'Puzzles', ['status', 'type']);

    await ensureTable(qi, 'PuzzleDrafts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      type: { type: Sequelize.STRING(20), allowNull: false },
      name: { type: Sequelize.STRING, allowNull: true },
      state: { type: Sequelize.JSON, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    });
    await ensureIndex(qi, 'PuzzleDrafts', ['UserId']);
  },

  async down (qi) {
    if (await tableExists(qi, 'PuzzleDrafts')) {
      await qi.dropTable('PuzzleDrafts');
    }
    await removeColumnIfExists(qi, 'Puzzles', 'reviewNote');
    await removeColumnIfExists(qi, 'Puzzles', 'status');
  }
};
