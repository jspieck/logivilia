// The schema comes only from migrations/ (no sync()). On an empty database
// the migrations must create every table and column the models use, with
// the unique indexes the code relies on.

process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { sequelize } = require('../models');
const { resetDatabase, pendingMigrations, runMigrations } = require('../migrator');

const qi = sequelize.getQueryInterface();

before(() => resetDatabase());
after(() => sequelize.close());

test('nothing is pending after a reset, and running again applies nothing', async () => {
  assert.deepEqual(await pendingMigrations(), []);
  assert.deepEqual(await runMigrations({ logger: undefined }), []);
});

test('every model column exists in the migrated schema', async () => {
  for (const model of Object.values(sequelize.models)) {
    if (model.name === 'SequelizeMeta') continue;
    const columns = await qi.describeTable(model.getTableName());
    for (const attribute of Object.values(model.rawAttributes)) {
      assert.ok(columns[attribute.field], `${model.getTableName()}.${attribute.field} is missing`);
    }
  }
});

test('one solve and one rating per user and puzzle', async () => {
  for (const table of ['PuzzleSolves', 'PuzzleRatings']) {
    const indexes = await qi.showIndex(table);
    const unique = indexes.find(index => index.unique &&
      index.fields.map(f => f.attribute).join(',') === 'UserId,PuzzleId');
    assert.ok(unique, `${table} needs a unique index on (UserId, PuzzleId)`);
  }
});

test('logic puzzle images move from logiklab.de to /images/logicals', async () => {
  const migration = require('../migrations/20261115-01-local-logical-images');
  const now = new Date();
  const insert = (type, image) => qi.bulkInsert('Puzzles', [{
    type, name: `img-${type}`, data: JSON.stringify({ image, keep: 1 }), createdAt: now, updatedAt: now
  }]);
  await insert('logical', 'https://logiklab.de/wp-content/uploads/2014/06/buecher-640x372.jpg');
  await insert('logical', 'https://cdn.pixabay.com/photo/x.jpg');
  await insert('nonogram', 'http://www.logiklab.de/wp-content/uploads/2014/06/a.jpg');

  await migration.up(qi);
  await migration.up(qi); // idempotent

  const rows = await sequelize.query("SELECT type, data FROM Puzzles WHERE name LIKE 'img-%' ORDER BY id",
    { type: sequelize.QueryTypes.SELECT });
  const images = rows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data).image);
  assert.deepEqual(images, [
    '/images/logicals/2014/06/buecher-640x372.jpg',
    'https://cdn.pixabay.com/photo/x.jpg',
    'http://www.logiklab.de/wp-content/uploads/2014/06/a.jpg'
  ]);
  assert.equal((typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data).keep, 1);
  await qi.bulkDelete('Puzzles', { name: ['img-logical', 'img-nonogram'] });
});

test('every seed logic puzzle image ships with the frontend', () => {
  const fs = require('fs');
  const path = require('path');
  for (const file of ['logicals.json', 'logicalsComplete.json']) {
    const text = fs.readFileSync(path.join(__dirname, '../seed', file), 'utf8');
    assert.ok(!text.includes('logiklab.de'), `${file} still links to logiklab.de`);
    for (const [, rel] of text.matchAll(/"\/images\/logicals\/([^"]+)"/g)) {
      const local = path.join(__dirname, '../../frontend/public/images/logicals', rel);
      assert.ok(fs.existsSync(local), `missing ${local}`);
    }
  }
});

test('the four ambiguous nonograms get their one-cell fix, other rows stay', async () => {
  const migration = require('../migrations/20261115-02-unique-nonograms');
  const seed = require('../seed/nonograms.json');
  await require('../puzzles').ready;
  const now = new Date();
  // The seed is already fixed; undo the fix to get the live (old) data.
  const before = migration.FIXES.map(fix => {
    const data = seed.find(n => n.name === fix.name);
    return migration.applyFix(fix, data, { from: fix.to, to: fix.from, checkUnique: false });
  });
  const rows = before.map(data => ({
    type: 'nonogram', name: data.name, data: JSON.stringify(data), createdAt: now, updatedAt: now
  }));
  // Same name, different picture: must not be touched.
  const other = { ...before[0], solution: before[0].solution.map(row => row.map(() => 1)) };
  rows.push({ type: 'nonogram', name: 'Bobby', data: JSON.stringify(other), createdAt: now, updatedAt: now });
  await qi.bulkInsert('Puzzles', rows);

  await migration.up(qi);
  await migration.up(qi); // idempotent

  const names = migration.FIXES.map(f => f.name);
  const parse = r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
  const stored = await sequelize.query(
    `SELECT name, data FROM Puzzles WHERE type = 'nonogram' AND name IN (${names.map(() => '?').join(',')}) ORDER BY id`,
    { replacements: names, type: sequelize.QueryTypes.SELECT });
  const data = stored.map(parse);
  migration.FIXES.forEach((fix, i) => {
    assert.deepEqual(data[i].solution, seed.find(n => n.name === fix.name).solution, fix.name);
  });
  assert.deepEqual(data[4].solution, other.solution);

  await migration.down(qi);
  const reverted = await sequelize.query("SELECT data FROM Puzzles WHERE name = 'Drache'",
    { type: sequelize.QueryTypes.SELECT });
  assert.deepEqual(parse(reverted[0]).solution, before[3].solution);
  await qi.bulkDelete('Puzzles', { name: names });
});

