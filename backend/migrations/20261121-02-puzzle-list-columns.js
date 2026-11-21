// Grid size and number of colours as real columns (audit item 14), so the
// overview can filter, sort and paginate on the server. The values are
// copies of data.width / data.height / data.numColor (null for types without
// a grid, e.g. logic puzzles); the Puzzle model keeps them in step on every
// save (see listColumns in utils/puzzleView.js).
//
// No database defaults are needed: the columns are nullable, and older
// migrations that insert puzzles (copy-legacy, addSeedNonograms) never name
// them; this migration fills them in afterwards.

const { ensureColumn, ensureIndex, removeColumnIfExists } = require('./helpers');
const { listColumns } = require('../utils/puzzleView');

const COLUMNS = ['width', 'height', 'numColor'];

async function backfill (qi) {
  const { sequelize } = qi;
  const q = name => qi.quoteIdentifier(name);
  const rows = await sequelize.query(
    `SELECT ${q('id')}, ${q('type')}, ${q('data')} FROM ${q('Puzzles')}`,
    { type: sequelize.QueryTypes.SELECT }
  );
  await sequelize.transaction(async transaction => {
    for (const row of rows) {
      const values = listColumns(row);
      if (COLUMNS.every(c => values[c] == null)) continue;
      await sequelize.query(
        `UPDATE ${q('Puzzles')} SET ${COLUMNS.map(c => `${q(c)} = ?`).join(', ')} WHERE ${q('id')} = ?`,
        { replacements: [...COLUMNS.map(c => values[c]), row.id], transaction }
      );
    }
  });
}

module.exports = {
  async up (qi, Sequelize) {
    for (const column of COLUMNS) {
      await ensureColumn(qi, 'Puzzles', column, { type: Sequelize.INTEGER, allowNull: true });
    }
    await ensureIndex(qi, 'Puzzles', ['type', 'width']);
    await ensureIndex(qi, 'Puzzles', ['type', 'numColor']);
    await backfill(qi);
  },

  async down (qi) {
    for (const column of COLUMNS) {
      await removeColumnIfExists(qi, 'Puzzles', column);
    }
  },

  backfill
};
