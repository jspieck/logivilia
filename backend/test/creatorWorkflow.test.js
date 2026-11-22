// Creator workflow: new puzzles wait for an Admin's review, only published
// puzzles are public, and editor drafts are kept on the server.

process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const createApp = require('../createApp');
const { sequelize, User, PuzzleSolve } = require('../models');
const { resetDatabase } = require('../migrator');
const { testOutbox } = require('../controllers/AuthenticationController');

const app = createApp();
const api = () => request(app);

async function register (name) {
  const res = await api().post('/api/register').send({ username: name, email: `${name}@example.com`, password: 'secret123' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const mail = testOutbox.findLast(m => m.to === `${name}@example.com`);
  const token = mail.text.match(/\/verify\/([a-f0-9]+)/)[1];
  assert.equal((await api().post(`/api/verify/${token}`)).status, 200);
  return { id: res.body.user.id, auth: `Bearer ${res.body.token}` };
}

const nonogram = (extra = {}) => ({
  type: 'nonogram', name: 'Tiny', difficulty: 1,
  width: 2, height: 1, numColor: 1, colors: ['#ffffff', '#000000'], solution: [[1, 0]],
  ...extra
});

let creator, player, admin;

before(async () => {
  await resetDatabase();
  creator = await register('creator');
  player = await register('player');
  admin = await register('admin');
  await User.update({ role: 'Admin' }, { where: { id: admin.id } });
});

after(() => sequelize.close());

const listedIds = async () =>
  (await api().get('/api/puzzles').query({ type: 'nonogram', page: 1, perPage: 100 })).body.items.map(p => p.id);

describe('review', () => {
  let id;

  test('a new puzzle by a creator is pending and hidden from others', async () => {
    const sent = testOutbox.length;
    const created = await api().post('/api/puzzles').set('Authorization', creator.auth).send(nonogram({ name: 'Waiting' }));
    assert.equal(created.status, 200, JSON.stringify(created.body));
    assert.equal(created.body.status, 'pending');
    id = created.body.id;

    // Every Admin gets a mail; nobody else.
    const mails = testOutbox.slice(sent);
    assert.deepEqual(mails.map(m => m.to), ['admin@example.com']);
    assert.match(mails[0].subject, /Waiting/);
    assert.match(mails[0].text, /creator/);
    assert.match(mails[0].text, /\/admin\/review/);

    assert.equal(!(await listedIds()).includes(id), true);
    assert.equal((await api().get('/api/puzzles').query({ type: 'nonogram' })).body.some(p => p.id === id), false);
    assert.equal((await api().get(`/api/puzzles/${id}`)).status, 404);
    assert.equal((await api().get(`/api/puzzles/${id}`).set('Authorization', player.auth)).status, 404);
    assert.equal((await api().post(`/api/puzzles/${id}/check`).send({ answer: [[1, 0]] })).status, 404);
    assert.equal((await api().post(`/api/puzzles/${id}/comments`).set('Authorization', creator.auth).send({ text: 'hi' })).status, 404);
    const home = (await api().get('/api/home')).body;
    assert.equal(home.counts.nonogram, 0);
    assert.equal((await api().get(`/api/users/${creator.id}`)).body.stats.created.nonogram, 0);
  });

  test('the author and Admins can open it; solving it records nothing', async () => {
    const own = await api().get(`/api/puzzles/${id}`).set('Authorization', creator.auth);
    assert.equal(own.status, 200);
    assert.equal(own.body.status, 'pending');
    assert.equal((await api().get(`/api/puzzles/${id}`).set('Authorization', admin.auth)).status, 200);

    const solve = await api().post(`/api/puzzles/${id}/solve`).set('Authorization', creator.auth).send({ answer: [[1, 0]] });
    assert.equal(solve.status, 200);
    assert.equal(solve.body.solved, true);
    assert.equal(solve.body.recorded, false);
    assert.equal(await PuzzleSolve.count({ where: { PuzzleId: id } }), 0);
    assert.equal((await api().put(`/api/puzzles/${id}/rating`).set('Authorization', creator.auth).send({ rating: 5 })).status, 404);
  });

  test('"Meine Rätsel" lists own puzzles in every status', async () => {
    const mine = await api().get('/api/my/puzzles').set('Authorization', creator.auth);
    assert.equal(mine.status, 200);
    assert.deepEqual(mine.body.map(p => [p.id, p.status]), [[id, 'pending']]);
    assert.deepEqual((await api().get('/api/my/puzzles').set('Authorization', player.auth)).body, []);
    assert.equal((await api().get('/api/my/puzzles')).status, 403);
  });

  test('only Admins see the queue and review', async () => {
    assert.equal((await api().get('/api/admin/review').set('Authorization', creator.auth)).status, 403);
    assert.equal((await api().post(`/api/admin/puzzles/${id}/review`).set('Authorization', creator.auth)
      .send({ decision: 'approve' })).status, 403);

    const queue = await api().get('/api/admin/review').set('Authorization', admin.auth);
    assert.equal(queue.status, 200);
    assert.deepEqual(queue.body.map(p => p.id), [id]);
    assert.deepEqual(queue.body[0].creator, { id: creator.id, username: 'creator' });
  });

  test('a rejection needs a note and goes back to the author', async () => {
    const noNote = await api().post(`/api/admin/puzzles/${id}/review`).set('Authorization', admin.auth).send({ decision: 'reject' });
    assert.equal(noNote.status, 400);
    assert.equal(noNote.body.code, 'REVIEW_INVALID');

    const sent = testOutbox.length;
    const rejected = await api().post(`/api/admin/puzzles/${id}/review`).set('Authorization', admin.auth)
      .send({ decision: 'reject', note: 'Bitte einen besseren Namen.' });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.status, 'rejected');
    const mails = testOutbox.slice(sent);
    assert.deepEqual(mails.map(m => m.to), ['creator@example.com']);
    assert.match(mails[0].text, /Bitte einen besseren Namen\./);
    assert.match(mails[0].text, /\/my-puzzles/);
    assert.equal((await api().get('/api/admin/review').set('Authorization', admin.auth)).body.length, 0);
    const again = await api().post(`/api/admin/puzzles/${id}/review`).set('Authorization', admin.auth).send({ decision: 'approve' });
    assert.equal(again.status, 409);

    const mine = (await api().get('/api/my/puzzles').set('Authorization', creator.auth)).body;
    assert.equal(mine[0].status, 'rejected');
    assert.equal(mine[0].reviewNote, 'Bitte einen besseren Namen.');
  });

  test('editing a rejected puzzle resubmits it; approval publishes it', async () => {
    let sent = testOutbox.length;
    const edited = await api().put(`/api/puzzles/${id}`).set('Authorization', creator.auth).send({ name: 'Better' });
    assert.equal(edited.status, 200, JSON.stringify(edited.body));
    assert.equal(edited.body.status, 'pending');
    assert.deepEqual(testOutbox.slice(sent).map(m => m.to), ['admin@example.com'], 'resubmission tells the admins');
    // Further edits while pending do not mail again.
    sent = testOutbox.length;
    await api().put(`/api/puzzles/${id}`).set('Authorization', creator.auth).send({ name: 'Better' });
    assert.equal(testOutbox.length, sent);

    const approved = await api().post(`/api/admin/puzzles/${id}/review`).set('Authorization', admin.auth).send({ decision: 'approve' });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.status, 'published');
    assert.equal(approved.body.reviewNote, null);
    const mails = testOutbox.slice(sent);
    assert.deepEqual(mails.map(m => m.to), ['creator@example.com']);
    assert.match(mails[0].text, new RegExp(`/puzzle/${id}`));

    assert.ok((await listedIds()).includes(id));
    assert.equal((await api().get(`/api/puzzles/${id}`)).status, 200);
    assert.equal((await api().get('/api/home')).body.counts.nonogram, 1);

    // Once published, only Admins may change it (no edits past the review).
    const locked = await api().put(`/api/puzzles/${id}`).set('Authorization', creator.auth).send({ name: 'Best' });
    assert.equal(locked.status, 403);
    assert.equal(locked.body.code, 'PUZZLE_LOCKED');
    const byAdmin = await api().put(`/api/puzzles/${id}`).set('Authorization', admin.auth).send({ name: 'Best' });
    assert.equal(byAdmin.status, 200);
    assert.equal(byAdmin.body.status, 'published');
    // The author can still load it (e.g. the logical rules panel).
    assert.equal((await api().get(`/api/puzzles/${id}/source`).set('Authorization', creator.auth)).status, 200);
  });

  test('an Admin\'s own puzzle is published right away', async () => {
    const sent = testOutbox.length;
    const created = await api().post('/api/puzzles').set('Authorization', admin.auth)
      .send(nonogram({ name: 'By admin', solution: [[0, 1]] }));
    assert.equal(created.status, 200, JSON.stringify(created.body));
    assert.equal(created.body.status, 'published');
    assert.equal(testOutbox.length, sent, 'no review mail for an Admin\'s puzzle');
  });
});

