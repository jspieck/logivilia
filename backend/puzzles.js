// Loads the puzzle-type plugins from shared/puzzles (an ES module shared
// with the frontend). The backend is CommonJS, so the plugins are loaded with
// a dynamic import, which works on every Node version we support; `ready`
// resolves once they are available. createApp waits for it before handling
// any /api request, and scripts await it before using a plugin.
//
// Relative path on purpose: some hosts (e.g. Plesk's "NPM install") don't
// create the workspace link node_modules/@logivilia/shared.

// Known synchronously, so modules can use it at require time. Checked against
// the registry once it has loaded.
/** @type {import('@logivilia/shared').PuzzleType[]} */
const PUZZLE_TYPES = ['nonogram', 'linelog', 'logical'];

/** @type {typeof import('../shared/puzzles/index.js') | null} */
let registry = null;

const ready = import('../shared/puzzles/index.js').then(module => {
  if (module.PUZZLE_TYPES.join() !== PUZZLE_TYPES.join()) {
    throw new Error(`backend/puzzles.js PUZZLE_TYPES (${PUZZLE_TYPES}) does not match shared/puzzles (${module.PUZZLE_TYPES})`);
  }
  registry = module;
  return module;
});

function loaded () {
  if (!registry) {
    throw new Error('Puzzle plugins are not loaded yet - await require("./puzzles").ready first.');
  }
  return registry;
}

module.exports = {
  ready,
  /** @param {string} type */
  isPuzzleType: type => typeof type === 'string' && loaded().isPuzzleType(type),
  /** @param {string} type */
  getPlugin: type => loaded().getPlugin(type),
  PUZZLE_TYPES
};
