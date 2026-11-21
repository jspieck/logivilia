// The logic puzzle's helper grid (shared/puzzles/logicalGrid.js): staircase
// geometry, painting with auto-cross, and filling the answer table.

const { test, before } = require('node:test');
const assert = require('node:assert/strict');

let g;
before(async () => {
  g = await import('../../shared/puzzles/logicalGrid.js');
});

// 3 categories of 3 values: 2 x 2 blocks, the bottom-right one unused.
const attributes = [
  { name: 'Name', values: ['Ann', 'Ben', 'Cy'] },
  { name: 'Pet', values: ['cat', 'dog', 'eel'] },
  { name: 'Age', values: ['7', '8', '9'] }
];

test('geometry: staircase of blocks, every category pair once', () => {
  const geo = g.gridGeometry(3, 3);
  assert.equal(geo.blocks, 2);
  assert.equal(geo.size, 6);
  // Columns: categories 1, 2. Rows: category 0, then 2.
  assert.deepEqual([geo.colAttr(0), geo.colAttr(1)], [1, 2]);
  assert.deepEqual([geo.rowAttr(0), geo.rowAttr(1)], [0, 2]);
  assert.ok(geo.isValid(5, 0));
  assert.ok(geo.isValid(2, 5));
  assert.ok(!geo.isValid(3, 3), 'bottom-right block is unused');
  assert.equal(geo.rowLength(0), 6);
  assert.equal(geo.rowLength(4), 3);
  assert.equal(geo.colLength(4), 3);
  assert.equal(g.emptyGrid(geo).length, 36);
  assert.deepEqual(Object.keys(g.emptyInputs(geo)), ['0_0', '0_1', '1_0', '1_1', '2_0', '2_1']);
});

test('a yes crosses out the rest of its row and column in the block', () => {
  const geo = g.gridGeometry(3, 3);
  const cells = g.emptyGrid(geo);
  g.setCell(cells, geo, 1, 1, g.YES, true);
  assert.equal(cells[geo.idx(1, 1)], g.YES);
  for (const [x, y] of [[0, 1], [2, 1], [1, 0], [1, 2]]) {
    assert.equal(cells[geo.idx(x, y)], g.NO, `${x},${y}`);
  }
  // Other blocks and the diagonal stay empty.
  assert.equal(cells[geo.idx(4, 1)], g.EMPTY);
  assert.equal(cells[geo.idx(0, 0)], g.EMPTY);

  const plain = g.emptyGrid(geo);
  g.setCell(plain, geo, 1, 1, g.YES, false);
  assert.equal(plain.filter(v => v !== g.EMPTY).length, 1, 'no auto-cross when off');

  const unused = g.emptyGrid(geo);
  g.setCell(unused, geo, 4, 4, g.YES, true);
  assert.ok(unused.every(v => v === g.EMPTY), 'cells outside the staircase are ignored');
});

test('auto-cross never overwrites marks already there', () => {
  const geo = g.gridGeometry(3, 3);
  const cells = g.emptyGrid(geo);
  g.setCell(cells, geo, 0, 1, g.YES, false);
  g.setCell(cells, geo, 1, 1, g.YES, true);
  assert.equal(cells[geo.idx(0, 1)], g.YES);
});

test('painting a rectangle works on a copy', () => {
  const geo = g.gridGeometry(3, 3);
  const before = g.emptyGrid(geo);
  const after = g.paintRect(before, geo, { x: 2, y: 0 }, { x: 0, y: 1 }, g.NO, true);
  assert.ok(before.every(v => v === g.EMPTY), 'input untouched');
  assert.equal(after.filter(v => v === g.NO).length, 6);
});

test('yes marks in the top block row fill and clear the answer table', () => {
  const geo = g.gridGeometry(3, 3);
  const empty = g.emptyGrid(geo);
  // Row 0 is Ann; column 4 is Age "8" (block column 1, value 1).
  const marked = g.paintRect(empty, geo, { x: 4, y: 0 }, { x: 4, y: 0 }, g.YES, true);
  let inputs = g.syncTable(empty, marked, geo, attributes, g.emptyInputs(geo));
  assert.equal(inputs['0_1'], '8');
  assert.equal(inputs['0_0'], null);

  // Taking the mark back clears the answer...
  const cleared = g.paintRect(marked, geo, { x: 4, y: 0 }, { x: 4, y: 0 }, g.EMPTY, true);
  inputs = g.syncTable(marked, cleared, geo, attributes, inputs);
  assert.equal(inputs['0_1'], null);

  // ...but not one the player changed in the table meanwhile.
  inputs = g.syncTable(empty, marked, geo, attributes, g.emptyInputs(geo));
  inputs['0_1'] = '9';
  inputs = g.syncTable(marked, cleared, geo, attributes, inputs);
  assert.equal(inputs['0_1'], '9');

  // Marks below the top block row do not touch the table.
  const lower = g.paintRect(empty, geo, { x: 0, y: 4 }, { x: 0, y: 4 }, g.YES, true);
  assert.deepEqual(g.syncTable(empty, lower, geo, attributes, g.emptyInputs(geo)), g.emptyInputs(geo));
});

test('isGrid accepts only grids of the right size and values', () => {
  const geo = g.gridGeometry(3, 3);
  assert.ok(g.isGrid(g.emptyGrid(geo), geo));
  assert.ok(!g.isGrid(new Array(35).fill(0), geo));
  assert.ok(!g.isGrid([...new Array(35).fill(0), 3], geo));
  assert.ok(!g.isGrid('nope', geo));
});
