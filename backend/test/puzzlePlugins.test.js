// Unit tests for the puzzle-type plugins (shared/puzzles), run against every
// seed puzzle. If a puzzle's own solution stops passing, either the plugin or
// the data broke. The seed rows have the plugins' data fields at top level,
// so they can be passed to the plugins as `data` directly.

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const puzzles = require('../puzzles');
const { cropSolution, needsCrop } = require('../scripts/fixNonogramSizes');
const nonograms = require('../seed/nonograms.json');
const linelogs = require('../seed/linelogs.json');
const logicals = require('../seed/logicals.json');

let plugins;
before(async () => {
  await puzzles.ready;
  plugins = {
    nonogram: puzzles.getPlugin('nonogram'),
    linelog: puzzles.getPlugin('linelog'),
    logical: puzzles.getPlugin('logical')
  };
});

const verifyNonogram = (data, answer) => plugins.nonogram.validate(data, answer);
const verifyLinelog = (data, answer) => plugins.linelog.validate(data, answer);
const verifyLogical = (data, answer) => plugins.logical.validate(data, answer);
const nonogramClues = data => {
  const { rowClues, columnClues } = plugins.nonogram.computeClues(data);
  return { rowClues, columnClues };
};
const linelogInformationColors = data => plugins.linelog.computeClues(data).informationColors;

const blank = (height, width) => Array.from({ length: height }, () => Array(width).fill(0));
const clone = grid => grid.map(row => [...row]);

describe('verifyNonogram', () => {
  test('every seed nonogram accepts its own solution', () => {
    const failing = nonograms
      .filter(n => !verifyNonogram(n, cropSolution(n)))
      .map(n => n.name);
    assert.deepEqual(failing, []);
  });

  test('a blank grid never passes', () => {
    const passing = nonograms
      .filter(n => verifyNonogram(n, blank(Number(n.height), Number(n.width))))
      .map(n => n.name);
    assert.deepEqual(passing, []);
  });

  test('flipping one filled cell to empty fails', () => {
    for (const n of nonograms) {
      const grid = cropSolution(n);
      const y = grid.findIndex(row => row.some(cell => cell > 0));
      const x = grid[y].findIndex(cell => cell > 0);
      grid[y][x] = 0;
      assert.equal(verifyNonogram(n, grid), false, n.name);
    }
  });

  test('rejects grids of the wrong size or shape', () => {
    const n = nonograms[0];
    const grid = cropSolution(n);
    assert.equal(verifyNonogram(n, grid.slice(1)), false);
    assert.equal(verifyNonogram(n, grid.map(row => row.slice(1))), false);
    assert.equal(verifyNonogram(n, null), false);
    assert.equal(verifyNonogram(n, 'not a grid'), false);
  });

  test('accepts a different grid that satisfies all clues', () => {
    // 2x2 with clue "1" in every row and column: both diagonals are valid.
    const puzzle = { width: 2, height: 2, colors: ['#000', '#fff'], solution: [[1, 0], [0, 1]] };
    assert.equal(verifyNonogram(puzzle, [[0, 1], [1, 0]]), true);
  });

  test('the seed data has no cells outside the declared size', () => {
    assert.deepEqual(nonograms.filter(needsCrop).map(n => n.name), []);
  });
});

describe('verifyLinelog', () => {
  test('every seed linelog accepts its own solution', () => {
    const failing = linelogs.filter(l => !verifyLinelog(l, clone(l.solution))).map(l => l.name);
    assert.deepEqual(failing, []);
  });

  test('changing one cell fails', () => {
    for (const l of linelogs) {
      const grid = clone(l.solution);
      grid[0][0] = Number(grid[0][0]) === 0 ? 1 : 0;
      assert.equal(verifyLinelog(l, grid), false, l.name);
    }
  });

  test('a blank grid never passes', () => {
    const passing = linelogs
      .filter(l => verifyLinelog(l, blank(l.solution.length, l.solution[0].length)))
      .map(l => l.name);
    assert.deepEqual(passing, []);
  });
});

describe('verifyLogical', () => {
  test('every seed logical accepts its own solution', () => {
    const failing = logicals
      .filter(l => !verifyLogical(l, l.solution.map(row => [...row])))
      .map(l => l.name);
    assert.deepEqual(failing, []);
  });

  test('swapping two values in a column fails', () => {
    for (const l of logicals) {
      const table = l.solution.map(row => [...row]);
      const col = table[0].findIndex((cell, j) => j > 0 && String(cell) !== String(table[1][j]));
      if (col === -1) continue;
      [table[0][col], table[1][col]] = [table[1][col], table[0][col]];
      assert.equal(verifyLogical(l, table), false, l.name);
    }
  });

  test('rejects missing or malformed tables', () => {
    const l = logicals[0];
    assert.equal(verifyLogical(l, undefined), false);
    assert.equal(verifyLogical(l, []), false);
    assert.equal(verifyLogical(l, l.solution.slice(1)), false);
  });
});

