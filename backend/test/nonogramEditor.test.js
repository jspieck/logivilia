// Tests for the nonogram editor logic (shared/puzzles/nonogramEditor.js):
// drawing tools, image import, analysis and fix suggestions.

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

let ed;
before(async () => {
  ed = await import('../../shared/puzzles/nonogramEditor.js');
});

describe('drawing tools', () => {
  test('lineCells covers every cell of a diagonal and a straight line', () => {
    assert.deepEqual(ed.lineCells({ x: 0, y: 0 }, { x: 3, y: 3 }).map(c => [c.x, c.y]), [[0, 0], [1, 1], [2, 2], [3, 3]]);
    assert.equal(ed.lineCells({ x: 4, y: 1 }, { x: 0, y: 1 }).length, 5);
  });

  test('rectCells fills or outlines', () => {
    assert.equal(ed.rectCells({ x: 0, y: 0 }, { x: 2, y: 2 }).length, 9);
    assert.equal(ed.rectCells({ x: 2, y: 2 }, { x: 0, y: 0 }, false).length, 8);
  });

  test('floodFill fills only the connected area of one colour', () => {
    const grid = [
      [0, 0, 1],
      [1, 0, 1],
      [0, 1, 0]
    ];
    assert.deepEqual(ed.floodFill(grid, 0, 0, 2), [
      [2, 2, 1],
      [1, 2, 1],
      [0, 1, 0]
    ]);
    assert.deepEqual(grid[0], [0, 0, 1], 'the input is not changed');
  });

  test('resize keeps the picture centred', () => {
    assert.deepEqual(ed.resize([[1]], 3, 3), [[0, 0, 0], [0, 1, 0], [0, 0, 0]]);
    assert.deepEqual(ed.resize([[0, 0, 0], [0, 1, 0], [0, 0, 0]], 1, 1), [[1]]);
  });

  test('shift, flip and removeColour', () => {
    assert.deepEqual(ed.shift([[1, 0], [0, 0]], 1, 1), [[0, 0], [0, 1]]);
    assert.deepEqual(ed.flipHorizontal([[1, 2, 0]]), [[0, 2, 1]]);
    assert.deepEqual(ed.flipVertical([[1], [2]]), [[2], [1]]);
    assert.deepEqual(ed.removeColour([[1, 2, 3]], 2), [[1, 0, 2]]);
  });
});

describe('quantizeImage', () => {
  // A 4x4 image: white border, red and blue blocks inside.
  const rgba = (r, g, b) => [r, g, b, 255];
  const W = rgba(255, 255, 255);
  const R = rgba(200, 30, 30);
  const B = rgba(20, 60, 200);
  const image = [
    W, W, W, W,
    W, R, R, W,
    W, B, B, W,
    W, B, B, W
  ].flat();

  test('finds the colours and makes the border colour the background', () => {
    const { grid, colors } = ed.quantizeImage(image, 4, 4, 2);
    assert.equal(colors.length, 3);
    assert.equal(colors[2], '#ffffff');
    // Blue covers more cells than red, so it is colour 1.
    assert.deepEqual(grid, [[0, 0, 0, 0], [0, 2, 2, 0], [0, 1, 1, 0], [0, 1, 1, 0]]);
  });

  test('with one colour, everything that is not background becomes colour 1', () => {
    const { grid, colors } = ed.quantizeImage(image, 4, 4, 1);
    assert.equal(colors.length, 2);
    assert.deepEqual(grid, [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 1, 1, 0]]);
  });

  test('transparent pixels count as white', () => {
    const transparent = [0, 0, 0, 0];
    const img = [transparent, R, transparent, R].flat();
    const { grid } = ed.quantizeImage(img, 2, 2, 1);
    assert.deepEqual(grid, [[0, 1], [0, 1]]);
  });
});

describe('analysis', () => {
  test('empty, unique and ambiguous drawings', () => {
    assert.equal(ed.analyze(ed.blankGrid(5, 5)).status, 'empty');

    const square = ed.paint(ed.blankGrid(5, 5), ed.rectCells({ x: 1, y: 1 }, { x: 3, y: 3 }), 1);
    const unique = ed.analyze(square);
    assert.equal(unique.status, 'unique');
    assert.equal(unique.technique, 'line');
    assert.equal(unique.difficulty, 1);

    const diagonal = ed.paint(ed.blankGrid(5, 5), [{ x: 1, y: 1 }, { x: 2, y: 2 }], 1);
    const ambiguous = ed.analyze(diagonal);
    assert.equal(ambiguous.status, 'ambiguous');
    assert.deepEqual(ambiguous.cells.map(c => [c.x, c.y]).sort(), [[1, 1], [1, 2], [2, 1], [2, 2]]);
    assert.deepEqual(ambiguous.other[1][2], 1, 'the other solution swaps the diagonal');
  });

  test('suggestFixes returns one-cell changes that make it unique', () => {
    const diagonal = ed.paint(ed.blankGrid(5, 5), [{ x: 1, y: 1 }, { x: 2, y: 2 }], 1);
    const { cells } = ed.analyze(diagonal);
    const fixes = ed.suggestFixes(diagonal, cells);
    assert.ok(fixes.length > 0);
    for (const fix of fixes) {
      const fixed = ed.paint(diagonal, [fix], fix.value);
      assert.equal(ed.analyze(fixed).status, 'unique', JSON.stringify(fix));
    }
  });

  test('suggested difficulty grows with size, technique and colours', () => {
    const d = info => ed.suggestDifficulty({ width: 10, height: 10, colourCount: 1, technique: 'line', ...info });
    assert.equal(d({}), 1);
    assert.equal(d({ width: 20, height: 20 }), 3);
    assert.equal(d({ technique: 'contradiction' }), 2);
    assert.equal(d({ width: 30, height: 30, technique: 'contradiction', colourCount: 3 }), 5);
  });
});
