// Logical (logic grid / zebra puzzle).
// data: { description, question, clues, attributes, solution, image, rules }
// solution: one row per value of the first attribute (that value in column 0),
// then the matching value of every other attribute.
// attributes: { name, values, ordered? } - `ordered` ('numeric' | 'list' |
// 'alpha') marks a category whose values have an order that clues can use
// (before/after, next to, differs by N); see logicalSolver.js.
// rules (optional): formal versions of the clues, each { clue, type, ... }
// with `clue` the index into `clues`. When every clue has at least one rule,
// the solver checks that they lead to exactly one solution. Older puzzles
// have only the free-text clues.

import { solveLogical, ruleProblem, brokenRules, orderMode, orderKeys, ORDER_MODES } from './logicalSolver.js';

// Time the uniqueness check may take when a puzzle is saved.
const SOLVABLE_CHECK_MILLIS = 3000;

/** @param {any} data */
const rulesOf = data => (Array.isArray(data.rules) ? data.rules : []);

/** True when every clue has at least one rule, so uniqueness can be checked. */
export function fullyFormalized (data) {
  const clueCount = Array.isArray(data.clues) ? data.clues.length : 0;
  const covered = new Set(rulesOf(data).map(rule => rule.clue));
  return clueCount > 0 && Array.from({ length: clueCount }, (_, i) => covered.has(i)).every(Boolean);
}

// Rules players may see as "relations" under the clues: the plain ones that
// restate a clue. Left out: `exists`, `not`, nested groups and long `anyOf`
// lists (pairs expanded from world knowledge such as name lengths), which
// would say more than the clue's text or be unreadable as a picture.
const SIMPLE_TYPES = ['same', 'notSame', 'eitherOr', 'before', 'after', 'directlyBefore', 'directlyAfter',
  'nextTo', 'differsBy', 'times', 'sum'];
const MAX_ANY_OF = 4;
const isPlainRef = ref => !!ref && typeof ref === 'object' && Number.isInteger(ref.attr);

function simpleRelation (rule) {
  if (!rule || !SIMPLE_TYPES.includes(rule.type)) return null;
  const refs = rule.type === 'eitherOr' || rule.type === 'sum' ? ['a', 'b', 'c'] : ['a', 'b'];
  if (!refs.every(key => isPlainRef(rule[key]))) return null;
  const out = { type: rule.type };
  for (const key of refs) out[key] = { attr: rule[key].attr, value: String(rule[key].value) };
  for (const key of ['by', 'offset', 'abs', 'factor']) {
    if (rule[key] !== undefined) out[key] = rule[key];
  }
  return out;
}

/**
 * The formal rules as players may see them (see SIMPLE_TYPES above), each
 * with its `clue` index. Clues whose rules are all left out get none.
 * @returns {import('../index').LogicalRule[]}
 */
export function publicRelations (data) {
  const relations = [];
  for (const rule of rulesOf(data)) {
    if (!rule || !Number.isInteger(rule.clue)) continue;
    let relation = simpleRelation(rule);
    if (!relation && rule.type === 'anyOf' && Array.isArray(rule.rules) && rule.rules.length <= MAX_ANY_OF) {
      const options = rule.rules.map(simpleRelation);
      if (options.every(Boolean)) relation = { type: 'anyOf', rules: options };
    }
    if (relation) relations.push({ clue: rule.clue, ...relation });
  }
  return relations;
}

const LOCAL_IMAGE = /^\/images\/logicals\/[A-Za-z0-9._\/-]+\.(?:jpe?g|png|webp|gif|svg)$/i;

