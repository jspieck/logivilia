// Account features required for GDPR (audit B15): e-mail verification,
// data export and account deletion.

process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const createApp = require('../createApp');
const { sequelize, Puzzle, PuzzleSolve, PuzzleRating, PuzzleDraft, Comment, CommentUpvote, User } = require('../models');
const { resetDatabase } = require('../migrator');
const { testOutbox } = require('../controllers/AuthenticationController');

const app = createApp();
const api = () => request(app);
const PASSWORD = 'secret123';

async function register (name) {
  const res = await api().post('/api/register').send({ username: name, email: `${name}@example.com`, password: PASSWORD });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { ...res.body, auth: `Bearer ${res.body.token}` };
}

const verifyToken = name => {
  const mail = testOutbox.findLast(m => m.to === `${name}@example.com`);
  assert.ok(mail, `no verification e-mail for ${name}`);
  return mail.text.match(/\/verify\/([a-f0-9]+)/)[1];
};

const newNonogram = () => ({
  type: 'nonogram', name: 'Tiny', difficulty: 1,
  width: 2, height: 1, numColor: 1, colors: ['#ffffff', '#000000'], solution: [[1, 0]]
});

let puzzle;

before(async () => {
  await resetDatabase();
  puzzle = await Puzzle.create({ type: 'nonogram', name: 'Seed', difficulty: 1, data: { ...newNonogram(), type: undefined } });
});

after(() => sequelize.close());