describe('drafts', () => {
  let draftId;
  const state = { grid: [[1, 0]], fills: ['#000000'], background: '#ffffff' };

  test('a creator can save, list, load and update drafts', async () => {
    assert.equal((await api().post('/api/drafts').send({ type: 'nonogram', state })).status, 403);
    const bad = await api().post('/api/drafts').set('Authorization', creator.auth).send({ type: 'sudoku', state });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, 'DRAFT_INVALID');

    const created = await api().post('/api/drafts').set('Authorization', creator.auth).send({ type: 'nonogram', name: ' Halb ', state });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    draftId = created.body.id;
    assert.equal(created.body.name, 'Halb');

    const list = await api().get('/api/drafts').set('Authorization', creator.auth);
    assert.deepEqual(list.body.map(d => [d.id, d.type, d.name]), [[draftId, 'nonogram', 'Halb']]);
    assert.equal('state' in list.body[0], false);

    const updated = await api().put(`/api/drafts/${draftId}`).set('Authorization', creator.auth)
      .send({ name: 'Fast fertig', state: { ...state, grid: [[0, 1]] } });
    assert.equal(updated.status, 200);
    const loaded = await api().get(`/api/drafts/${draftId}`).set('Authorization', creator.auth);
    assert.equal(loaded.body.name, 'Fast fertig');
    assert.deepEqual(loaded.body.state.grid, [[0, 1]]);
  });

  test('drafts are private', async () => {
    assert.equal((await api().get(`/api/drafts/${draftId}`).set('Authorization', player.auth)).status, 404);
    assert.equal((await api().put(`/api/drafts/${draftId}`).set('Authorization', player.auth).send({ state })).status, 404);
    assert.equal((await api().delete(`/api/drafts/${draftId}`).set('Authorization', player.auth)).status, 404);
    assert.deepEqual((await api().get('/api/drafts').set('Authorization', player.auth)).body, []);
  });

  test('publishing from a draft deletes it', async () => {
    const created = await api().post('/api/puzzles').set('Authorization', creator.auth)
      .send(nonogram({ name: 'From draft', width: 3, solution: [[1, 0, 1]], draftId }));
    assert.equal(created.status, 200, JSON.stringify(created.body));
    assert.equal((await api().get(`/api/drafts/${draftId}`).set('Authorization', creator.auth)).status, 404);
  });

  test('a draft can be deleted', async () => {
    const created = await api().post('/api/drafts').set('Authorization', creator.auth).send({ type: 'linelog', state: { a: 1 } });
    const del = await api().delete(`/api/drafts/${created.body.id}`).set('Authorization', creator.auth);
    assert.equal(del.status, 200);
    assert.deepEqual((await api().get('/api/drafts').set('Authorization', creator.auth)).body, []);
  });
});
