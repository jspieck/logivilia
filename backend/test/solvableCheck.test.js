// checkSolvable runs in worker threads (audit A10): same answers as the
// plugin itself, the request thread stays free, and the queue is bounded.

process.env.NODE_ENV = 'test';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');

const puzzles = require('../puzzles');
const solvableCheck = require('../utils/solvableCheck');

// Colour 1 = colors[0]; 0 is the background. A 2x2 diagonal has two
// solutions (either diagonal); a single filled cell has one.
const ambiguous = { width: 2, height: 2, colors: ['#000', '#fff'], solution: [[1, 0], [0, 1]] };
const unique = { width: 2, height: 1, colors: ['#000', '#fff'], solution: [[1, 0]] };

before(() => puzzles.ready);

test('worker answers match the plugin run in-process', async () => {
  const plugin = puzzles.getPlugin('nonogram');
  for (const data of [ambiguous, unique]) {
    assert.deepEqual(await solvableCheck.checkSolvable('nonogram', data), plugin.checkSolvable(data) || null);
  }
  assert.equal((await solvableCheck.checkSolvable('nonogram', ambiguous)).code, 'PUZZLE_NOT_UNIQUE');
  assert.equal(await solvableCheck.checkSolvable('nonogram', unique), null);
});

test('the main thread keeps running while checks are busy', async () => {
  // A random 30x30 grid at 40 % fill keeps the solver busy for its whole
  // 3 s budget (in-process that would block the server for 3 s).
  const size = 30;
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const solution = Array.from({ length: size }, () => Array.from({ length: size }, () => (random() < 0.4 ? 1 : 0)));
  const big = { width: size, height: size, colors: ['#000', '#fff'], solution };

  let last = Date.now();
  let maxGap = 0;
  const timer = setInterval(() => {
    const now = Date.now();
    maxGap = Math.max(maxGap, now - last);
    last = now;
  }, 10);
  const started = Date.now();
  const results = await Promise.all([solvableCheck.checkSolvable('nonogram', big), solvableCheck.checkSolvable('nonogram', big)]);
  clearInterval(timer);
  assert.ok(Date.now() - started > 1000, 'the check should take a while');
  assert.deepEqual(results.map(r => r.code), ['PUZZLE_TOO_COMPLEX', 'PUZZLE_TOO_COMPLEX']);
  assert.ok(maxGap < 200, `the main thread was blocked for ${maxGap} ms`);
});

test('too many waiting checks are refused instead of queued', async () => {
  const jobs = [];
  for (let i = 0; i < solvableCheck.MAX_QUEUE + 10; i++) {
    jobs.push(solvableCheck.checkSolvable('nonogram', unique).then(() => 'ok', err => err));
  }
  const results = await Promise.all(jobs);
  assert.ok(results.some(r => r instanceof solvableCheck.QueueFullError), 'some checks are refused');
  assert.ok(results.filter(r => r === 'ok').length >= solvableCheck.MAX_QUEUE, 'the queued ones still finish');
});
