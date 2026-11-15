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
