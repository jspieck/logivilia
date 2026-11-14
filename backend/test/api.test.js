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
const { sequelize, Nonogram, Linelog, Logical } = require('../models');
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

function withoutId ({ id, UserId, createdAt, updatedAt, ...rest }) {
  return rest;
}

let alice, bob, nonogram, linelog, logical;

before(async () => {
  await sequelize.sync({ force: true });
  nonogram = await Nonogram.create(withoutId(seedNonograms[0]));
  linelog = await Linelog.create(withoutId(seedLinelogs[0]));
  logical = await Logical.create(withoutId(seedLogicals[0]));
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
    const res = await api().get('/api/nonogram/999999');
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
    const res = await api().post('/api/nonogram').set('Authorization', `Bearer ${forged}`).send({ name: 'x' });
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
    const res = await api().post('/api/nonogram').send({ name: 'anon' });
    assert.equal(res.status, 403);
  });

  test('the creator is always the logged-in user', async () => {
    const res = await api().post('/api/nonogram')
      .set('Authorization', alice.auth)
      .send({ name: 'Alices', UserId: bob.user.id, id: 4242 });
    assert.equal(res.status, 200);
    assert.equal(res.body.UserId, alice.user.id);
    assert.notEqual(res.body.id, 4242);
  });

  test('only the owner can edit a puzzle', async () => {
    const created = await api().post('/api/nonogram').set('Authorization', alice.auth).send({ name: 'Mine' });
    const id = created.body.id;

    const byBob = await api().put(`/api/nonogram/${id}`).set('Authorization', bob.auth).send({ name: 'Hacked' });
    assert.equal(byBob.status, 403);

    const byAlice = await api().put(`/api/nonogram/${id}`).set('Authorization', alice.auth).send({ name: 'Renamed' });
    assert.equal(byAlice.status, 200);
    assert.equal(byAlice.body.name, 'Renamed');
  });
});

describe('solving', () => {
  const solvePath = (user, type, id) => `/api/users/${user.user.id}/${type}/${id}`;

  test('cannot record a solve for another user', async () => {
    const res = await api().patch(solvePath(bob, 'nonogram', nonogram.id))
      .set('Authorization', alice.auth)
      .send({ grid: cropSolution(seedNonograms[0]) });
    assert.equal(res.status, 403);
  });

  test('a wrong nonogram grid is rejected', async () => {
    const empty = cropSolution(seedNonograms[0]).map(row => row.map(() => 0));
    const res = await api().patch(solvePath(alice, 'nonogram', nonogram.id))
      .set('Authorization', alice.auth)
      .send({ grid: empty });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'SOLUTION_INCORRECT');
  });

  test('a correct solve is recorded once per puzzle type', async () => {
    const cases = [
      ['nonogram', nonogram.id, { grid: cropSolution(seedNonograms[0]) }, 'solvedNonograms'],
      ['linelog', linelog.id, { grid: seedLinelogs[0].solution }, 'solvedLinelogs'],
      ['logical', logical.id, { solution: seedLogicals[0].solution }, 'solvedLogicals']
    ];
    for (const [type, id, body, field] of cases) {
      for (let i = 0; i < 2; i++) {
        const res = await api().patch(solvePath(alice, type, id)).set('Authorization', alice.auth).send(body);
        assert.equal(res.status, 200, `${type}: ${JSON.stringify(res.body)}`);
      }
      const profile = await api().get(`/api/users/${alice.user.id}`);
      assert.deepEqual(profile.body[field], [id], type);
    }
  });

  test('solving an unknown puzzle gives 404', async () => {
    const res = await api().patch(solvePath(alice, 'linelog', 999999))
      .set('Authorization', alice.auth)
      .send({ grid: [[0]] });
    assert.equal(res.status, 404);
  });
});

describe('ratings and comments', () => {
  test('ratings outside 1-5 are rejected', async () => {
    for (const rating of [0, 6, 1000, 2.5, '5']) {
      const res = await api().post('/api/nonogramratings')
        .set('Authorization', alice.auth)
        .send({ NonogramId: nonogram.id, rating });
      assert.equal(res.status, 400, `rating ${JSON.stringify(rating)}`);
    }
    const ok = await api().post('/api/nonogramratings')
      .set('Authorization', alice.auth)
      .send({ NonogramId: nonogram.id, rating: 4 });
    assert.equal(ok.status, 200);
  });

  test('only the author can delete a comment', async () => {
    const posted = await api().post(`/api/comments/nonogram/${nonogram.id}`)
      .set('Authorization', alice.auth)
      .send({ text: 'Schönes Rätsel' });
    assert.equal(posted.status, 200, JSON.stringify(posted.body));
    const id = posted.body.id;

    const byBob = await api().delete(`/api/comments/${id}`).set('Authorization', bob.auth);
    assert.equal(byBob.status, 403);

    const byAlice = await api().delete(`/api/comments/${id}`).set('Authorization', alice.auth);
    assert.equal(byAlice.status, 200);
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
