// GET /api/puzzles?page=... (server-side filters, sorting, pagination) and
// GET /api/puzzles/:id/next (audit item 14).

process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const createApp = require('../createApp');
const config = require('../config/config');
const { sequelize, Puzzle, PuzzleSolve, PuzzleRating, User } = require('../models');
const { resetDatabase } = require('../migrator');
const puzzles = require('../puzzles');
const { backfill } = require('../migrations/20261121-02-puzzle-list-columns');

const app = createApp();
const api = () => request(app);

const grid = (width, height) => Array.from({ length: height }, () => Array(width).fill(1));
const nonogram = (name, width, height, numColor, extra = {}) => ({
  type: 'nonogram',
  name,
  difficulty: 1,
  author: 'carla',
  date: new Date('2026-01-01'),
  data: { width, height, numColor, colors: ['#fff', '#000'], solution: grid(width, height) },
  ...extra
});

let p, anna, annaAuth;

before(async () => {
  await puzzles.ready;
  await resetDatabase();
  p = {};
  for (const row of [
    nonogram('Apple', 5, 5, 1, { difficulty: 1 }),
    nonogram('Banana 100%', 10, 15, 2, { difficulty: 3, author: 'Dora' }),
    nonogram('Cherry', 20, 20, 3, { difficulty: 5 }),
    nonogram('apple_pie', 30, 25, 4, { difficulty: 2 })
  ]) {
    p[row.name] = await Puzzle.create(row);
  }
  p.logic = await Puzzle.create({ type: 'logical', name: 'Logic', difficulty: 2, data: { clues: [] } });
  anna = await User.create({ username: 'anna', email: 'anna@example.com', password: 'secret123', role: 'Mitglied' });
  annaAuth = `Bearer ${jwt.sign({ id: anna.id }, config.authentication.jwtSecret)}`;
  await PuzzleSolve.create({ UserId: anna.id, PuzzleId: p.Cherry.id });
  await PuzzleRating.bulkCreate([
    { UserId: anna.id, PuzzleId: p.Apple.id, rating: 2 },
    { UserId: anna.id, PuzzleId: p.Cherry.id, rating: 5 }
  ]);
});
after(() => sequelize.close());

const list = (query, auth) => {
  const req = api().get('/api/puzzles').query({ type: 'nonogram', page: 1, ...query });
  return (auth ? req.set('Authorization', auth) : req).expect(200).then(res => res.body);
};
const names = body => body.items.map(i => i.name);

test('saving a puzzle copies size and colours into columns', async () => {
  const row = await Puzzle.findByPk(p['Banana 100%'].id, { raw: true });
  assert.deepEqual([row.width, row.height, row.numColor], [10, 15, 2]);
  const logic = await Puzzle.findByPk(p.logic.id, { raw: true });
  assert.deepEqual([logic.width, logic.height, logic.numColor], [null, null, null]);
  await p.Apple.update({ data: { ...p.Apple.data, width: 6 } });
  assert.equal((await Puzzle.findByPk(p.Apple.id, { raw: true })).width, 6);
  await p.Apple.update({ data: { ...p.Apple.data, width: 5 } });
});

test('the migration backfills rows written without the columns', async () => {
  const qi = sequelize.getQueryInterface();
  const q = name => qi.quoteIdentifier(name);
  await sequelize.query(`UPDATE ${q('Puzzles')} SET ${q('width')} = NULL, ${q('height')} = NULL, ${q('numColor')} = NULL`);
  await backfill(qi);
  const row = await Puzzle.findByPk(p.Cherry.id, { raw: true });
  assert.deepEqual([row.width, row.height, row.numColor], [20, 20, 3]);
});