describe('e-mail verification', () => {
  let dora;

  test('a new account starts unverified and gets a link by e-mail', async () => {
    dora = await register('dora');
    assert.equal(dora.user.emailVerified, false);
    assert.ok(verifyToken('dora'));
    const stored = await User.findByPk(dora.user.id);
    assert.notEqual(stored.emailVerificationToken, verifyToken('dora'), 'token must be stored hashed');
  });

  test('unverified users can solve, but not comment or publish', async () => {
    const comment = await api().post(`/api/puzzles/${puzzle.id}/comments`).set('Authorization', dora.auth).send({ text: 'hi' });
    assert.equal(comment.status, 403);
    assert.equal(comment.body.code, 'EMAIL_NOT_VERIFIED');
    const create = await api().post('/api/puzzles').set('Authorization', dora.auth).send(newNonogram());
    assert.equal(create.body.code, 'EMAIL_NOT_VERIFIED');
    const solve = await api().post(`/api/puzzles/${puzzle.id}/solve`).set('Authorization', dora.auth).send({ answer: [[1, 0]] });
    assert.equal(solve.status, 200, JSON.stringify(solve.body));
  });

  test('resend replaces the link; the old one stops working', async () => {
    const oldToken = verifyToken('dora');
    const res = await api().post('/api/verify/resend').set('Authorization', dora.auth);
    assert.equal(res.status, 200);
    const newToken = verifyToken('dora');
    assert.notEqual(newToken, oldToken);
    assert.equal((await api().post(`/api/verify/${oldToken}`)).body.code, 'AUTH_VERIFY_INVALID');
  });

  test('the link verifies the account once', async () => {
    const token = verifyToken('dora');
    const res = await api().post(`/api/verify/${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.emailVerified, true);
    assert.equal('emailVerificationToken' in res.body.user, false);
    assert.equal((await api().post(`/api/verify/${token}`)).status, 400);

    const comment = await api().post(`/api/puzzles/${puzzle.id}/comments`).set('Authorization', dora.auth).send({ text: 'hi' });
    assert.equal(comment.status, 200);
  });

  test('a password reset verifies the address too', async () => {
    const erik = await register('erik');
    await api().post('/api/forgot').send({ email: 'erik@example.com' });
    const mail = testOutbox.findLast(m => m.to === 'erik@example.com' && /\/reset\//.test(m.text));
    const token = mail.text.match(/\/reset\/([a-f0-9]+)/)[1];
    const res = await api().post(`/api/reset/${token}`).send({ password: 'newpass123' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.emailVerified, true);
    assert.equal((await User.findByPk(erik.user.id)).emailVerified, true);
  });

  test('the public profile does not show the verification state', async () => {
    const res = await api().get(`/api/users/${dora.user.id}`);
    assert.equal('emailVerified' in res.body, false);
    assert.equal('email' in res.body, false);
  });
});

describe('data export and account deletion', () => {
  let fred, gina;

  before(async () => {
    fred = await register('fred');
    gina = await register('gina');
    for (const name of ['fred', 'gina']) {
      await api().post(`/api/verify/${verifyToken(name)}`);
    }
    const as = user => ({ Authorization: user.auth });
    await api().post(`/api/puzzles/${puzzle.id}/solve`).set(as(fred)).send({ answer: [[1, 0]] });
    await api().put(`/api/puzzles/${puzzle.id}/rating`).set(as(fred)).send({ rating: 4 });
    const fredComment = await api().post(`/api/puzzles/${puzzle.id}/comments`).set(as(fred)).send({ text: 'mine' });
    const ginaComment = await api().post(`/api/puzzles/${puzzle.id}/comments`).set(as(gina)).send({ text: 'hers' });
    await api().post(`/api/commentupvote/${fredComment.body.id}`).set(as(gina));
    await api().post(`/api/commentupvote/${ginaComment.body.id}`).set(as(fred));
    const created = await api().post('/api/puzzles').set(as(fred)).send({ ...newNonogram(), name: 'Fred puzzle', author: 'fred' });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    fred.puzzleId = created.body.id;
    // An Admin approved that one; a second one still waits for review.
    await Puzzle.update({ status: 'published' }, { where: { id: fred.puzzleId } });
    const pending = await api().post('/api/puzzles').set(as(fred)).send({ ...newNonogram(), name: 'Fred pending' });
    fred.pendingId = pending.body.id;
    const draft = await api().post('/api/drafts').set(as(fred)).send({ type: 'nonogram', name: 'Half done', state: { grid: [[1]] } });
    assert.equal(draft.status, 200, JSON.stringify(draft.body));
  });

  test('export is only for the own account', async () => {
    assert.equal((await api().get(`/api/users/${fred.user.id}/export`)).status, 403);
    assert.equal((await api().get(`/api/users/${fred.user.id}/export`).set('Authorization', gina.auth)).status, 403);
  });

  test('export contains the account and all activity, but no secrets', async () => {
    const res = await api().get(`/api/users/${fred.user.id}/export`).set('Authorization', fred.auth);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-disposition'], /attachment/);
    const data = res.body;
    assert.equal(data.account.email, 'fred@example.com');
    for (const secret of ['password', 'resetPasswordToken', 'resetPasswordExpires', 'emailVerificationToken']) {
      assert.equal(secret in data.account, false, secret);
    }
    assert.deepEqual(data.solves.map(s => s.puzzle.id), [puzzle.id]);
    assert.deepEqual(data.ratings.map(r => r.rating), [4]);
    assert.deepEqual(data.comments.map(c => c.text), ['mine']);
    assert.equal(data.commentUpvotes.length, 1);
    assert.deepEqual(data.createdPuzzles.map(p => [p.name, p.status]), [['Fred puzzle', 'published'], ['Fred pending', 'pending']]);
    assert.deepEqual(data.drafts.map(d => [d.type, d.name, d.state]), [['nonogram', 'Half done', { grid: [[1]] }]]);
  });

  test('deleting needs the own account and the right password', async () => {
    const other = await api().delete(`/api/users/${fred.user.id}`).set('Authorization', gina.auth).send({ password: PASSWORD });
    assert.equal(other.status, 403);
    const wrong = await api().delete(`/api/users/${fred.user.id}`).set('Authorization', fred.auth).send({ password: 'nope12345' });
    assert.equal(wrong.status, 403);
    assert.ok(await User.findByPk(fred.user.id));
  });

  test('deleting removes the account and its activity, but keeps published puzzles', async () => {
    const res = await api().delete(`/api/users/${fred.user.id}`).set('Authorization', fred.auth).send({ password: PASSWORD });
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const UserId = fred.user.id;
    assert.equal(await User.findByPk(UserId), null);
    assert.equal(await PuzzleSolve.count({ where: { UserId } }), 0);
    assert.equal(await PuzzleRating.count({ where: { UserId } }), 0);
    assert.equal(await Comment.count({ where: { UserId } }), 0);
    assert.equal(await CommentUpvote.count({ where: { UserId } }), 0);
    // Gina's upvote on Fred's comment went with the comment; her comment stays.
    assert.equal(await CommentUpvote.count(), 0);
    assert.equal(await Comment.count({ where: { UserId: gina.user.id } }), 1);

    const kept = await Puzzle.findByPk(fred.puzzleId);
    assert.ok(kept, 'published puzzle was deleted');
    assert.equal(kept.UserId, null);
    assert.equal(kept.author, null);
    assert.equal(await Puzzle.findByPk(fred.pendingId), null, 'unpublished puzzle should go with the account');
    assert.equal(await PuzzleDraft.count({ where: { UserId } }), 0);

    const login = await api().post('/api/login').send({ email: 'fred@example.com', password: PASSWORD });
    assert.equal(login.status, 403);
    assert.equal((await api().get(`/api/users/${UserId}/export`).set('Authorization', fred.auth)).status, 403);
  });
});
