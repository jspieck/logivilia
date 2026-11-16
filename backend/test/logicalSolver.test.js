// Tests for the Logikrätsel solver (shared/puzzles/logicalSolver.js) and the
// rule handling of the logical plugin. Some seed puzzles are formalised by
// hand: their rules must lead to exactly the stored solution.

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const puzzles = require('../puzzles');
const logicals = require('../seed/logicals.json');

let plugin;
let solver;
before(async () => {
  await puzzles.ready;
  plugin = puzzles.getPlugin('logical');
  solver = await import('../../shared/puzzles/logicalSolver.js');
});

const seed = name => {
  const found = logicals.find(l => l.name === name);
  assert.ok(found, name);
  return JSON.parse(JSON.stringify(found));
};
const ref = (attr, value) => ({ attr, value });

// Seed puzzles with every clue formalised. `ordered` marks categories the
// clues compare. (Not 'Asiatische Lektüre': its stored solution contradicts
// its clues, e.g. Asiens Inseln has 105 pages there, the clue says 100.)
const FORMALIZED = [
  {
    name: 'Kongress der Wissenschaft',
    ordered: { 2: 'numeric' },
    rules: [
      // Franziska talks 15 minutes longer than the biologist, who talks 15 longer than Joachim.
      { clue: 0, type: 'differsBy', a: ref(0, 'Franziska'), b: ref(1, 'Biologie'), by: 2, offset: 15 },
      { clue: 0, type: 'differsBy', a: ref(1, 'Biologie'), b: ref(0, 'Joachim'), by: 2, offset: 15 },
      { clue: 1, type: 'differsBy', a: ref(1, 'Geologie'), b: ref(0, 'Angela'), by: 2, offset: 30 },
      // Bertram: 45 minutes shorter or longer than the geography talk.
      { clue: 2, type: 'differsBy', a: ref(0, 'Bertram'), b: ref(1, 'Geographie'), by: 2, offset: 45, abs: true }
    ]
  },
  {
    name: 'Kuriose Spezialitäten',
    ordered: { 2: 'numeric' },
    rules: [
      { clue: 0, type: 'differsBy', a: ref(0, 'Apfel'), b: ref(0, 'Tomate'), by: 2, offset: -1 },
      { clue: 1, type: 'notSame', a: ref(1, 'blau'), b: ref(2, '1€') },
      { clue: 2, type: 'differsBy', a: ref(1, 'schwarz'), b: ref(0, 'Karotte'), by: 2, offset: 1 },
      { clue: 3, type: 'differsBy', a: ref(0, 'Gurke'), b: ref(1, 'rosa'), by: 2, offset: -0.5 }
    ]
  },
  {
    name: 'Konservendosen',
    ordered: { 1: 'numeric' },
    rules: [
      { clue: 0, type: 'differsBy', a: ref(0, 'Lila'), b: ref(0, 'Grün'), by: 1, offset: -2 },
      { clue: 1, type: 'differsBy', a: ref(0, 'Gelb'), b: ref(0, 'Rosa'), by: 1, offset: -2 },
      { clue: 1, type: 'directlyBefore', a: ref(0, 'Rosa'), b: ref(0, 'Rot'), by: 1 },
      { clue: 2, type: 'notSame', a: ref(0, 'Blau'), b: ref(1, '1') }
    ]
  }
];

function formalized ({ name, ordered, rules }) {
  const data = seed(name);
  for (const [attr, mode] of Object.entries(ordered)) data.attributes[attr].ordered = mode;
  data.rules = rules;
  return data;
}

const sameTable = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Three people, three colours, three positions (list order 1 < 2 < 3).
function small (rules) {
  return {
    attributes: [
      { name: 'Name', values: ['Anna', 'Ben', 'Cleo'] },
      { name: 'Farbe', values: ['blau', 'gelb', 'rot'] },
      { name: 'Platz', values: ['links', 'mitte', 'rechts'], ordered: 'list' }
    ],
    rules
  };
}

