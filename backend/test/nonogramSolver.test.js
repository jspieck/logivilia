// Tests for the nonogram solver (shared/puzzles/nonogramSolver.js, audit B6).
// The strongest check: run it over every seed nonogram from the clues alone
// and compare with the stored solutions.

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const puzzles = require('../puzzles');
const { checkNonograms } = require('../scripts/checkNonograms');
const nonograms = require('../seed/nonograms.json');

let plugin;
let solveLine;
before(async () => {
  await puzzles.ready;
  plugin = puzzles.getPlugin('nonogram');
  ({ solveLine } = await import('../../shared/puzzles/nonogramSolver.js'));
});

// The seed nonograms that had several solutions until the one-cell fixes of
// migration 20261115-02.
const FIXED = ['Bobby', 'Mohn im Topf', 'Elefant', 'Drache'];

const ANY = 0b111; // empty, colour 1 or colour 2 still possible

describe('solveLine', () => {
  test('finds the overlap of a long block', () => {
    // [1x8] in 10 cells: cells 2..7 are colour 1 in every placement.
    const result = solveLine(Array(10).fill(ANY), [[1, 8]]);
    assert.deepEqual(result, [3, 3, 2, 2, 2, 2, 2, 2, 3, 3]);
  });

  test('lets blocks of different colours touch', () => {
    assert.deepEqual(solveLine(Array(4).fill(ANY), [[1, 2], [2, 2]]), [2, 2, 4, 4]);
  });

  test('needs a gap between blocks of the same colour', () => {
    assert.equal(solveLine(Array(4).fill(ANY), [[1, 2], [1, 2]]), null);
    assert.deepEqual(solveLine(Array(5).fill(ANY), [[1, 2], [1, 2]]), [2, 2, 1, 2, 2]);
  });

  test('an empty clue means an empty line', () => {
    assert.deepEqual(solveLine(Array(3).fill(ANY), []), [1, 1, 1]);
  });

  test('respects cells already decided', () => {
    // [1x1] in 3 cells with the last cell known to be colour 1.
    assert.deepEqual(solveLine([ANY, ANY, 2], [[1, 1]]), [1, 1, 2]);
  });
});

describe('solveNonogram', () => {
  test('solves every seed nonogram from its clues alone, uniquely and without guessing', () => {
    const failing = [];
    for (const data of nonograms) {
      const result = plugin.solve(plugin.computeClues(data));
      if (!result.complete || result.solutions.length !== 1 || !result.logicalOnly ||
          !plugin.validate(data, result.solutions[0])) {
        failing.push(data.name);
      }
    }
    assert.deepEqual(failing, []);
  });

  test('the fixed nonograms had a second solution before the fix', () => {
    const { FIXES, applyFix } = require('../migrations/20261115-02-unique-nonograms');
    assert.deepEqual(FIXES.map(f => f.name), FIXED);
    for (const fix of FIXES) {
      const fixed = nonograms.find(n => n.name === fix.name);
      const old = applyFix(fix, fixed, { from: fix.to, to: fix.from, checkUnique: false });
      const result = plugin.solve(plugin.computeClues(old));
      assert.equal(result.solutions.length, 2, fix.name);
      assert.equal(result.technique, 'search', fix.name);
      assert.equal(plugin.checkSolvable(old).code, 'PUZZLE_NOT_UNIQUE', fix.name);
      assert.equal(plugin.checkSolvable(fixed), null, fix.name);
    }
  });

  test('reports a puzzle without solution', () => {
    // Row clue 2 in a 1-wide grid cannot fit.
    const result = plugin.solve({ rowClues: [[[1, 1]]], columnClues: [[[1, 2]]] });
    assert.deepEqual(result.solutions, []);
    assert.equal(result.complete, true);
  });

  test('finds both solutions of the classic 2x2 diagonal', () => {
    const clues = { rowClues: [[[1, 1]], [[1, 1]]], columnClues: [[[1, 1]], [[1, 1]]] };
    const result = plugin.solve(clues, { limit: 5 });
    assert.equal(result.solutions.length, 2);
    assert.equal(result.logicalOnly, false);
  });

  test('stops at the search budget and says so', () => {
    // 6x6 with one cell per row and column: 720 solutions.
    const one = Array.from({ length: 6 }, () => [[1, 1]]);
    const result = plugin.solve({ rowClues: one, columnClues: one }, { limit: 1000, maxNodes: 10 });
    assert.equal(result.complete, false);
  });

  test('uses contradiction only when line logic is not enough', () => {
    const counts = { line: 0, contradiction: 0, search: 0 };
    for (const data of nonograms) {
      counts[plugin.solve(plugin.computeClues(data)).technique] += 1;
    }
    assert.ok(counts.line > 0 && counts.contradiction > 0);
    assert.equal(counts.search, 0);
  });

  test('gives up after maxMillis and says so', () => {
    // 30x30 with one cell per row and column: far too many solutions to finish.
    const one = Array.from({ length: 30 }, () => [[1, 1]]);
    const started = Date.now();
    const result = plugin.solve({ rowClues: one, columnClues: one }, { limit: 1e9, maxMillis: 200 });
    assert.equal(result.complete, false);
    assert.ok(Date.now() - started < 2000);
  });

  test('a realistic 50x50 puzzle is checked well within the save budget', () => {
    // A filled disc inside a ring: large areas, as people draw them.
    const size = 50;
    const solution = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
      const d = Math.hypot(y - 24.5, x - 24.5);
      return d < 12 ? 1 : (d > 17 && d < 22 ? 2 : 0);
    }));
    const data = { width: size, height: size, colors: ['#000000', '#ff0000', '#ffffff'], solution };
    const started = Date.now();
    assert.equal(plugin.checkSolvable(data), null);
    assert.ok(Date.now() - started < 1000, `took ${Date.now() - started} ms`);
  });
});

describe('checkNonograms script', () => {
  test('finds no problem in the seed', async () => {
    const { problems } = await checkNonograms(nonograms);
    assert.deepEqual(problems, []);
  });
});
