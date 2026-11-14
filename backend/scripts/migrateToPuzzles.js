// Moving a database from the old per-type tables to the generic model:
//
//   Nonograms, Linelogs, Logicals         -> Puzzles (type + data JSON, legacyId)
//   NonogramRatings, LinelogRatings, ...  -> PuzzleRatings
//   Users.solvedNonograms/... (JSON)      -> PuzzleSolves
//   Comments.riddleType + riddleId        -> Comments.PuzzleId
//
// The copy itself is migration 20261114-02-copy-legacy-puzzles, so it runs
// with every other pending migration (`npm run migrate -w backend`, or when
// the server starts). It does nothing on a database without old tables or
// whose Puzzles table already has rows. The old tables and columns are left
// untouched; scripts/dropLegacy.js removes them once they are no longer needed.
//
// This script previews the copy:
//   node scripts/migrateToPuzzles.js           dry run: report what would be copied
//   node scripts/migrateToPuzzles.js --apply   apply all pending migrations

const { QueryTypes } = require('sequelize');
const db = require('../models');
const puzzles = require('../puzzles');
const { LEGACY, importLegacy, parseJson } = require('../utils/legacyPuzzles');
const { tableExists } = require('../migrations/helpers');

const { sequelize } = db;
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

const hasLegacyTables = existing => puzzles.PUZZLE_TYPES.some(type => existing.has(LEGACY[type].table));

async function puzzlesAlreadyCopied (existing) {
  if (!existing.has('Puzzles')) {
    return false;
  }
  const [{ n }] = await sequelize.query(`SELECT COUNT(*) AS n FROM ${qi.quoteIdentifier('Puzzles')}`, { type: QueryTypes.SELECT });
  return Number(n) > 0;
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

/**
 * Copies the old tables into the generic ones, in one transaction. Called by
 * the migration after the baseline has created the tables. Returns null when
 * there is nothing to copy.
 */
async function copyLegacy ({ log = console.log } = {}) {
  await puzzles.ready;
  const existing = await tableNames();
  if (!hasLegacyTables(existing) || await puzzlesAlreadyCopied(existing)) {
    return null;
  }
  if (!await tableExists(qi, 'Puzzles')) {
    throw new Error('Puzzles table missing - run the baseline migration first.');
  }
  const legacy = await readLegacy(existing);
  return sequelize.transaction(async transaction => {
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
    const summary = { ...result, commentsLinked: linked, commentsOrphaned: orphaned };
    log('Copied old puzzle tables:', JSON.stringify(summary));
    return summary;
  });
}

/** Dry run (apply = false) or apply all pending migrations (apply = true). */
async function migrate (apply) {
  await puzzles.ready;
  if (apply) {
    const { runMigrations } = require('../migrator');
    await runMigrations();
    return true;
  }
  const existing = await tableNames();
  if (await puzzlesAlreadyCopied(existing)) {
    console.log('The Puzzles table already has rows - nothing would be copied.');
    return true;
  }
  if (!hasLegacyTables(existing)) {
    console.log('No old puzzle tables found - nothing would be copied.');
    return true;
  }
  report(await readLegacy(existing));
  console.log('\nDry run - nothing changed. Run with --apply (or `npm run migrate -w backend`) to migrate.');
  return true;
}

module.exports = { migrate, copyLegacy };

if (require.main === module) {
  migrate(process.argv.includes('--apply'))
    .then(ok => sequelize.close().then(() => process.exit(ok ? 0 : 1)))
    .catch(err => {
      console.error('Migration failed:', err);
      sequelize.close().finally(() => process.exit(1));
    });
}