describe('formalised seed puzzles', () => {
  for (const entry of FORMALIZED) {
    test(`${entry.name} has exactly the stored solution`, () => {
      const data = formalized(entry);
      assert.equal(plugin.checkData(data), null);
      const result = solver.solveLogical(data);
      assert.equal(result.complete, true);
      assert.equal(result.solutions.length, 1);
      assert.ok(sameTable(result.solutions[0], data.solution), JSON.stringify(result.solutions[0]));
      assert.equal(plugin.checkSolvable(data), null);
    });

    test(`${entry.name} becomes ambiguous without its last rule`, () => {
      const data = formalized(entry);
      data.rules = data.rules.slice(0, -1);
      data.clues = data.clues.slice(0, Math.max(...data.rules.map(r => r.clue)) + 1);
      const result = solver.solveLogical(data);
      assert.equal(result.solutions.length, 2);
      assert.equal(result.logicalOnly, false);
    });
  }

  test('Konservendosen needs no guessing', () => {
    const result = solver.solveLogical(formalized(FORMALIZED[2]));
    assert.notEqual(result.technique, 'search');
    assert.equal(result.logicalOnly, true);
  });
});

describe('solveLogical', () => {
  test('finds every solution when there are no rules', () => {
    const result = solver.solveLogical(small([]), { limit: 100 });
    assert.equal(result.solutions.length, 36); // 3! * 3!
    assert.equal(result.technique, 'search');
  });

  test('same and notSame', () => {
    const result = solver.solveLogical(small([
      { type: 'same', a: ref(0, 'Anna'), b: ref(1, 'rot') },
      { type: 'notSame', a: ref(0, 'Ben'), b: ref(1, 'blau') },
      { type: 'same', a: ref(0, 'Anna'), b: ref(2, 'mitte') },
      { type: 'notSame', a: ref(1, 'gelb'), b: ref(2, 'rechts') }
    ]));
    assert.deepEqual(result.solutions, [[
      ['Anna', 'rot', 'mitte'], ['Ben', 'gelb', 'links'], ['Cleo', 'blau', 'rechts']
    ]]);
    assert.equal(result.technique, 'elimination');
  });

  test('eitherOr means exactly one of the two', () => {
    // Anna is blue or on the left, not both; Anna is on the left.
    const result = solver.solveLogical(small([
      { type: 'eitherOr', a: ref(0, 'Anna'), b: ref(1, 'blau'), c: ref(2, 'links') },
      { type: 'same', a: ref(0, 'Anna'), b: ref(2, 'links') }
    ]), { limit: 100 });
    assert.equal(result.solutions.length, 8); // Anna gelb or rot, then 2 x 2 for the others
    assert.ok(result.solutions.every(s => s[0][1] !== 'blau'));
  });

  test('ordered relations along the list order', () => {
    const base = [
      { type: 'directlyBefore', a: ref(0, 'Anna'), b: ref(0, 'Ben'), by: 2 },
      { type: 'after', a: ref(0, 'Anna'), b: ref(0, 'Cleo'), by: 2 }
    ];
    const result = solver.solveLogical(small(base), { limit: 100 });
    // Cleo left, Anna middle, Ben right; colours free.
    assert.equal(result.solutions.length, 6);
    assert.ok(result.solutions.every(s => s[0][2] === 'mitte' && s[1][2] === 'rechts' && s[2][2] === 'links'));

    const nextTo = solver.solveLogical(small([
      { type: 'nextTo', a: ref(0, 'Anna'), b: ref(0, 'Ben'), by: 2 },
      { type: 'nextTo', a: ref(0, 'Anna'), b: ref(0, 'Cleo'), by: 2 }
    ]), { limit: 100 });
    assert.ok(nextTo.solutions.length > 0 && nextTo.solutions.every(s => s[0][2] === 'mitte'));

    const differs = solver.solveLogical(small([
      { type: 'differsBy', a: ref(0, 'Anna'), b: ref(1, 'rot'), by: 2, offset: 2 }
    ]), { limit: 100 });
    assert.ok(differs.solutions.length > 0 && differs.solutions.every(s => s[0][2] === 'rechts' && s.find(r => r[1] === 'rot')[2] === 'links'));
  });

  test('alphabetical order', () => {
    // Nicknames sort Zed < ... the one sorting first is directly before Ben's.
    const result = solver.solveLogical({
      attributes: [
        { name: 'Name', values: ['Anna', 'Ben'] },
        { name: 'Spitzname', values: ['Zora', 'Ada'], ordered: 'alpha' }
      ],
      rules: [{ type: 'before', a: ref(0, 'Ben'), b: ref(0, 'Anna'), by: 1 }]
    });
    assert.deepEqual(result.solutions, [[['Anna', 'Zora'], ['Ben', 'Ada']]]);
  });

  test('reports a contradiction as no solution', () => {
    const result = solver.solveLogical(small([
      { type: 'same', a: ref(0, 'Anna'), b: ref(1, 'rot') },
      { type: 'same', a: ref(0, 'Ben'), b: ref(1, 'rot') }
    ]));
    assert.equal(result.solutions.length, 0);
    assert.equal(result.complete, true);
  });

  test('stops at the node budget', () => {
    const big = {
      attributes: Array.from({ length: 5 }, (_, c) => ({
        name: `K${c}`, values: Array.from({ length: 8 }, (_, v) => `${c}-${v}`)
      })),
      rules: []
    };
    const result = solver.solveLogical(big, { limit: 1e9, maxNodes: 1000 });
    assert.equal(result.complete, false);
  });
});

