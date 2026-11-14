// Removes what the generic puzzle model no longer reads (audit B4):
//   tables   Nonograms, Linelogs, Logicals, their *Ratings tables and the
//            never-used UserSolved* join tables
//   columns  Users.solved* / created* (JSON arrays), Comments.riddleType / riddleId
//
// Not a migration on purpose: the old tables are the way back to the
// previous app version, so drop them only after the new one has run for a
// while, and after a backup.
//
//   node scripts/dropLegacy.js           dry run: list what would be removed
//   node scripts/dropLegacy.js --apply   remove it
//
// Refuses while the Puzzles table is empty (the copy has not happened).

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const { tableExists, removeColumnIfExists } = require('../migrations/helpers');

const qi = sequelize.getQueryInterface();

// Children before parents, because of foreign keys.
const TABLES = [
  'UserSolvedNonograms', 'UserSolvedLinelogs', 'UserSolvedLogicals',
  'NonogramRatings', 'LinelogRatings', 'LogicalRatings',
  'Nonograms', 'Linelogs', 'Logicals'
];
const COLUMNS = {
  Users: ['solvedLogicals', 'solvedNonograms', 'solvedLinelogs', 'createdLogicals', 'createdNonograms', 'createdLinelogs'],
  Comments: ['riddleType', 'riddleId']
};

async function plan () {
  const tables = [];
  for (const table of TABLES) {
    if (await tableExists(qi, table)) tables.push(table);
  }
  const columns = [];
  for (const [table, names] of Object.entries(COLUMNS)) {
    if (!await tableExists(qi, table)) continue;
    const existing = await qi.describeTable(table);
    for (const column of names) {
      if (existing[column]) columns.push([table, column]);
    }
  }
  return { tables, columns };
}

async function dropLegacy (apply) {
  if (!await tableExists(qi, 'Puzzles')) {
    console.error('No Puzzles table - run the migrations first (npm run migrate).');
    return false;
  }
  const [{ n }] = await sequelize.query(`SELECT COUNT(*) AS n FROM ${qi.quoteIdentifier('Puzzles')}`, { type: QueryTypes.SELECT });
  if (Number(n) === 0) {
    console.error('The Puzzles table is empty - the old data has not been copied yet. Nothing removed.');
    return false;
  }

  const { tables, columns } = await plan();
  if (!tables.length && !columns.length) {
    console.log('Nothing left to remove.');
    return true;
  }
  for (const table of tables) console.log(`${apply ? 'Dropping' : 'Would drop'} table ${table}`);
  for (const [table, column] of columns) console.log(`${apply ? 'Removing' : 'Would remove'} column ${table}.${column}`);
  if (!apply) {
    console.log('\nDry run - nothing changed. Back up the database, then run with --apply.');
    return true;
  }

  for (const table of tables) {
    await qi.dropTable(table);
  }
  for (const [table, column] of columns) {
    await removeColumnIfExists(qi, table, column);
  }
  console.log('Done.');
  return true;
}

module.exports = { dropLegacy };

if (require.main === module) {
  dropLegacy(process.argv.includes('--apply'))
    .then(ok => sequelize.close().then(() => process.exit(ok ? 0 : 1)))
    .catch(err => {
      console.error('Failed:', err);
      sequelize.close().finally(() => process.exit(1));
    });
}
