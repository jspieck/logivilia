// API tests against an in-memory SQLite database (config "test").
// They cover the security fixes from 2026-11-08: no secrets in responses,
// ownership checks, server-side solution checks, input validation and rate
// limits.

process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const createApp = require('../createApp');
const { sequelize, Puzzle } = require('../models');
const puzzles = require('../puzzles');
const { toPuzzleRow } = require('../utils/legacyPuzzles');
const { testOutbox } = require('../controllers/AuthenticationController');
const { cropSolution } = require('../scripts/fixNonogramSizes');
const seedNonograms = require('../seed/nonograms.json');
const seedLinelogs = require('../seed/linelogs.json');
const seedLogicals = require('../seed/logicals.json');

const app = createApp();
const api = () => request(app);

const PASSWORD = 'secret123';
const SENSITIVE_FIELDS = ['password', 'resetPasswordToken', 'resetPasswordExpires'];

function assertNoSecrets (user) {
  for (const field of SENSITIVE_FIELDS) {
    assert.equal(field in user, false, `response contains ${field}`);
  }
}

async function register (name) {
  const res = await api().post('/api/register').send({
    username: name,
    email: `${name}@example.com`,
    password: PASSWORD
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { ...res.body, auth: `Bearer ${res.body.token}` };
}

// A seed puzzle (old per-type shape) as a Puzzles row, with old ID 7.
const createPuzzle = (type, row) => Puzzle.create({ ...toPuzzleRow(type, row, 7), UserId: null });

// A small valid nonogram as a creator would send it.
const newNonogram = (extra = {}) => ({
  type: 'nonogram', name: 'Tiny', difficulty: 1,
  width: 2, height: 1, numColor: 1, colors: ['#ffffff', '#000000'], solution: [[1, 0]],
  ...extra
});

let alice, bob, nonogram, linelog, logical;

before(async () => {
  await puzzles.ready;
  await sequelize.sync({ force: true });
  nonogram = await createPuzzle('nonogram', seedNonograms[0]);
  linelog = await createPuzzle('linelog', seedLinelogs[0]);
  logical = await createPuzzle('logical', seedLogicals[0]);
  alice = await register('alice');
  bob = await register('bob');
});

after(() => sequelize.close());

describe('basics', () => {
  test('health check', async () => {
    const res = await api().get('/api/');
    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Backend API is running');
  });

  test('security headers are set and X-Powered-By is hidden', async () => {
    const res = await api().get('/api/');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['strict-transport-security']);
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  test('unknown puzzle gives 404 with an error code', async () => {
    const res = await api().get('/api/puzzles/999999');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { code: 'PUZZLE_NOT_FOUND' });
  });
});

describe('authentication', () => {
  test('register returns the user without secrets and a token with only the id', () => {
    assertNoSecrets(alice.user);
    const payload = jwt.decode(alice.token);
    assert.equal(payload.id, alice.user.id);
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'id']);
  });

  test('register ignores a role sent by the client', async () => {
    const res = await api().post('/api/register').send({
      username: 'mallory', email: 'mallory@example.com', password: PASSWORD, role: 'Admin'
    });
    // Joi rejects unknown fields, so the request fails instead of creating an admin.
    assert.equal(res.status, 400);
  });

  test('weak password is rejected', async () => {
    const res = await api().post('/api/register').send({
      username: 'weakling', email: 'weak@example.com', password: 'onlyletters'
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_PASSWORD');
  });

  test('login with the right password works and leaks nothing', async () => {
    const res = await api().post('/api/login').send({ email: 'alice@example.com', password: PASSWORD });
    assert.equal(res.status, 200);
    assertNoSecrets(res.body.user);
    assert.ok(res.body.token);
  });

  test('login with a wrong password fails', async () => {
    const res = await api().post('/api/login').send({ email: 'alice@example.com', password: 'wrong1234' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_INVALID_CREDENTIALS');
  });

  test('a forged token is rejected', async () => {
    const forged = jwt.sign({ id: alice.user.id }, 'secret');
    const res = await api().post('/api/puzzles').set('Authorization', `Bearer ${forged}`).send(newNonogram());
    assert.equal(res.status, 403);
  });

  test('public profile hides e-mail and secrets', async () => {
    const res = await api().get(`/api/users/${alice.user.id}`);
    assert.equal(res.status, 200);
    assertNoSecrets(res.body);
    assert.equal('email' in res.body, false);
  });
});

describe('password reset', () => {
  test('forgot gives the same answer for known and unknown e-mails', async () => {
    const known = await api().post('/api/forgot').send({ email: 'bob@example.com' });
    const unknown = await api().post('/api/forgot').send({ email: 'nobody@example.com' });
    assert.equal(known.status, 200);
    assert.deepEqual(known.body, unknown.body);
  });

  test('the e-mailed link resets the password once', async () => {
    const mail = testOutbox.findLast(m => m.to === 'bob@example.com');
    assert.ok(mail, 'no reset e-mail was sent');
    const token = mail.text.match(/\/reset\/([a-f0-9]+)/)[1];

    const res = await api().post(`/api/reset/${token}`).send({ password: 'newpass123' });
    assert.equal(res.status, 200);
    assertNoSecrets(res.body.user);

    const again = await api().post(`/api/reset/${token}`).send({ password: 'other123' });
    assert.equal(again.status, 400);
    assert.equal(again.body.code, 'AUTH_RESET_EXPIRED');

    const login = await api().post('/api/login').send({ email: 'bob@example.com', password: 'newpass123' });
    assert.equal(login.status, 200);
  });
});

describe('puzzles', () => {
  test('creating a puzzle needs a login', async () => {
    const res = await api().post('/api/puzzles').send(newNonogram());
    assert.equal(res.status, 403);
  });

  test('the creator is always the logged-in user', async () => {
    const res = await api().post('/api/puzzles')
      .set('Authorization', alice.auth)
      .send(newNonogram({ name: 'Alices', UserId: bob.user.id, id: 4242 }));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.UserId, alice.user.id);
    assert.equal(res.body.type, 'nonogram');
    assert.notEqual(res.body.id, 4242);
    assert.equal('solution' in res.body, false);
    assert.deepEqual(res.body.rowClues, [[[1, 1]]]);
  });

  test('unknown types and invalid puzzle data are rejected', async () => {
    const badType = await api().post('/api/puzzles').set('Authorization', alice.auth)
      .send({ ...newNonogram(), type: 'sudoku' });
    assert.equal(badType.status, 400);
    assert.equal(badType.body.code, 'PUZZLE_TYPE_INVALID');

    const noType = await api().post('/api/puzzles').set('Authorization', alice.auth)
      .send({ ...newNonogram(), type: undefined });
    assert.equal(noType.body.code, 'PUZZLE_TYPE_INVALID');

    const badData = await api().post('/api/puzzles').set('Authorization', alice.auth)
      .send(newNonogram({ solution: [[1]] }));
    assert.equal(badData.status, 400);
    assert.equal(badData.body.code, 'PUZZLE_INVALID');
  });

  test('only the owner can edit a puzzle, and edits are checked too', async () => {
    const created = await api().post('/api/puzzles').set('Authorization', alice.auth).send(newNonogram({ name: 'Mine' }));
    const id = created.body.id;

    const byBob = await api().put(`/api/puzzles/${id}`).set('Authorization', bob.auth).send({ name: 'Hacked' });
    assert.equal(byBob.status, 403);

    const byAlice = await api().put(`/api/puzzles/${id}`).set('Authorization', alice.auth)
      .send({ name: 'Renamed', solution: [[0, 1]], type: 'logical' });
    assert.equal(byAlice.status, 200, JSON.stringify(byAlice.body));
    assert.equal(byAlice.body.name, 'Renamed');
    assert.equal(byAlice.body.type, 'nonogram', 'the type cannot change');
    assert.deepEqual(byAlice.body.rowClues, [[[1, 1]]]);
    assert.deepEqual(byAlice.body.columnClues, [[], [[1, 1]]]);

    const broken = await api().put(`/api/puzzles/${id}`).set('Authorization', alice.auth).send({ width: 3 });
    assert.equal(broken.status, 400);
    assert.equal(broken.body.code, 'PUZZLE_INVALID');
  });

  test('old per-type IDs map to the new puzzle ID', async () => {
    const res = await api().get('/api/puzzles/legacy/linelog/7');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { id: linelog.id });
    const missing = await api().get('/api/puzzles/legacy/linelog/8');
    assert.equal(missing.status, 404);
    const badType = await api().get('/api/puzzles/legacy/sudoku/7');
    assert.equal(badType.status, 404);
  });
});

describe('solving', () => {
  const solvePath = id => `/api/puzzles/${id}/solve`;

  test('recording a solve needs a login', async () => {
    const res = await api().post(solvePath(nonogram.id)).send({ answer: cropSolution(seedNonograms[0]) });
    assert.equal(res.status, 403);
  });

  test('a wrong nonogram grid is rejected', async () => {
    const empty = cropSolution(seedNonograms[0]).map(row => row.map(() => 0));
    const res = await api().post(solvePath(nonogram.id))
      .set('Authorization', alice.auth)
      .send({ answer: empty });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'SOLUTION_INCORRECT');
  });

  test('a correct solve is recorded once per puzzle', async () => {
    const cases = [
      ['nonogram', nonogram.id, { answer: cropSolution(seedNonograms[0]) }],
      ['linelog', linelog.id, { answer: seedLinelogs[0].solution }],
      ['logical', logical.id, { answer: seedLogicals[0].solution }]
    ];
    for (const [type, id, body] of cases) {
      for (let i = 0; i < 2; i++) {
        const res = await api().post(solvePath(id)).set('Authorization', alice.auth).send(body);
        assert.equal(res.status, 200, `${type}: ${JSON.stringify(res.body)}`);
        assert.deepEqual(res.body, { solved: true });
      }
      const solved = await api().get(`/api/users/${alice.user.id}/solved?type=${type}`);
      assert.deepEqual(solved.body, [id], type);
    }
    const all = await api().get(`/api/users/${alice.user.id}/solved`);
    assert.deepEqual(all.body.sort(), [nonogram.id, linelog.id, logical.id].sort());

    const profile = await api().get(`/api/users/${alice.user.id}`);
    assert.deepEqual(profile.body.stats.solved, { nonogram: 1, linelog: 1, logical: 1 });
    assert.ok(profile.body.stats.created.nonogram >= 1);
  });

  test('rankings count verified solves per type', async () => {
    const res = await api().get('/api/rankings');
    assert.equal(res.status, 200);
    for (const type of ['nonogram', 'linelog', 'logical']) {
      assert.deepEqual(res.body[type], [{ id: alice.user.id, username: 'alice', solvedCount: 1 }], type);
    }
  });

  test('solving an unknown puzzle gives 404', async () => {
    const res = await api().post(solvePath(999999))
      .set('Authorization', alice.auth)
      .send({ answer: [[0]] });
    assert.equal(res.status, 404);
  });
});

describe('solutions stay on the server', () => {
  const types = () => [
    ['nonogram', nonogram.id, ['rowClues', 'columnClues']],
    ['linelog', linelog.id, ['information', 'informationColors']],
    ['logical', logical.id, ['clues', 'attributes']]
  ];

  test('puzzle list and detail never contain the solution', async () => {
    for (const [type, id, expected] of types()) {
      const list = await api().get(`/api/puzzles?type=${type}`);
      assert.equal(list.status, 200);
      assert.ok(list.body.length > 0, type);
      for (const puzzle of list.body) {
        assert.equal(puzzle.type, type);
        assert.equal('solution' in puzzle, false, `${type} list`);
        assert.equal('data' in puzzle, false, `${type} list`);
      }
      const detail = await api().get(`/api/puzzles/${id}`);
      assert.equal(detail.status, 200);
      assert.equal('solution' in detail.body, false, `${type} detail`);
      for (const field of expected) {
        assert.ok(Array.isArray(detail.body[field]), `${type} has ${field}`);
      }
    }
  });

  test('listing an unknown type is rejected', async () => {
    const res = await api().get('/api/puzzles?type=sudoku');
    assert.equal(res.status, 400);
  });

  test('nonogram clues match the stored solution', async () => {
    const res = await api().get(`/api/puzzles/${nonogram.id}`);
    assert.equal(res.body.rowClues.length, Number(seedNonograms[0].height));
    assert.equal(res.body.columnClues.length, Number(seedNonograms[0].width));
    const grid = cropSolution(seedNonograms[0]);
    const firstRow = [];
    let prev = 0;
    for (const cell of grid[0]) {
      if (cell !== 0 && cell === prev) firstRow[firstRow.length - 1][1] += 1;
      else if (cell !== 0) firstRow.push([cell, 1]);
      prev = cell;
    }
    assert.deepEqual(res.body.rowClues[0], firstRow);
  });

  test('linelog clue colours are given only on numbered cells', async () => {
    const res = await api().get(`/api/puzzles/${linelog.id}`);
    const { information, informationColors } = res.body;
    information.forEach((row, y) => row.forEach((cell, x) => {
      const expected = cell !== 0 ? seedLinelogs[0].solution[y][x] : 0;
      assert.equal(informationColors[y][x], expected);
    }));
  });

  test('anyone can check an answer without recording a solve', async () => {
    const cases = [
      ['nonogram', nonogram.id, cropSolution(seedNonograms[0]),
        cropSolution(seedNonograms[0]).map(row => row.map(() => 0))],
      ['linelog', linelog.id, seedLinelogs[0].solution,
        seedLinelogs[0].solution.map(row => row.map(() => 0))],
      ['logical', logical.id, seedLogicals[0].solution,
        seedLogicals[0].solution.map(row => row.map(() => 'x'))]
    ];
    for (const [type, id, right, wrong] of cases) {
      const ok = await api().post(`/api/puzzles/${id}/check`).send({ answer: right });
      assert.equal(ok.status, 200, type);
      assert.deepEqual(ok.body, { solved: true }, type);
      const bad = await api().post(`/api/puzzles/${id}/check`).send({ answer: wrong });
      assert.deepEqual(bad.body, { solved: false }, type);
    }
    const solvedByBob = await api().get(`/api/users/${bob.user.id}/solved`);
    assert.deepEqual(solvedByBob.body, []);
    const unknown = await api().post('/api/puzzles/999999/check').send({ answer: [[0]] });
    assert.equal(unknown.status, 404);
  });
});

describe('ratings and comments', () => {
  test('ratings outside 1-5 are rejected', async () => {
    for (const rating of [0, 6, 1000, 2.5, '5']) {
      const res = await api().put(`/api/puzzles/${nonogram.id}/rating`)
        .set('Authorization', alice.auth)
        .send({ rating });
      assert.equal(res.status, 400, `rating ${JSON.stringify(rating)}`);
    }
  });

  test('one rating per user, shown as an average in the list', async () => {
    const rate = (user, rating) => api().put(`/api/puzzles/${nonogram.id}/rating`)
      .set('Authorization', user.auth).send({ rating });
    assert.equal((await rate(alice, 2)).status, 200);
    assert.equal((await rate(alice, 4)).status, 200);
    assert.equal((await rate(bob, 5)).status, 200);

    const mine = await api().get(`/api/puzzles/${nonogram.id}/rating`).set('Authorization', alice.auth);
    assert.deepEqual(mine.body, { rating: 4 });

    const list = await api().get('/api/puzzles?type=nonogram');
    const entry = list.body.find(p => p.id === nonogram.id);
    assert.equal(entry.avgRating, 4.5);
    assert.equal(entry.ratingCount, 2);

    const removed = await api().delete(`/api/puzzles/${nonogram.id}/rating`).set('Authorization', bob.auth);
    assert.equal(removed.status, 200);
    const after = await api().get('/api/puzzles?type=nonogram');
    assert.equal(after.body.find(p => p.id === nonogram.id).ratingCount, 1);
  });

  test('rating needs a login and an existing puzzle', async () => {
    const anon = await api().put(`/api/puzzles/${nonogram.id}/rating`).send({ rating: 3 });
    assert.equal(anon.status, 403);
    const missing = await api().put('/api/puzzles/999999/rating').set('Authorization', alice.auth).send({ rating: 3 });
    assert.equal(missing.status, 404);
  });

  test('comments belong to a puzzle; only the author can delete one', async () => {
    const posted = await api().post(`/api/puzzles/${nonogram.id}/comments`)
      .set('Authorization', alice.auth)
      .send({ text: 'Schönes Rätsel' });
    assert.equal(posted.status, 200, JSON.stringify(posted.body));
    const id = posted.body.id;

    const listed = await api().get(`/api/puzzles/${nonogram.id}/comments`);
    assert.deepEqual(listed.body.map(c => c.id), [id]);
    const elsewhere = await api().get(`/api/puzzles/${linelog.id}/comments`);
    assert.deepEqual(elsewhere.body, []);

    const byBob = await api().delete(`/api/comments/${id}`).set('Authorization', bob.auth);
    assert.equal(byBob.status, 403);

    const byAlice = await api().delete(`/api/comments/${id}`).set('Authorization', alice.auth);
    assert.equal(byAlice.status, 200);
  });

  test('commenting on an unknown puzzle gives 404', async () => {
    const res = await api().post('/api/puzzles/999999/comments')
      .set('Authorization', alice.auth)
      .send({ text: 'Hallo' });
    assert.equal(res.status, 404);
  });
});

describe('rate limiting', () => {
  // Runs last: it uses up the per-IP budget for account endpoints.
  test('forgot-password is limited to 5 requests per 15 minutes', async () => {
    const statuses = [];
    for (let i = 0; i < 8; i++) {
      const res = await api().post('/api/forgot').send({ email: 'nobody@example.com' });
      statuses.push(res.status);
    }
    assert.ok(statuses.includes(429), `no 429 in ${statuses}`);
  });
});