describe('logical plugin with rules', () => {
  test('old puzzles without rules pass checkData and checkSolvable', () => {
    for (const l of logicals) {
      assert.equal(plugin.checkData(l), null, l.name);
      assert.equal(plugin.checkSolvable(l), null, l.name);
    }
  });

  test('players do not get the rules', () => {
    const data = formalized(FORMALIZED[1]);
    const clues = plugin.computeClues(data);
    assert.equal(clues.rules, undefined);
    assert.equal(clues.solution, undefined);
    assert.equal(clues.attributes[2].ordered, 'numeric');
  });

  test('checkData rejects bad rules', () => {
    const data = formalized(FORMALIZED[1]);
    const withRule = rule => ({ ...data, rules: [rule] });
    assert.match(plugin.checkData(withRule({ clue: 9, type: 'same', a: ref(0, 'Apfel'), b: ref(1, 'blau') })), /clue/);
    assert.match(plugin.checkData(withRule({ clue: 0, type: 'similar', a: ref(0, 'Apfel'), b: ref(1, 'blau') })), /type/);
    assert.match(plugin.checkData(withRule({ clue: 0, type: 'same', a: ref(0, 'Birne'), b: ref(1, 'blau') })), /rule.a/);
    assert.match(plugin.checkData(withRule({ clue: 0, type: 'before', a: ref(0, 'Apfel'), b: ref(1, 'blau'), by: 1 })), /ordered/);
    assert.match(plugin.checkData(withRule({ clue: 0, type: 'differsBy', a: ref(0, 'Apfel'), b: ref(1, 'blau'), by: 2, offset: 0 })), /offset/);
    assert.equal(plugin.checkData({ ...data, rules: 'x' }), 'rules must be a list');
    const badOrder = JSON.parse(JSON.stringify(data));
    badOrder.attributes[1].ordered = 'numeric';
    assert.match(plugin.checkData(badOrder), /ordered category/);
  });

  test('checkSolvable reports a rule the solution breaks', () => {
    const data = formalized(FORMALIZED[1]);
    data.rules = [...data.rules, { clue: 1, type: 'same', a: ref(1, 'blau'), b: ref(0, 'Apfel') }];
    assert.deepEqual(plugin.checkSolvable(data), { code: 'LOGICAL_RULE_BROKEN', params: { clue: 2 } });
  });

  test('checkSolvable rejects ambiguous fully formalised puzzles only', () => {
    const data = formalized(FORMALIZED[1]);
    data.rules = data.rules.filter(r => r.clue !== 3);
    // Clue 4 has no rule: uniqueness is not checked.
    assert.equal(plugin.checkSolvable(data), null);
    data.rules.push({ clue: 3, type: 'notSame', a: ref(0, 'Gurke'), b: ref(1, 'rosa') });
    const problem = plugin.checkSolvable(data);
    assert.equal(problem.code, 'LOGICAL_NOT_UNIQUE');
    assert.ok(problem.params.cells > 0);
  });
});

