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