test('the two ambiguous linelogs get their path split, other rows stay', async () => {
  const migration = require('../migrations/20261115-04-unique-linelogs');
  const seed = require('../seed/linelogs.json');
  await require('../puzzles').ready;
  const now = new Date();
  // The seed is already fixed; undo the fix to get the live (old) data.
  const before = migration.FIXES.map(fix =>
    migration.applyFix(fix, seed.find(l => l.name === fix.name), { reverse: true }));
  const rows = before.map(data => ({
    type: 'linelog', name: data.name, data: JSON.stringify(data), createdAt: now, updatedAt: now
  }));
  // Same name, other numbers: must not be touched.
  const other = { ...before[0], information: before[0].information.map(row => row.map(() => 0)) };
  rows.push({ type: 'linelog', name: 'Kasette', data: JSON.stringify(other), createdAt: now, updatedAt: now });
  await qi.bulkInsert('Puzzles', rows);

  await migration.up(qi);
  await migration.up(qi); // idempotent

  const names = migration.FIXES.map(f => f.name);
  const parse = r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
  const stored = (await sequelize.query(
    `SELECT name, data FROM Puzzles WHERE type = 'linelog' AND name IN (${names.map(() => '?').join(',')}) ORDER BY id`,
    { replacements: names, type: sequelize.QueryTypes.SELECT })).map(parse);
  migration.FIXES.forEach((fix, i) => {
    const expected = seed.find(l => l.name === fix.name).information.map(row => row.map(Number));
    assert.deepEqual(stored[i].information, expected, fix.name);
  });
  assert.deepEqual(stored[2].information, other.information);

  await migration.down(qi);
  const reverted = await sequelize.query("SELECT data FROM Puzzles WHERE type = 'linelog' AND name = 'Leuchten'",
    { type: sequelize.QueryTypes.SELECT });
  assert.deepEqual(parse(reverted[0]).information, before[1].information.map(row => row.map(Number)));
  await qi.bulkDelete('Puzzles', { name: names });
});

test('new seed nonograms are added to an existing database once, owned by the Admin', async () => {
  const migration = require('../migrations/20261115-03-new-nonograms');
  const { User } = require('../models');
  const count = async () => (await sequelize.query(
    `SELECT COUNT(*) AS n FROM Puzzles WHERE type = 'nonogram' AND name IN (${migration.NAMES.map(() => '?').join(',')})`,
    { replacements: migration.NAMES, type: sequelize.QueryTypes.SELECT }))[0].n;

  // Fresh database (what the seed and the tests start from): nothing added.
  await migration.up(qi);
  assert.equal(Number(await count()), 0);

  // Existing database: one old puzzle, a normal user and an Admin.
  const now = new Date();
  await qi.bulkInsert('Puzzles', [{ type: 'nonogram', name: 'old-one', data: '{}', createdAt: now, updatedAt: now }]);
  await User.create({ username: 'player', email: 'p@example.test', password: 'secret123A', role: 'User', emailVerified: true });
  const admin = await User.create({ username: 'boss', email: 'b@example.test', password: 'secret123A', role: 'Admin', emailVerified: true });

  await migration.up(qi);
  await migration.up(qi); // idempotent
  assert.equal(Number(await count()), migration.NAMES.length);
  const [row] = await sequelize.query("SELECT UserId, legacyId, data FROM Puzzles WHERE name = 'Halloween'",
    { type: sequelize.QueryTypes.SELECT });
  assert.equal(row.UserId, admin.id);
  assert.equal(row.legacyId, null);
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  assert.equal(data.width, 15);
  assert.ok(Array.isArray(data.solution));

  await migration.down(qi);
  assert.equal(Number(await count()), 0);
  await qi.bulkDelete('Puzzles', { name: 'old-one' });
  await User.destroy({ where: { id: [admin.id] } });
  await User.destroy({ where: { username: 'player' } });
});

test('seed logic puzzles get their formal rules once, edited ones stay', async () => {
  const migration = require('../migrations/20261116-01-logical-rules');
  const logicals = require('../seed/logicals.json');
  const now = new Date();
  const seed = name => {
    const { name: _n, difficulty, date, UserId, ...data } = logicals.find(l => l.name === name);
    return data;
  };
  const edited = seed('Masternix');
  edited.clues = [...edited.clues, 'Ein neuer Hinweis, den es im Seed nicht gibt.'];
  const rows = [
    ['Kongress der Wissenschaft', seed('Kongress der Wissenschaft')],
    ['Masternix', edited], // clue count differs: left alone
    ['Asiatische Lektüre', seed('Asiatische Lektüre')] // data error: no rules
  ];
  await qi.bulkInsert('Puzzles', rows.map(([name, data]) => ({
    type: 'logical', name, data: JSON.stringify(data), createdAt: now, updatedAt: now
  })));
  const read = async () => (await sequelize.query(
    `SELECT name, data FROM Puzzles WHERE type = 'logical' AND name IN ('Kongress der Wissenschaft', 'Masternix', 'Asiatische Lektüre') ORDER BY id`,
    { type: sequelize.QueryTypes.SELECT })).map(r => ({ name: r.name, data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data }));

  await migration.up(qi);
  await migration.up(qi); // idempotent
  let [kongress, masternix, lektuere] = await read();
  assert.equal(kongress.data.rules.length, 4);
  assert.equal(kongress.data.attributes[2].ordered, 'numeric');
  assert.equal(masternix.data.rules, undefined);
  assert.equal(lektuere.data.rules, undefined);

  await migration.down(qi);
  [kongress] = await read();
  assert.equal(kongress.data.rules, undefined);
  assert.equal(kongress.data.attributes[2].ordered, undefined);
  await qi.bulkDelete('Puzzles', { name: rows.map(([name]) => name) });
});
