// Runs a plugin's checkSolvable in worker threads (audit A10). The solvers
// may take up to 3 s per save; on the request thread that would stall every
// other request for that long.
//
// - A small pool of long-lived workers (they load the shared plugins once).
// - A safety timeout: a worker that does not answer in time is terminated
//   and replaced, and the save gets PUZZLE_TOO_COMPLEX.
// - A queue limit: when too many checks wait, new ones get RATE_LIMITED
//   instead of piling up.

const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');

const WORKER_FILE = path.join(__dirname, 'solvableWorker.js');
const POOL_SIZE = Math.max(1, Math.min(2, (os.availableParallelism ? os.availableParallelism() : os.cpus().length) - 1));
const TIMEOUT_MS = 10000;
const MAX_QUEUE = 20;

/** @typedef {{ code: string, params?: object } | null} CheckResult */
/** @typedef {{ type: string, data: object, resolve: (r: CheckResult) => void, reject: (e: Error) => void }} Job */

/** @type {{ worker: Worker, job: Job | null, timer: NodeJS.Timeout | null }[]} */
const slots = [];
/** @type {Job[]} */
const queue = [];
let nextId = 1;

class QueueFullError extends Error {}

function startWorker (slot) {
  const worker = new Worker(WORKER_FILE);
  slot.worker = worker;
  worker.on('message', ({ result, error }) => {
    // A replaced (timed-out) worker may still answer late; ignore it.
    if (slot.worker !== worker) return;
    const job = slot.job;
    finish(slot);
    if (!job) return;
    if (error) job.reject(new Error(error));
    else job.resolve(result);
  });
  worker.on('error', err => {
    if (slot.worker !== worker) return;
    const job = slot.job;
    finish(slot);
    if (job) job.reject(err);
  });
  worker.on('exit', () => {
    // Crashed or terminated: hand any job back as failed and start afresh.
    if (slot.worker !== worker) return;
    const job = slot.job;
    finish(slot);
    if (job) job.reject(new Error('solvable check worker exited'));
    startWorker(slot);
  });
  // Workers never keep the process alive on their own: the server has its
  // HTTP listener for that, and tests and scripts must be able to exit.
  // (After the listeners: adding a 'message' listener refs the port again.)
  worker.unref();
}

function finish (slot) {
  if (slot.timer) clearTimeout(slot.timer);
  slot.timer = null;
  slot.job = null;
  pump();
}

function pump () {
  for (const slot of slots) {
    if (slot.job || !queue.length) continue;
    const job = queue.shift();
    slot.job = job;
    slot.timer = setTimeout(() => {
      // Stuck beyond the solvers' own budget: replace the worker.
      const stuck = slot.worker;
      slot.job = null;
      slot.timer = null;
      job.resolve({ code: 'PUZZLE_TOO_COMPLEX' });
      startWorker(slot);
      stuck.terminate();
      pump();
    }, TIMEOUT_MS);
    slot.worker.postMessage({ id: nextId++, type: job.type, data: job.data });
  }
}

function ensurePool () {
  while (slots.length < POOL_SIZE) {
    const slot = { worker: null, job: null, timer: null };
    slots.push(slot);
    startWorker(slot);
  }
}

/**
 * Resolves with the plugin's checkSolvable result ({ code, params } or null).
 * Rejects with QueueFullError when too many checks are waiting.
 * @param {string} type
 * @param {object} data
 * @returns {Promise<CheckResult>}
 */
function checkSolvable (type, data) {
  ensurePool();
  if (queue.length >= MAX_QUEUE) {
    return Promise.reject(new QueueFullError('too many solvable checks waiting'));
  }
  return new Promise((resolve, reject) => {
    queue.push({ type, data, resolve, reject });
    pump();
  });
}

module.exports = { checkSolvable, QueueFullError, TIMEOUT_MS, MAX_QUEUE };