test('pages come with a total and never send clues or solutions', async () => {
  const body = await list({ perPage: 3 });
  assert.equal(body.total, 4);
  assert.equal(body.items.length, 3);
  assert.equal(body.perPage, 3);
  const second = await list({ perPage: 3, page: 2 });
  assert.deepEqual(names(second), ['apple_pie']);
  const text = JSON.stringify(body);
  for (const field of ['solution', 'rowClues', 'columnClues', 'colors']) {
    assert.ok(!text.includes(`"${field}"`), `list must not send ${field}`);
  }
  assert.equal((await list({ perPage: 1000 })).perPage, 100);
});

test('the old unpaged list still works', async () => {
  const res = await api().get('/api/puzzles').query({ type: 'nonogram' }).expect(200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 4);
});

test('search by name and author, case-insensitive, wildcards literal', async () => {
  assert.deepEqual(names(await list({ q: 'APPLE' })), ['Apple', 'apple_pie']);
  assert.deepEqual(names(await list({ q: '_' })), ['apple_pie']);
  assert.deepEqual(names(await list({ q: '%' })), ['Banana 100%']);
  assert.deepEqual(names(await list({ author: 'dor' })), ['Banana 100%']);
});

test('filters by size, colours, difficulty and rating', async () => {
  assert.deepEqual(names(await list({ maxSize: 15 })), ['Apple', 'Banana 100%']);
  assert.deepEqual(names(await list({ minSize: 16, maxSize: 25 })), ['Cherry']);
  assert.deepEqual(names(await list({ minSize: 26 })), ['apple_pie']);
  assert.deepEqual(names(await list({ minColors: 3 })), ['Cherry', 'apple_pie']);
  assert.deepEqual(names(await list({ maxColors: 1 })), ['Apple']);
  assert.deepEqual(names(await list({ minDifficulty: 2, maxDifficulty: 3 })), ['Banana 100%', 'apple_pie']);
  assert.deepEqual(names(await list({ minRating: 4 })), ['Cherry']);
  assert.deepEqual(names(await list({ minSize: 'abc' })).length, 4, 'malformed values are ignored');
});

test('sorts by column, rating and solved state', async () => {
  assert.deepEqual(names(await list({ sort: 'width', order: 'desc' })), ['apple_pie', 'Cherry', 'Banana 100%', 'Apple']);
  const byRating = names(await list({ sort: 'avgRating', order: 'desc' }));
  assert.deepEqual(byRating.slice(0, 2), ['Cherry', 'Apple']);
  const bySolved = await list({ sort: 'solved', order: 'desc' }, annaAuth);
  assert.equal(bySolved.items[0].name, 'Cherry');
  assert.equal(bySolved.items[0].solved, true);
  assert.equal(bySolved.items[1].solved, false);
  assert.equal(bySolved.items[0].avgRating, 5);
});

test('solved / unsolved only for logged-in players', async () => {
  assert.deepEqual(names(await list({ status: 'solved' }, annaAuth)), ['Cherry']);
  assert.deepEqual(names(await list({ status: 'unsolved' }, annaAuth)), ['Apple', 'Banana 100%', 'apple_pie']);
  assert.equal((await list({ status: 'unsolved' })).total, 4, 'ignored for guests');
  assert.equal((await list({ status: 'unsolved' }, 'Bearer nonsense')).total, 4, 'a bad token counts as guest');
});

test('next unsolved puzzle skips solved ones and wraps around', async () => {
  const next = async (puzzle, auth) => {
    const req = api().get(`/api/puzzles/${puzzle.id}/next`);
    return (await (auth ? req.set('Authorization', auth) : req).expect(200)).body.id;
  };
  assert.equal(await next(p['Banana 100%']), p.Cherry.id, 'guests: simply the next one');
  assert.equal(await next(p['Banana 100%'], annaAuth), p.apple_pie.id, 'Cherry is solved');
  assert.equal(await next(p.apple_pie, annaAuth), p.Apple.id, 'wraps around');
  assert.equal(await next(p.logic), null, 'no other puzzle of that type');
  await api().get('/api/puzzles/99999/next').expect(404);
});