describe('cropSolution', () => {
  test('cuts rows and columns beyond the declared size', () => {
    const puzzle = { width: 2, height: 2, solution: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] };
    assert.equal(needsCrop(puzzle), true);
    assert.deepEqual(cropSolution(puzzle), [[1, 2], [4, 5]]);
  });

  test('leaves correctly sized puzzles alone', () => {
    const puzzle = { width: 2, height: 1, solution: [[1, 0]] };
    assert.equal(needsCrop(puzzle), false);
    assert.deepEqual(cropSolution(puzzle), [[1, 0]]);
  });
});

describe('clues sent to players', () => {
  test('every seed nonogram has one clue line per row and column', () => {
    for (const n of nonograms) {
      const { rowClues, columnClues } = nonogramClues(n);
      assert.equal(rowClues.length, Number(n.height), n.name);
      assert.equal(columnClues.length, Number(n.width), n.name);
    }
  });

  test('clues of a small two-colour nonogram', () => {
    // rows [1,1,0] and [0,2,2]
    const puzzle = { width: 3, height: 2, colors: ['#000', '#f00', '#fff'], solution: [[1, 1, 0], [0, 2, 2]] };
    assert.deepEqual(nonogramClues(puzzle), {
      rowClues: [[[1, 2]], [[2, 2]]],
      columnClues: [[[1, 1]], [[1, 1], [2, 1]], [[2, 1]]]
    });
  });

  test('linelog clue colours match the solution on numbered cells only', () => {
    for (const l of linelogs) {
      const colours = linelogInformationColors(l);
      l.information.forEach((row, y) => row.forEach((cell, x) => {
        assert.equal(colours[y][x], cell !== 0 ? l.solution[y][x] : 0, l.name);
      }));
    }
  });

  test('a logical ignores the row label column', () => {
    const l = logicals[0];
    const table = l.solution.map(row => ['label', ...row.slice(1)]);
    assert.equal(verifyLogical(l, table), true);
  });
});

describe('plugin contract', () => {
  const seeds = () => ({ nonogram: nonograms, linelog: linelogs, logical: logicals });

  test('every seed puzzle passes checkData', () => {
    for (const [type, rows] of Object.entries(seeds())) {
      const failing = rows.filter(row => plugins[type].checkData(row)).map(row => row.name);
      assert.deepEqual(failing, [], type);
    }
  });

  test('computeClues never contains the solution', () => {
    for (const [type, rows] of Object.entries(seeds())) {
      for (const row of rows) {
        assert.equal('solution' in plugins[type].computeClues(row), false, `${type} ${row.name}`);
      }
    }
  });

  test('checkData rejects incomplete puzzles', () => {
    assert.ok(plugins.nonogram.checkData({}));
    assert.ok(plugins.nonogram.checkData({ width: 2, height: 2, colors: ['#fff', '#000'], solution: [[0, 0], [0, 0]] }));
    assert.ok(plugins.nonogram.checkData({ width: 2, height: 2, colors: ['#fff', '#000'], solution: [[1, 5], [0, 0]] }));
    assert.equal(plugins.nonogram.checkData({ width: 2, height: 1, colors: ['#fff', '#000'], solution: [[1, 0]] }), null);
    assert.ok(plugins.linelog.checkData({ width: 2, height: 1, colors: ['#fff', '#000'], information: [[1]], solution: [[1, 0]] }));
    assert.ok(plugins.logical.checkData({ attributes: [{ name: 'a', values: ['x', 'y'] }], clues: [], solution: [] }));
  });

  test('logical images must be local files under /images/logicals/', () => {
    const base = {
      attributes: [{ name: 'a', values: ['x', 'y'] }, { name: 'b', values: ['1', '2'] }],
      clues: [],
      solution: [['x', '1'], ['y', '2']]
    };
    const check = image => plugins.logical.checkData({ ...base, image });
    for (const ok of [undefined, null, '', '/images/logicals/2014/06/buecher-640x372.jpg',
      '/images/logicals/pixabay/weimar-806851_960_720.jpg']) {
      assert.equal(check(ok), null, String(ok));
    }
    for (const bad of ['https://evil.example/pixel.gif', '//evil.example/x.png', 'javascript:alert(1)',
      '/images/logicals/../../api/users.png', '/images/logicals/x.html', '/api/x.png', 42, { src: 'x' },
      `/images/logicals/${'a'.repeat(200)}.jpg`]) {
      assert.ok(check(bad), String(bad));
    }
    // Every seed image passes.
    for (const file of ['logicals.json', 'logicalsComplete.json']) {
      for (const puzzle of require(`../seed/${file}`)) {
        assert.equal(check(puzzle.image), null, `${file}: ${puzzle.name}`);
      }
    }
  });

  test('every plugin declares the shared interface', () => {
    for (const type of puzzles.PUZZLE_TYPES) {
      const plugin = plugins[type];
      assert.equal(plugin.type, type);
      assert.ok(Array.isArray(plugin.dataFields) && plugin.dataFields.includes('solution'), type);
      for (const fn of ['checkData', 'computeClues', 'validate']) {
        assert.equal(typeof plugin[fn], 'function', `${type}.${fn}`);
      }
    }
  });
});
