// Tests for the health check, the admin log endpoint, the final error
// handler and the file logger.

process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const createApp = require('../createApp');
const { sequelize, User } = require('../models');
const { resetDatabase } = require('../migrator');

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
  await resetDatabase();
  member = await registerAndLogin('watcher');
  admin = await registerAndLogin('ops');
  await User.update({ role: 'Admin' }, { where: { id: admin.id } });
});

after(() => sequelize.close());

test('health reports ok with a reachable database', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.db, 'ok');
  assert.equal(typeof res.body.uptime, 'number');
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('health answers 503 when the database fails', async (t) => {
  t.mock.method(sequelize, 'query', () => Promise.reject(new Error('down')));
  t.mock.method(console, 'error', () => {});
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 503);
  assert.equal(res.body.status, 'error');
  assert.equal(res.body.db, 'error');
});

test('logs need a login and the Admin role', async () => {
  assert.equal((await request(app).get('/api/admin/logs')).status, 403);
  const res = await request(app).get('/api/admin/logs').set('Authorization', member.auth);
  assert.equal(res.status, 403);
});

test('logs answer plain text for admins', async () => {
  const res = await request(app).get('/api/admin/logs').set('Authorization', admin.auth);
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /^text\/plain/);
});

test('malformed JSON gets a 400 error code, not a stack trace', async () => {
  const res = await request(app).post('/api/login')
    .set('Content-Type', 'application/json').send('{"username":');
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { code: 'VALIDATION_INVALID' });
});

test('logger writes console output to the file, rotates it and tails it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logivilia-log-'));
  const file = path.join(dir, 'app.log');
  const script = `
    process.env.NODE_ENV = 'production';
    process.env.LOG_FILE = ${JSON.stringify(file)};
    process.env.LOG_MAX_BYTES = '200';
    const logger = require(${JSON.stringify(path.join(__dirname, '..', 'utils', 'logger'))});
    logger.install();
    for (let i = 0; i < 10; i++) console.log('line', i);
    console.error(new Error('boom'));
    process.stdout.write('\\nTAIL:' + JSON.stringify(logger.tail(3)));
  `;
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const tail = JSON.parse(out.split('\nTAIL:')[1]);
  assert.match(fs.readFileSync(file, 'utf8'), /ERROR Error: boom/);
  assert.ok(fs.existsSync(`${file}.1`), 'rotated file exists');
  assert.ok(tail.split('\n').length <= 3);
  fs.rmSync(dir, { recursive: true, force: true });
});
