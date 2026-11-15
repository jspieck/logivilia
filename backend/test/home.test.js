// GET /api/home: start page summaries, never clues or solutions.

process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const createApp = require('../createApp');
const { sequelize, Puzzle, PuzzleSolve, PuzzleRating, User } = require('../models');
const { resetDatabase } = require('../migrator');
const puzzles = require('../puzzles');
const { toPuzzleRow } = require('../utils/legacyPuzzles');
const { pickDaily } = require('../controllers/HomeController');
const seed = {
  nonogram: require('../seed/nonograms.json'),
  linelog: require('../seed/linelogs.json'),
  logical: require('../seed/logicals.json')
};

const app = createApp();

before(async () => {
  await puzzles.ready;
  await resetDatabase();
  for (const [type, rows] of Object.entries(seed)) {
    for (const [i, row] of rows.slice(0, 3).entries()) {
      await Puzzle.create({ ...toPuzzleRow(type, row, i + 1), UserId: null });
    }
  }
});
after(() => sequelize.close());

test('home sends counts, a puzzle of the day and summaries without solutions', async () => {
  const res = await request(app).get('/api/home').expect(200);
  assert.deepEqual(res.body.counts, { nonogram: 3, linelog: 3, logical: 3 });
  assert.ok(res.body.daily, 'puzzle of the day');
  assert.match(res.body.daily.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(res.body.daily.solvedLast24h, 0);
  assert.ok(Array.isArray(res.body.popular));
  assert.deepEqual(res.body.topPlayers, []);
  const text = JSON.stringify(res.body);
  for (const field of ['solution', 'rowClues', 'columnClues', 'clues']) {
    assert.ok(!text.includes(`"${field}"`), `home must not send ${field}`);
  }
});

test('popular puzzles and top players come from solves and ratings', async () => {
  const [a, b] = await Promise.all(['anna', 'ben'].map(name =>
    User.create({ username: name, email: `${name}@example.com`, password: 'secret123', role: 'Mitglied' })));
  const [p1, p2, p3] = await Puzzle.findAll({ order: [['id', 'ASC']], limit: 3 });
  await PuzzleSolve.bulkCreate([
    { UserId: a.id, PuzzleId: p2.id }, { UserId: b.id, PuzzleId: p2.id }, { UserId: a.id, PuzzleId: p1.id }
  ]);
  await PuzzleRating.create({ UserId: b.id, PuzzleId: p3.id, rating: 5 });

  const res = await request(app).get('/api/home').expect(200);
  assert.deepEqual(res.body.popular.map(p => p.id), [p2.id, p1.id, p3.id]);
  assert.deepEqual(res.body.topPlayers.map(p => [p.username, p.solvedCount]), [['anna', 2], ['ben', 1]]);
  assert.ok(!('email' in res.body.topPlayers[0]));
});

test('the puzzle of the day is stable for a date and the type rotates daily', () => {
  const list = [
    { id: 1, type: 'nonogram', difficulty: 1 },
    { id: 2, type: 'nonogram', difficulty: 5 },
    { id: 3, type: 'linelog', difficulty: 2 },
    { id: 4, type: 'logical', difficulty: 1 }
  ];
  assert.equal(pickDaily(list, '2026-11-15'), pickDaily([...list].reverse(), '2026-11-15'));
  const types = ['2026-11-15', '2026-11-16', '2026-11-17'].map(day => pickDaily(list, day).type);
  assert.equal(new Set(types).size, 3);
  // Too hard for the daily pick.
  assert.ok(!['2026-11-15', '2026-11-18', '2026-11-21'].some(day => pickDaily(list, day).id === 2));
  // A type without puzzles falls through to the next one.
  assert.ok(pickDaily([{ id: 9, type: 'logical', difficulty: 1 }], '2026-11-15'));
});
