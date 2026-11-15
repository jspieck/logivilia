// Tests for the player-side nonogram logic (shared/puzzles/nonogramPlay.js)
// behind the nonogram board: clue crossing, hints, mistakes and drags.

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const puzzles = require('../puzzles');
const nonograms = require('../seed/nonograms.json');

let play;
let plugin;
before(async () => {
  await puzzles.ready;
  plugin = puzzles.getPlugin('nonogram');
  play = await import('../../shared/puzzles/nonogramPlay.js');
});

const U = -1; // unknown

describe('lineStatus', () => {
  test('crosses off blocks closed from either edge', () => {
    // Clues 2 1 2 in 9 cells; the first block is closed by a dot and the
    // edge, the last by a dot and the other edge.
    const status = play.lineStatus([1, 1, 0, U, U, U, 0, 1, 1], [[1, 2], [1, 1], [1, 2]]);
    assert.deepEqual(status.done, [true, false, true]);
    assert.equal(status.complete, false);
    assert.equal(status.error, false);
  });

  test('a block touching an unknown cell is not crossed off yet', () => {
    // It could still grow: first block 2 or 3 long.
    assert.deepEqual(play.lineStatus([1, 1, U, U, U, U], [[1, 2], [1, 1]]).done, [false, false]);
    assert.deepEqual(play.lineStatus([1, 1, U, U, U, 1], [[1, 2], [1, 2]]).done, [false, false]);
  });

  test('a matching line is complete, unknown cells count as empty', () => {
    const status = play.lineStatus([U, 1, 1, U], [[1, 2]]);
    assert.equal(status.complete, true);
    assert.deepEqual(status.done, [true]);
  });

  test('reports a line that can no longer match', () => {
    assert.equal(play.lineStatus([1, 1, 1, U], [[1, 2]]).error, true);
    assert.equal(play.lineStatus([0, 0, 0, U], [[1, 2]]).error, true);
  });

  test('colours must match', () => {
    assert.deepEqual(play.lineStatus([2, 2, 0, U], [[1, 2]]).done, [false]);
    assert.equal(play.lineStatus([2, 2, 0, U], [[1, 2]]).error, true);
  });
});

describe('nextHint', () => {
  const clues = data => {
    const { rowClues, columnClues } = plugin.computeClues(data);
    return { rowClues, columnClues };
  };

  test('repeated hints solve every line-solvable seed nonogram', () => {
    for (const data of nonograms) {
      const c = clues(data);
      const result = plugin.solve(c);
      if (result.technique !== 'line') continue;
      let state = new Array(c.rowClues.length * c.columnClues.length).fill(U);
      for (let guard = 0; guard < 1000; guard++) {
        const hint = play.nextHint(state, c);
        if (hint.kind !== 'line' && hint.kind !== 'cross') {
          assert.equal(hint.kind, 'solved', data.name);
          break;
        }
        state = [...state];
        const cells = hint.kind === 'line' ? hint.cells : [hint];
        for (const { x, y, value } of cells) state[y * c.columnClues.length + x] = value;
      }
      assert.deepEqual(state, result.solutions[0].flat(), data.name);
    }
  });

  test('points at a line that contradicts its clues', () => {
    const c = { rowClues: [[[1, 1]], []], columnClues: [[[1, 1]], []] };
    const hint = play.nextHint([1, 1, U, U], c);
    assert.deepEqual([hint.kind, hint.axis, hint.index], ['error', 'row', 0]);
  });
});

describe('mistakes', () => {
  test('finds wrong fills and wrong dots, ignores unknown cells', () => {
    const data = nonograms[0];
    const c = plugin.computeClues(data);
    const solution = play.solutionFromClues(c);
    assert.deepEqual(solution, data.solution.flat());
    const state = new Array(solution.length).fill(U);
    state[0] = 1; // solution 0
    state[1] = 0; // solution 1
    state[2] = 1; // correct
    assert.deepEqual(play.wrongCells(state, solution), [0, 1]);
  });
});

describe('drag', () => {
  test('follows the axis the pointer moved further along', () => {
    assert.deepEqual(play.dragLine({ x: 1, y: 1 }, { x: 4, y: 2 }), [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }
    ]);
    assert.deepEqual(play.dragLine({ x: 2, y: 3 }, { x: 2, y: 1 }), [
      { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 1 }
    ]);
  });

  test('setting fills only unknown cells after the first; clearing removes only that value', () => {
    const state = [U, 0, U, 2, U];
    const cells = [0, 1, 2, 3, 4].map(x => ({ x, y: 0 }));
    const set = play.dragAction(state[0], 1);
    assert.deepEqual(set, { mode: 'set', value: 1 });
    assert.deepEqual(play.applyDrag(state, 5, cells, set), [1, 0, 1, 2, 1]);

    const filled = [1, 1, 0, 1, U];
    const clear = play.dragAction(filled[0], 1);
    assert.deepEqual(clear, { mode: 'clear', value: 1 });
    assert.deepEqual(play.applyDrag(filled, 5, cells, clear), [U, U, 0, U, U]);
  });

  test('the pressed cell is always set, so a wrong cell can be corrected', () => {
    assert.deepEqual(play.applyDrag([1, U], 2, [{ x: 0, y: 0 }], play.dragAction(1, 0)), [0, U]);
  });
});
