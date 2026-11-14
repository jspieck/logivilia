// Runs scripts/migrateToPuzzles.js against an in-memory database in the old
// schema (per-type tables, solved* arrays on Users, riddleType/riddleId on
// Comments) and checks that everything arrives in the generic tables.

process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { DataTypes } = require('sequelize');

const db = require('../models');
const { migrate } = require('../scripts/migrateToPuzzles');
const seedNonograms = require('../seed/nonograms.json');
const seedLinelogs = require('../seed/linelogs.json');
const seedLogicals = require('../seed/logicals.json');

const { sequelize, Puzzle, PuzzleRating, PuzzleSolve, Comment, User } = db;

// The old tables, defined as they were before the generic model.
function defineLegacy () {
  const define = (name, attributes) => sequelize.define(name, attributes, { tableName: name + 's' });
  const grid = { width: DataTypes.INTEGER, height: DataTypes.INTEGER, numColor: DataTypes.INTEGER, colors: DataTypes.JSON, solution: DataTypes.JSON };
  const common = { name: DataTypes.STRING, difficulty: DataTypes.INTEGER, date: DataTypes.DATE, UserId: DataTypes.INTEGER };
  return {
    users: sequelize.define('LegacyUser', {
      username: DataTypes.STRING,
      solvedNonograms: DataTypes.JSON,
      solvedLinelogs: DataTypes.JSON,
      solvedLogicals: DataTypes.JSON
    }, { tableName: 'Users' }),
    comments: sequelize.define('LegacyComment', {
      riddleType: DataTypes.STRING,
      riddleId: DataTypes.INTEGER,
      replyId: DataTypes.INTEGER,
      text: DataTypes.TEXT,
      date: DataTypes.DATE,
      UserId: DataTypes.INTEGER
    }, { tableName: 'Comments' }),
    nonogram: define('Nonogram', { ...common, ...grid, author: DataTypes.STRING }),
    linelog: define('Linelog', { ...common, ...grid, information: DataTypes.JSON }),
    logical: define('Logical', {
      ...common, description: DataTypes.TEXT, question: DataTypes.TEXT, clues: DataTypes.JSON,
      attributes: DataTypes.JSON, solution: DataTypes.JSON, image: DataTypes.STRING, author: DataTypes.STRING
    }),
    ratings: {
      nonogram: define('NonogramRating', { rating: DataTypes.INTEGER, UserId: DataTypes.INTEGER, NonogramId: DataTypes.INTEGER }),
      linelog: define('LinelogRating', { rating: DataTypes.INTEGER, UserId: DataTypes.INTEGER, LinelogId: DataTypes.INTEGER }),
      logical: define('LogicalRating', { rating: DataTypes.INTEGER, UserId: DataTypes.INTEGER, LogicalId: DataTypes.INTEGER })
    }
  };
}

const strip = ({ id, userId, Multi, ...rest }) => rest;
let legacy, oldIds;

before(async () => {
  legacy = defineLegacy();
  const models = [legacy.users, legacy.comments, legacy.nonogram, legacy.linelog, legacy.logical,
    ...Object.values(legacy.ratings)];
  for (const model of models) {
    await model.sync({ force: true });
  }

  // Old IDs that clash across types on purpose: each type has IDs 1 and 2.
  oldIds = {};
  for (const [type, rows] of [['nonogram', seedNonograms], ['linelog', seedLinelogs], ['logical', seedLogicals]]) {
    const created = [];
    for (const row of rows.slice(0, 2)) {
      created.push((await legacy[type].create(strip(row))).id);
    }
    oldIds[type] = created;
  }
  await legacy.users.bulkCreate([
    { username: 'ann', solvedNonograms: [2], solvedLinelogs: [1, 1, 99], solvedLogicals: [] },
    { username: 'ben', solvedNonograms: [1, 2], solvedLinelogs: null, solvedLogicals: [2] }
  ]);
  await legacy.ratings.nonogram.bulkCreate([
    { UserId: 1, NonogramId: 2, rating: 4 },
    { UserId: 1, NonogramId: 2, rating: 5 }, // duplicate: last one wins
    { UserId: 2, NonogramId: 1, rating: 9 } // invalid: skipped
  ]);
  await legacy.ratings.logical.bulkCreate([{ UserId: 2, LogicalId: 1, rating: 3 }]);
  await legacy.comments.bulkCreate([
    { riddleType: 'linelog', riddleId: 2, replyId: -1, text: 'a', UserId: 1 },
    { riddleType: 'nonogram', riddleId: 2, replyId: -1, text: 'b', UserId: 2 },
    { riddleType: 'linelog', riddleId: 42, replyId: -1, text: 'orphan', UserId: 2 }
  ]);
});

after(() => sequelize.close());

test('a dry run changes nothing', async () => {
  assert.equal(await migrate(false), true);
  const tables = (await sequelize.getQueryInterface().showAllTables()).map(String);
  assert.equal(tables.includes('Puzzles'), false);
});

test('--apply copies puzzles, ratings, solves and comment links', async () => {
  assert.equal(await migrate(true), true);

  const puzzles = await Puzzle.findAll({ order: [['id', 'ASC']] });
  assert.equal(puzzles.length, 6);
  const idOf = (type, legacyId) => puzzles.find(p => p.type === type && p.legacyId === legacyId).id;

  const nonogram = puzzles.find(p => p.type === 'nonogram' && p.legacyId === 1);
  assert.equal(nonogram.name, seedNonograms[0].name);
  assert.deepEqual(nonogram.data.colors, seedNonograms[0].colors);
  assert.deepEqual(nonogram.data.solution, seedNonograms[0].solution);
  const logical = puzzles.find(p => p.type === 'logical' && p.legacyId === 2);
  assert.deepEqual(logical.data.clues, seedLogicals[1].clues);

  const ratings = await PuzzleRating.findAll({ raw: true });
  assert.deepEqual(
    ratings.map(r => [r.UserId, r.PuzzleId, r.rating]).sort(),
    [[1, idOf('nonogram', 2), 5], [2, idOf('logical', 1), 3]].sort()
  );

  const solves = await PuzzleSolve.findAll({ raw: true });
  assert.deepEqual(
    solves.map(s => [s.UserId, s.PuzzleId]).sort(),
    [
      [1, idOf('nonogram', 2)], [1, idOf('linelog', 1)],
      [2, idOf('nonogram', 1)], [2, idOf('nonogram', 2)], [2, idOf('logical', 2)]
    ].sort()
  );

  const comments = await Comment.findAll({ order: [['id', 'ASC']], raw: true });
  assert.deepEqual(comments.map(c => c.PuzzleId), [idOf('linelog', 2), idOf('nonogram', 2), null]);

  // The new User model still reads the old Users table.
  assert.equal(await User.count(), 2);
});

test('running it again refuses to touch a migrated database', async () => {
  assert.equal(await migrate(true), false);
  assert.equal(await Puzzle.count(), 6);
});