describe('group rules, times and sum', () => {
  test('exists: "someone who ..."', () => {
    // Anna is directly left of someone in red; Ben is in red.
    const result = solver.solveLogical(small([
      { type: 'exists', var: 'X', rules: [
        { type: 'directlyBefore', a: ref(0, 'Anna'), b: { var: 'X' }, by: 2 },
        { type: 'same', a: { var: 'X' }, b: ref(1, 'rot') }
      ] },
      { type: 'same', a: ref(0, 'Ben'), b: ref(1, 'rot') }
    ]), { limit: 100 });
    assert.ok(result.solutions.length > 0);
    assert.ok(result.solutions.every(s => ['links', 'mitte'].includes(s[0][2]) &&
      ['mitte', 'rechts'].indexOf(s[1][2]) === ['links', 'mitte'].indexOf(s[0][2])));
  });

  test('anyOf, allOf and not', () => {
    const result = solver.solveLogical(small([
      { type: 'anyOf', rules: [
        { type: 'allOf', rules: [{ type: 'same', a: ref(0, 'Anna'), b: ref(1, 'rot') }, { type: 'same', a: ref(0, 'Ben'), b: ref(1, 'gelb') }] },
        { type: 'same', a: ref(0, 'Cleo'), b: ref(1, 'rot') }
      ] },
      { type: 'not', rules: [{ type: 'same', a: ref(0, 'Cleo'), b: ref(1, 'rot') }] }
    ]), { limit: 100 });
    assert.ok(result.solutions.length > 0);
    assert.ok(result.solutions.every(s => s[0][1] === 'rot' && s[1][1] === 'gelb'));
  });

  test('times and sum on numbers', () => {
    const puzzle = rules => ({
      attributes: [
        { name: 'Name', values: ['A', 'B', 'C'] },
        { name: 'Punkte', values: ['10', '20', '30'], ordered: 'numeric' }
      ],
      rules
    });
    assert.deepEqual(solver.solveLogical(puzzle([
      { type: 'times', a: ref(0, 'C'), b: ref(0, 'A'), by: 1, factor: 3 }
    ])).solutions.map(s => s.map(r => r[1])), [['10', '20', '30']]);
    const sums = solver.solveLogical(puzzle([
      { type: 'sum', a: ref(0, 'A'), b: ref(0, 'B'), c: ref(0, 'C'), by: 1 }
    ]), { limit: 10 });
    assert.equal(sums.solutions.length, 2); // A+B = 30 either way round
    assert.ok(sums.solutions.every(s => s[2][1] === '30'));
  });

  test('note rules mark a clue as formalised without a condition', () => {
    const data = formalized(FORMALIZED[1]);
    data.clues = [...data.clues, 'Die Preise gelten pro Stück.'];
    data.rules = [...data.rules, { clue: 4, type: 'note' }];
    assert.equal(plugin.checkData(data), null);
    assert.equal(plugin.checkSolvable(data), null);
  });

  test('reads German thousands separators', () => {
    assert.equal(solver.parseNumber('1.000.000'), 1000000);
    assert.equal(solver.parseNumber('500.000'), 500000);
    assert.equal(solver.parseNumber('1.50€'), 1.5);
    assert.equal(solver.parseNumber('9:00'), 9);
  });

  test('checkData rejects broken group rules', () => {
    const data = formalized(FORMALIZED[1]);
    const withRule = rule => ({ ...data, rules: [{ clue: 0, ...rule }] });
    assert.match(plugin.checkData(withRule({ type: 'anyOf', rules: [] })), /rules/);
    assert.match(plugin.checkData(withRule({ type: 'not', rules: [{ type: 'note' }, { type: 'note' }] })), /exactly one/);
    assert.match(plugin.checkData(withRule({ type: 'same', a: { var: 'X' }, b: ref(1, 'blau') })), /rule.a/);
    assert.match(plugin.checkData(withRule({ type: 'times', a: ref(0, 'Apfel'), b: ref(0, 'Gurke'), by: 2, factor: 1 })), /factor/);
  });
});

describe('seed formalisations (seed/logicalRules.js)', () => {
  // What `node scripts/checkLogicals.js` reports; a change here means a
  // formalisation or the solver changed.
  const NOT_UNIQUE = {
    'Asiatische Lektüre': 'dataError',
    'Kunstfertige Tiere': 'dataError',
    'Werdende Köche': 'dataError',
    'Baum des Jahres': 'conflict',
    'Erfreuliche Pilzsuche': 'conflict',
    'Kaninchenzucht': 'conflict',
    'Fleischhasser unter sich': 'conflict',
    'Stricken auf Zeit': 'conflict',
    'Lieblingsdichter': 'conflict',
    'Hüttenbesuch': 'conflict',
    'Kugeltrikolore': 'partial',
    'Strohsterne': 'partial',
    'Italienische Genüsse': 'ambiguous',
    'Lieferantenchaos': 'ambiguous'
  };

  test('every seed puzzle has an entry, and the rules fit the stored solutions', { timeout: 120000 }, async () => {
    const { checkLogicals } = require('../scripts/checkLogicals');
    const results = await checkLogicals();
    const statuses = Object.fromEntries(results.map(r => [r.name, r.status]));
    for (const r of results) {
      assert.equal(r.status, NOT_UNIQUE[r.name] || 'unique', `${r.name}: ${JSON.stringify(r)}`);
    }
    assert.equal(Object.values(statuses).filter(s => s === 'unique').length, 40);
  });
});