/** @type {import('../index').PuzzleTypePlugin<'logical'>} */
const logical = {
  type: 'logical',
  dataFields: ['description', 'question', 'clues', 'attributes', 'solution', 'image', 'rules'],

  checkData (data) {
    const { attributes, solution, clues, rules, image } = data;
    // Header images ship with the frontend; links to other sites (tracking
    // pixels, hot-linked pictures) are refused, and the CSP blocks them too.
    if (image != null && image !== '' &&
        (typeof image !== 'string' || image.length > 200 || !LOCAL_IMAGE.test(image) || image.includes('..'))) {
      return 'image must be empty or a path under /images/logicals/';
    }
    if (!Array.isArray(attributes) || attributes.length < 2) {
      return 'attributes must list at least two categories';
    }
    const valueCount = Array.isArray(attributes[0]?.values) ? attributes[0].values.length : 0;
    if (valueCount < 2 || !attributes.every(a =>
      a && typeof a.name === 'string' && Array.isArray(a.values) && a.values.length === valueCount)) {
      return 'every attribute needs a name and the same number of values';
    }
    for (const a of attributes) {
      if (a.ordered != null && a.ordered !== false && a.ordered !== true && !ORDER_MODES.includes(a.ordered)) {
        return `attribute ordered must be one of ${ORDER_MODES.join(', ')}`;
      }
      if (orderMode(a) && !orderKeys(a)) {
        return `the values of the ordered category "${a.name}" must be distinct (and numbers if numeric)`;
      }
    }
    if (!Array.isArray(clues) || !clues.every(c => typeof c === 'string')) {
      return 'clues must be a list of strings';
    }
    if (!Array.isArray(solution) || solution.length !== valueCount ||
        !solution.every(row => Array.isArray(row) && row.length === attributes.length)) {
      return 'solution must have one row per value and one column per attribute';
    }
    if (rules != null) {
      if (!Array.isArray(rules) || rules.length > 500) {
        return 'rules must be a list';
      }
      for (const rule of rules) {
        const clue = rule && rule.clue;
        if (typeof clue !== 'number' || !Number.isInteger(clue) || clue < 0 || clue >= clues.length) {
          return 'every rule needs the index of its clue';
        }
        const problem = ruleProblem(rule, attributes);
        if (problem) {
          return problem;
        }
      }
    }
    return null;
  },

  computeClues (data) {
    const { solution, rules, ...rest } = data;
    const relations = publicRelations(data);
    return relations.length ? { ...rest, relations } : rest;
  },

  // Rows in the same order, values compared as strings. Column 0 is the fixed
  // row label, not player input, so it is not compared.
  validate (data, answer) {
    const solution = data.solution;
    if (!Array.isArray(solution) || !Array.isArray(answer) || answer.length !== solution.length) {
      return false;
    }
    return solution.every((row, i) =>
      Array.isArray(answer[i]) &&
      answer[i].length === row.length &&
      row.every((cell, j) => j === 0 || String(cell) === String(answer[i][j]))
    );
  },

  // Rules must fit the stored solution; when every clue has one, they must
  // also lead to exactly that solution. Puzzles without rules pass.
  // (The solver itself is not offered as `solve`: players' clues carry no rules.)
  /** @returns {import('../index').ApiError | null} */
  checkSolvable (data) {
    const rules = rulesOf(data);
    if (!rules.length) {
      return null;
    }
    const broken = brokenRules({ attributes: data.attributes, solution: data.solution, rules });
    if (!broken) {
      return { code: 'PUZZLE_INVALID' };
    }
    if (broken.length) {
      return { code: 'LOGICAL_RULE_BROKEN', params: { clue: rules[broken[0]].clue + 1 } };
    }
    if (!fullyFormalized(data)) {
      return null;
    }
    const result = solveLogical({ attributes: data.attributes, rules }, { limit: 2, maxMillis: SOLVABLE_CHECK_MILLIS });
    if (!result.complete) {
      return { code: 'PUZZLE_TOO_COMPLEX' };
    }
    if (result.solutions.length > 1) {
      const [a, b] = result.solutions;
      const cells = a.reduce((sum, row, r) => sum + row.filter((cell, c) => cell !== b[r][c]).length, 0);
      return { code: 'LOGICAL_NOT_UNIQUE', params: { cells } };
    }
    return null;
  }
};

export default logical;
