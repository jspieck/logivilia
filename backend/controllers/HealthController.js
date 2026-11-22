// GET /api/health - public liveness/readiness check for uptime monitors and
// for checking a deploy: { status, db, puzzles, uptime, version, time }.
// Answers 200 when the database is reachable, 503 otherwise. Contains no
// configuration or secrets.

const { sequelize } = require('../models');
const puzzles = require('../puzzles');
const { version } = require('../../package.json');

const DB_TIMEOUT_MS = 3000;

let puzzlesReady = false;
puzzles.ready.then(() => { puzzlesReady = true; }, () => {});

function withTimeout (promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

module.exports = {
  async health (req, res) {
    let db = 'ok';
    try {
      await withTimeout(sequelize.query('SELECT 1'), DB_TIMEOUT_MS);
    } catch (err) {
      db = 'error';
      console.error('[health] database check failed:', err.message);
    }
    const ok = db === 'ok';
    res.set('Cache-Control', 'no-store');
    res.status(ok ? 200 : 503).send({
      status: ok ? 'ok' : 'error',
      db,
      puzzles: puzzlesReady ? 'ok' : 'loading',
      uptime: Math.round(process.uptime()),
      version,
      time: new Date().toISOString()
    });
  }
};
