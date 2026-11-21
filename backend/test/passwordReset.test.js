// Password reset expiry. The tests run on SQLite, which does not enforce
// column sizes, so the MySQL INT limit is checked explicitly: a value above
// it makes MySQL reject the save and "forgot password" silently fails.

process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const createApp = require('../createApp');
const { sequelize, User } = require('../models');
const { resetDatabase } = require('../migrator');
const { testOutbox } = require('../controllers/AuthenticationController');

const app = createApp();
const MYSQL_INT_MAX = 2147483647;
const nowSeconds = () => Math.floor(Date.now() / 1000);

before(async () => {
  await resetDatabase();
  const res = await request(app).post('/api/register').send({
    username: 'carol', email: 'carol@example.com', password: 'secret123'
  });
  assert.equal(res.status, 200);
});

after(() => sequelize.close());

test('the reset expiry fits a MySQL INT column and lies about an hour ahead', async () => {
  await request(app).post('/api/forgot').send({ email: 'carol@example.com' });
  const user = await User.findOne({ where: { email: 'carol@example.com' } });
  const expires = user.resetPasswordExpires;
  assert.ok(expires <= MYSQL_INT_MAX, `expiry ${expires} does not fit a MySQL INT`);
  assert.ok(expires > nowSeconds() + 3500 && expires <= nowSeconds() + 3600, `expiry ${expires}`);
});

test('an expired reset link is rejected', async () => {
  const mail = testOutbox.findLast(m => m.to === 'carol@example.com');
  const token = mail.text.match(/\/reset\/([a-f0-9]+)/)[1];
  await User.update({ resetPasswordExpires: nowSeconds() - 1 }, { where: { email: 'carol@example.com' } });

  const res = await request(app).post(`/api/reset/${token}`).send({ password: 'newpass123' });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'AUTH_RESET_EXPIRED');
});

test('e-mails follow the Accept-Language the frontend sends', async () => {
  await request(app).post('/api/forgot').set('Accept-Language', 'en').send({ email: 'carol@example.com' });
  const en = testOutbox.findLast(m => m.to === 'carol@example.com');
  assert.match(en.subject, /Resetting your password/);
  assert.match(en.text, /\/reset\/[0-9a-f]{64}/);

  await request(app).post('/api/forgot').send({ email: 'carol@example.com' });
  const de = testOutbox.findLast(m => m.to === 'carol@example.com');
  assert.match(de.subject, /Zurücksetzen des Passworts/);
});
