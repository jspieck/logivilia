// Tests for the linelog solver and editor logic (shared/puzzles/linelogSolver.js,
// shared/puzzles/linelogEditor.js): uniqueness by picture, the generator,
// rebuilding the paths of saved puzzles.

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const seeds = require('../seed/linelogs.json');

let solver, ed, linelog;
before(async () => {
  solver = await import('../../shared/puzzles/linelogSolver.js');
  ed = await import('../../shared/puzzles/linelogEditor.js');
  linelog = (await import('../../shared/puzzles/linelog.js')).default;
});

const pictureOf = p => p.solution.map(row => row.map(Number));
const seed = id => seeds.find(s => String(s.id) === id);
const clues = (picture, paths) => ({ width: picture[0].length, height: picture.length, ...ed.informationOf(picture, paths) });

describe('solveLinelog', () => {
  test('a single straight path is unique', () => {
    const picture = [[1, 1, 1]];
    const result = solver.solveLinelog(clues(picture, [[[0, 0], [1, 0], [2, 0]]]), { target: picture });
    assert.equal(result.status, 'unique');
    assert.deepEqual(result.solution, picture);
  });

  test('finds the other way round a corner', () => {
    const picture = [[1, 1], [0, 1]];
    const result = solver.solveLinelog(clues(picture, [[[0, 0], [1, 0], [1, 1]]]), { target: picture });
    assert.equal(result.status, 'ambiguous');
    assert.deepEqual(result.other, [[1, 0], [1, 1]]);
  });

  test('paths that only swap partners inside one colour are not another solution', () => {
    // Four 2s in a 2x2 block pair up across or down: the picture is the same.
    const picture = [[1, 1], [1, 1]];
    const result = solver.solveLinelog(clues(picture, [[[0, 0], [1, 0]], [[0, 1], [1, 1]]]), { target: picture });
    assert.equal(result.status, 'unique');
  });

  test('without a target it compares the solutions with each other', () => {
    const picture = [[1, 1], [0, 1]];
    const result = solver.solveLinelog(clues(picture, [[[0, 0], [1, 0], [1, 1]]]));
    assert.equal(result.status, 'ambiguous');
  });

  test('numbers that cannot be joined have no solution', () => {
    const result = solver.solveLinelog({ width: 3, height: 1, information: [[2, 0, 2]], informationColors: [[1, 0, 1]] });
    assert.equal(result.status, 'none');
  });

  test('stops at the node budget', () => {
    const p = seed('81');
    const result = solver.solveLinelog(linelog.computeClues(p), { target: pictureOf(p), maxNodes: 1000 });
    assert.equal(result.status, 'too-complex');
  });

  test('seed puzzles: none is ambiguous, all but the largest are proven unique', () => {
    // Seeds 13 and 18 were ambiguous until migration 20261115-04 split a path.
    const counts = {};
    for (const p of seeds) {
      const result = solver.solveLinelog(linelog.computeClues(p), { target: pictureOf(p), maxMillis: 2000 });
      counts[result.status] = (counts[result.status] || 0) + 1;
      assert.notEqual(result.status, 'ambiguous', `seed ${p.id}`);
    }
    assert.equal(counts.none, undefined, 'every seed picture can be drawn from its numbers');
    assert.ok(counts.unique >= 84, JSON.stringify(counts));
  });

  test('the fixes for seeds 13 and 18 turn ambiguous puzzles unique', async () => {
    await require('../puzzles').ready;
    const { FIXES, applyFix } = require('../migrations/20261115-04-unique-linelogs');
    for (const fix of FIXES) {
      const fixed = seeds.find(s => s.name === fix.name);
      const before = applyFix(fix, fixed, { reverse: true });
      assert.ok(before, fix.name);
      assert.equal(linelog.checkSolvable(before)?.code, 'PUZZLE_NOT_UNIQUE', `${fix.name} before`);
      assert.equal(linelog.checkSolvable(fixed), null, `${fix.name} after`);
      assert.deepEqual(applyFix(fix, before).information, fixed.information.map(row => row.map(Number)));
      assert.equal(applyFix(fix, fixed), null, 'an already fixed puzzle is left alone');
    }
  });
});

