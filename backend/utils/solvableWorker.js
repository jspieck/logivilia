// Worker thread for solvableCheck.js: runs a plugin's checkSolvable (the
// uniqueness solvers, up to 3 s each) away from the request thread.
// Messages in: { id, type, data }. Messages out: { id, result } or { id, error }.

const { parentPort } = require('worker_threads');
const puzzles = require('../puzzles');

parentPort.on('message', async ({ id, type, data }) => {
  try {
    await puzzles.ready;
    const plugin = puzzles.getPlugin(type);
    const result = plugin.checkSolvable ? plugin.checkSolvable(data) : null;
    parentPort.postMessage({ id, result: result || null });
  } catch (err) {
    parentPort.postMessage({ id, error: err && err.message ? err.message : String(err) });
  }
});
