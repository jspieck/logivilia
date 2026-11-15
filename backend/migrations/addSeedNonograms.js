// Shared code for migrations that add new seed nonograms to an existing
// database. Not a migration itself: the migrator only loads files that
// start with a date.
//
// The puzzles come from seed/nonograms.json, looked up by name. A fresh
// database (no puzzles yet) is left alone, because the seed imports the whole
// file right after the migrations and would otherwise add them twice. A
// nonogram that already exists with the same name is skipped, so running a
// migration again changes nothing. New puzzles belong to the first Admin.

const seedNonograms = require('../seed/nonograms.json');
const { toPuzzleRow } = require('../utils/legacyPuzzles');

function seedRows (names) {
  return names.map(name => {
    const matches = seedNonograms.filter(p => p.name === name);
    if (matches.length !== 1) {
      throw new Error(`seed/nonograms.json has ${matches.length} nonograms named "${name}", expected 1`);
    }
    return matches[0];
  });
}

async function addSeedNonograms (qi, names) {
  const rows = seedRows(names);
  const { sequelize } = qi;
  const q = name => qi.quoteIdentifier(name);
  const select = (sql, replacements = []) =>
    sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

  const [{ count }] = await select(`SELECT COUNT(*) AS ${q('count')} FROM ${q('Puzzles')}`);
  if (Number(count) === 0) {
    return 0;
  }
  const existing = new Set((await select(
    `SELECT ${q('name')} FROM ${q('Puzzles')} WHERE ${q('type')} = 'nonogram' AND ${q('name')} IN (?)`, [names]
  )).map(row => row.name));
  // Very old databases have no role column; then the puzzles get no owner.
  const userColumns = await qi.describeTable('Users');
  const [admin] = userColumns.role
    ? await select(`SELECT ${q('id')} FROM ${q('Users')} WHERE ${q('role')} = 'Admin' ORDER BY ${q('id')} LIMIT 1`)
    : [];

  const now = new Date();
  const inserts = rows.filter(row => !existing.has(row.name)).map(row => {
    const puzzle = toPuzzleRow('nonogram', row, null);
    return {
      ...puzzle,
      data: JSON.stringify(puzzle.data),
      date: row.date ? new Date(row.date) : now,
      UserId: admin ? admin.id : null,
      createdAt: now,
      updatedAt: now
    };
  });
  if (inserts.length) {
    await qi.bulkInsert('Puzzles', inserts);
  }
  return inserts.length;
}

// Removes the added puzzles again, but only ones nobody has solved, rated or
// commented on yet (those stay, so no player data is lost).
async function removeSeedNonograms (qi, names) {
  const { sequelize } = qi;
  const q = name => qi.quoteIdentifier(name);
  const unused = table => `${q('id')} NOT IN (SELECT ${q('PuzzleId')} FROM ${q(table)} WHERE ${q('PuzzleId')} IS NOT NULL)`;
  await sequelize.query(
    `DELETE FROM ${q('Puzzles')} WHERE ${q('type')} = 'nonogram' AND ${q('legacyId')} IS NULL AND ${q('name')} IN (?)` +
    ` AND ${unused('PuzzleSolves')} AND ${unused('PuzzleRatings')} AND ${unused('Comments')}`,
    { replacements: [names] }
  );
}

module.exports = { addSeedNonograms, removeSeedNonograms, seedRows };