describe('linelog editor', () => {
  test('informationOf puts the length on both path ends and 1s on lone cells', () => {
    const picture = [[1, 1, 1, 0, 2]];
    const { information, informationColors } = ed.informationOf(picture, [[[0, 0], [1, 0], [2, 0]]]);
    assert.deepEqual(information, [[3, 0, 3, 0, 1]]);
    assert.deepEqual(informationColors, [[1, 0, 1, 0, 2]]);
  });

  test('cleanPaths drops paths that no longer fit the picture', () => {
    const picture = [[1, 1, 2], [1, 0, 2]];
    const kept = ed.cleanPaths(picture, [
      [[0, 0], [1, 0]], // fine
      [[1, 0], [0, 0]], // overlaps the first
      [[1, 0], [2, 0]], // two colours
      [[0, 1], [1, 1]], // over background
      [[2, 0], [2, 1]], // fine
      [[0, 1], [0, 2]] // off the grid
    ]);
    assert.deepEqual(kept, [[[0, 0], [1, 0]], [[2, 0], [2, 1]]]);
  });

  test('path transforms follow the picture transforms', () => {
    const paths = [[[0, 0], [1, 0]]];
    assert.deepEqual(ed.mapPaths(paths, ed.pathTransforms.flipHorizontal(3)), [[[2, 0], [1, 0]]]);
    assert.deepEqual(ed.mapPaths(paths, ed.pathTransforms.shift(3, 1, 1, 0)), [[[1, 0], [2, 0]]]);
    assert.deepEqual(ed.mapPaths(paths, ed.pathTransforms.shift(3, 1, -1, 0)), [], 'moved off the grid');
  });

  test('analyze reports the cells and the paths of another solution', () => {
    const picture = [[1, 1], [0, 1]];
    const result = ed.analyze(picture, [[[0, 0], [1, 0], [1, 1]]]);
    assert.equal(result.status, 'ambiguous');
    assert.deepEqual(result.cells, [{ x: 1, y: 0 }, { x: 0, y: 1 }]);
    assert.deepEqual(result.conflicts, [0]);
    assert.equal(ed.analyze([[0, 0]], []).status, 'empty');
  });

  test('generate turns seed pictures into unique puzzles with few 1s', () => {
    for (const id of ['1', '13', '50', '73']) {
      const picture = pictureOf(seed(id));
      const { paths, complete } = ed.generate(picture, [], { maxNumber: 10, seed: 3 });
      assert.ok(complete, `seed ${id} finished`);
      assert.ok(paths.every(p => p.length <= 10), 'respects the largest number');
      assert.deepEqual(ed.cleanPaths(picture, paths), paths, 'paths fit the picture');
      assert.equal(ed.analyze(picture, paths).status, 'unique', `seed ${id} unique`);
      const coloured = picture.flat().filter(Boolean).length;
      const ones = ed.informationOf(picture, paths).information.flat().filter(n => n === 1).length;
      assert.ok(ones < coloured / 4, `seed ${id}: ${ones} of ${coloured} cells stay 1s`);
    }
  });

  test('generate keeps the paths an author drew (or extends them)', () => {
    const picture = [[1, 1, 1, 0, 1, 1, 1, 1]];
    const own = [[0, 0], [1, 0], [2, 0]];
    const { paths } = ed.generate(picture, [own], { seed: 1 });
    assert.ok(paths.some(p => JSON.stringify(p) === JSON.stringify(own)), JSON.stringify(paths));
  });

  test('layoutFor rebuilds the paths of every seed puzzle', () => {
    for (const p of seeds) {
      const picture = pictureOf(p);
      const information = p.information.map(row => row.map(Number));
      const paths = ed.layoutFor(picture, information);
      assert.ok(paths, `seed ${p.id}`);
      assert.deepEqual(ed.informationOf(picture, paths).information, information, `seed ${p.id}`);
    }
  });
});
