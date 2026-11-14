// Moves a live database from the old per-type tables to the generic model:
//
//   Nonograms, Linelogs, Logicals         -> Puzzles (type + data JSON, legacyId)
//   NonogramRatings, LinelogRatings, ...  -> PuzzleRatings
//   Users.solvedNonograms/... (JSON)      -> PuzzleSolves
//   Comments.riddleType + riddleId        -> Comments.PuzzleId (new column)
//
// The old tables and columns are left untouched, so the previous app
// version keeps working on them and nothing is lost. Drop them by hand once
// the new version has run for a while.
//
// Usage (from the backend folder, with the production DB settings in the
// environment - not from Plesk's "Node.js-Befehle" tab, see HANDOVER.md):
//   node scripts/migrateToPuzzles.js           dry run: report what would happen
//   node scripts/migrateToPuzzles.js --apply   create the new tables and copy the data
//
// It refuses to run if the Puzzles table already has rows.

const { QueryTypes, DataTypes } = require('sequelize');
const db = require('../models');
const puzzles = require('../puzzles');
const { LEGACY, importLegacy, parseJson } = require('../utils/legacyPuzzles');

const { sequelize, Puzzle, PuzzleRating, PuzzleSolve } = db;
const qi = sequelize.getQueryInterface();

async function tableNames () {
  const tables = await qi.showAllTables();
  return new Set(tables.map(t => (typeof t === 'string' ? t : t.tableName)));
}

async function selectAll (table, existing) {
  if (!existing.has(table)) {
    return [];
  }
  return sequelize.query(`SELECT * FROM ${qi.quoteIdentifier(table)}`, { type: QueryTypes.SELECT });
}

async function readLegacy (existing) {
  const legacy = { puzzles: {}, ratings: {}, users: [], comments: [] };
  for (const type of puzzles.PUZZLE_TYPES) {
    legacy.puzzles[type] = await selectAll(LEGACY[type].table, existing);
    legacy.ratings[type] = await selectAll(LEGACY[type].ratingTable, existing);
  }
  legacy.users = await selectAll('Users', existing);
  const comments = await selectAll('Comments', existing);
  legacy.comments = comments.filter(c => c.riddleType != null && c.riddleId != null);
  return legacy;
}

function report (legacy) {
  console.log('Found in the old tables:');
  for (const type of puzzles.PUZZLE_TYPES) {
    const plugin = puzzles.getPlugin(type);
    const rows = legacy.puzzles[type];
    const problems = rows
      .map(row => {
        const data = {};
        for (const field of plugin.dataFields) data[field] = parseJson(row[field]);
        return [row.id, row.name, plugin.checkData(data)];
      })
      .filter(([, , problem]) => problem);
    console.log(`  ${type}: ${rows.length} puzzles, ${legacy.ratings[type].length} ratings`);
    // Imported anyway (nothing is dropped); listed so they can be fixed.
    for (const [id, name, problem] of problems) {
      console.log(`    ! #${id} "${name}": ${problem}`);
    }
  }
  const solveCount = legacy.users.reduce((sum, user) => sum + puzzles.PUZZLE_TYPES
    .map(type => parseJson(user[LEGACY[type].solvedField]))
    .reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0), 0);
  console.log(`  ${legacy.users.length} users with ${solveCount} solve entries`);
  console.log(`  ${legacy.comments.length} comments to link to a puzzle`);
}

async function addCommentPuzzleId () {
  const columns = await qi.describeTable('Comments');
  if (!columns.PuzzleId) {
    await qi.addColumn('Comments', 'PuzzleId', { type: DataTypes.INTEGER, allowNull: true });
  }
  try {
    await qi.addIndex('Comments', ['PuzzleId']);
  } catch (err) {
    // Already there from an earlier attempt.
  }
}

async function migrate (apply) {
  await puzzles.ready;
  const existing = await tableNames();

  if (existing.has('Puzzles') && await Puzzle.count() > 0) {
    console.error('The Puzzles table already has rows - this database was migrated before. Nothing to do.');
    return false;
  }

  const legacy = await readLegacy(existing);
  report(legacy);
  if (!apply) {
    console.log('\nDry run - nothing changed. Run with --apply to migrate.');
    return true;
  }

  // Schema changes first: on MySQL, DDL cannot be part of a transaction.
  await Puzzle.sync();
  await PuzzleRating.sync();
  await PuzzleSolve.sync();
  if (existing.has('Comments')) {
    await addCommentPuzzleId();
  }

  await sequelize.transaction(async transaction => {
    const { idFor, report: result } = await importLegacy(db, legacy, { transaction });
    let linked = 0;
    let orphaned = 0;
    for (const comment of legacy.comments) {
      const PuzzleId = idFor(comment.riddleType, comment.riddleId);
      if (!PuzzleId) {
        orphaned += 1;
        continue;
      }
      await sequelize.query(
        `UPDATE ${qi.quoteIdentifier('Comments')} SET ${qi.quoteIdentifier('PuzzleId')} = ? WHERE ${qi.quoteIdentifier('id')} = ?`,
        { replacements: [PuzzleId, comment.id], transaction }
      );
      linked += 1;
    }
    console.log('\nMigrated:', JSON.stringify({ ...result, commentsLinked: linked, commentsOrphaned: orphaned }));
  });
  return true;
}

module.exports = { migrate };

if (require.main === module) {
  migrate(process.argv.includes('--apply'))
    .then(ok => sequelize.close().then(() => process.exit(ok ? 0 : 1)))
    .catch(err => {
      console.error('Migration failed:', err);
      sequelize.close().finally(() => process.exit(1));
    });
}
