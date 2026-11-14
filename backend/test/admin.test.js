// Tests for the admin diagnostics endpoints.

process.env.NODE_ENV = 'test';
// Empty on purpose: the test must never reach a real mail server.
// (dotenv does not override variables that are already set.)
process.env.SMTP_PASSWORD = '';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const createApp = require('../createApp');
const { sequelize, User } = require('../models');

const app = createApp();

async function registerAndLogin (name) {
  const res = await request(app).post('/api/register').send({
    username: name, email: `${name}@example.com`, password: 'secret123'
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { id: res.body.user.id, auth: `Bearer ${res.body.token}` };
}

let member, admin;

before(async () => {
  await sequelize.sync({ force: true });
  member = await registerAndLogin('member');
  admin = await registerAndLogin('boss');
  await User.update({ role: 'Admin' }, { where: { id: admin.id } });
});

after(() => sequelize.close());

test('test-mail needs a login', async () => {
  const res = await request(app).post('/api/admin/test-mail');
  assert.equal(res.status, 403);
});

test('test-mail is admin-only', async () => {
  const res = await request(app).post('/api/admin/test-mail').set('Authorization', member.auth);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'FORBIDDEN');
});

test('test-mail reports missing SMTP settings without revealing secrets', async () => {
  const res = await request(app).post('/api/admin/test-mail').set('Authorization', admin.auth);
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.step, 'config');
  assert.equal(res.body.settings.passwordSet, false);
  assert.equal('password' in res.body.settings, false);
});
