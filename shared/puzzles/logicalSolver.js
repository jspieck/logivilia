// Solver for Logikrätsel (logic grid puzzles) whose clues are formalised as
// rules (data.rules, see logical.js).
//
// Model: one row per value of the first category (row r = attributes[0].values[r]).
// Every value of every other category is a variable whose domain is the set
// of rows it may still belong to (a bitmask). Each category is a permutation,
// so the values of one category take different rows.
//
// Solving = constraint propagation (elimination) plus backtracking over the
// remaining choices, counting solutions up to `limit`. `technique` tells how
// much reasoning the puzzle needs:
//   'elimination'   - propagation alone fills the table
//   'contradiction' - plus "assume a pairing, see it fail, rule it out"
//   'search'        - needs guessing (or has no or several solutions)
//
// Rules, all values given as { attr, value } (category index, value text):
//   same       a, b      a and b belong together
//   notSame    a, b      a and b do not belong together
//   eitherOr   a, b, c   a belongs to b or to c, not both
//   before     a, b, by  a's value in the ordered category `by` is smaller than b's
//   after      a, b, by  ... larger
//   directlyBefore / directlyAfter  a, b, by   the next smaller / larger value
//   nextTo     a, b, by  neighbouring values (either side)
//   differsBy  a, b, by, offset   a's value = b's value + offset (numbers for
//              numeric categories, positions in the list otherwise); with
//              abs: true the difference may go either way ("5 more or less")
//   times      a, b, by, factor   a's value = b's value x factor ("twice as many")
//   sum        a, b, c, by   a's value + b's value = c's value
//   total      a, over, offset, and one of b / value / extreme
//              a's values of the numeric categories `over` added up
//              (a's "total") = b's total + offset, = value + offset, or
//              = the smallest ('min') / largest ('max') total of all + offset
//   note       -         no condition: the clue only sets the scene
//
// Groups (the rules inside have no `clue`):
//   anyOf      rules     at least one of the rules holds ("either ... or", "one of")
//   allOf      rules     all of them hold (to group inside anyOf)
//   exists     var, rules   there is an entity X for which all rules hold
//              ("someone who ..."); inside, { var: 'X' } stands for X's
//              value of the first category. Expanded to anyOf over those values.
//   not        rules (one)   the rule does not hold (checked, not propagated)
//
// An ordered category has `ordered: 'numeric' | 'list' | 'alpha'`: numeric
// values compare as numbers, 'list' uses the stored value order (the author's
// row order), 'alpha' compares alphabetically.
//
// Repeated values: a category may list the same value more than once (grades
// 4, 4, 5, 5, 6, 6). A rule naming such a value means "one of the entities
// with it" (for notSame: "none of them"). Tables that differ only by which
// copy of a value sits in which row count as one solution. In an ordered
// category the copies share one place in the order.
//
// Hidden categories (puzzle.hiddenAttributes): categories the clues use but
// the player's table does not have, such as the seats at a table. Rules
// refer to them by index after the visible ones (attributes.length + k).
// Solutions only list the visible categories; two seatings that give the
// same table are one solution.

export const SAME_TYPES = ['same', 'notSame', 'eitherOr', 'note'];
export const ORDER_TYPES = ['before', 'after', 'directlyBefore', 'directlyAfter', 'nextTo', 'differsBy', 'times', 'sum'];
export const TOTAL_TYPES = ['total'];
export const GROUP_TYPES = ['anyOf', 'allOf', 'exists', 'not'];
export const RULE_TYPES = [...SAME_TYPES, ...ORDER_TYPES, ...TOTAL_TYPES, ...GROUP_TYPES];
export const EXTREMES = ['min', 'max'];
export const MAX_HIDDEN = 3;

/** Visible categories followed by the hidden ones (see above). */
export function allAttributes (puzzle) {
  const hidden = Array.isArray(puzzle.hiddenAttributes) ? puzzle.hiddenAttributes : [];
  return [...puzzle.attributes, ...hidden];
}

// Limits for group rules, so a stored rule cannot make the solver explode.
const MAX_DEPTH = 4;
const MAX_GROUP = 40;
export const ORDER_MODES = ['numeric', 'list', 'alpha'];

const EPS = 1e-9;

// ---------------------------------------------------------------------------
// Ordered categories
// ---------------------------------------------------------------------------

/** 'numeric' | 'list' | 'alpha', or null for an unordered category. */
export function orderMode (attribute) {
  const o = attribute && attribute.ordered;
  if (o === true) return 'list';
  return ORDER_MODES.includes(o) ? o : null;
}

/** First number in a value ("120 Seiten", "5€", "2,5 km"), or NaN. */
export function parseNumber (value) {
  const match = String(value).match(/-?\d{1,3}(?:\.\d{3})+(?![\d,])|-?\d+(?:[.,]\d+)?/);
  if (!match) return NaN;
  const text = match[0];
  // "1.000.000" / "500.000": dots group thousands (German style).
  return /^-?\d{1,3}(\.\d{3})+$/.test(text) ? Number(text.replace(/\./g, '')) : Number(text.replace(',', '.'));
}

const alphaCompare = (a, b) => String(a).localeCompare(String(b), 'de', { sensitivity: 'base', numeric: true });

/**
 * For each value index of an ordered category: { key, rank }. `key` is what
 * differsBy compares (the number for numeric categories, else the rank);
 * `rank` is the position in the order (0 = smallest). Copies of a repeated
 * value share key and rank. Null if the category is unordered or its values
 * cannot be ordered (unparsable, or different values with equal numbers).
 */
export function orderKeys (attribute) {
  const mode = orderMode(attribute);
  if (!mode) return null;
  const values = attribute.values.map(String);
  const distinct = [...new Set(values)];
  /** @type {number[]} key of each distinct text */
  let distinctKeys;
  if (mode === 'numeric') {
    distinctKeys = distinct.map(parseNumber);
    if (distinctKeys.some(k => !Number.isFinite(k))) return null;
  } else if (mode === 'alpha') {
    const order = [...distinct].sort(alphaCompare);
    distinctKeys = distinct.map(text => order.indexOf(text));
  } else {
    distinctKeys = distinct.map((text, i) => i);
  }
  const sorted = [...distinctKeys].sort((x, y) => x - y);
  if (sorted.some((k, i) => i > 0 && Math.abs(k - sorted[i - 1]) < EPS)) return null;
  return values.map(text => {
    const key = distinctKeys[distinct.indexOf(text)];
    return { key, rank: sorted.indexOf(key) };
  });
}

/** Does the pair of ordered values (a, b) satisfy the relation? ({ key, rank } from orderKeys) */
export function orderHolds (type, a, b, offset, abs, factor) {
  switch (type) {
    case 'before': return a.key < b.key - EPS;
    case 'after': return a.key > b.key + EPS;
    case 'directlyBefore': return a.rank + 1 === b.rank;
    case 'directlyAfter': return a.rank === b.rank + 1;
    case 'nextTo': return Math.abs(a.rank - b.rank) === 1;
    case 'differsBy': return abs
      ? Math.abs(Math.abs(a.key - b.key) - Math.abs(offset)) < EPS
      : Math.abs(a.key - b.key - offset) < EPS;
    case 'times': return Math.abs(a.key - b.key * factor) < EPS;
    default: return false;
  }
}

// ---------------------------------------------------------------------------
// Checking and compiling rules
// ---------------------------------------------------------------------------

function refIndex (ref, attributes) {
  if (!ref || typeof ref !== 'object' || !Number.isInteger(ref.attr)) return null;
  const attribute = attributes[ref.attr];
  if (!attribute || !Array.isArray(attribute.values)) return null;
  const v = attribute.values.findIndex(x => String(x) === String(ref.value));
  return v < 0 ? null : { c: ref.attr, v };
}

const isVar = ref => !!ref && typeof ref === 'object' && typeof ref.var === 'string';

/**
 * Why a rule is unusable for these attributes, or null if it is fine.
 * @param {any} rule
 * @param {{ name?: string, values: string[], ordered?: any }[]} attributes
 * @param {string[]} [vars] variables of enclosing `exists` rules
 * @param {number} [depth]
 * @returns {string | null}
 */
export function ruleProblem (rule, attributes, vars = [], depth = 0) {
  if (!rule || typeof rule !== 'object') return 'rule must be an object';
  if (!RULE_TYPES.includes(rule.type)) return `unknown rule type "${rule.type}"`;
  if (GROUP_TYPES.includes(rule.type)) {
    if (depth >= MAX_DEPTH) return 'rule groups are nested too deeply';
    if (!Array.isArray(rule.rules) || !rule.rules.length || rule.rules.length > MAX_GROUP) {
      return `rule.rules must list 1 to ${MAX_GROUP} rules`;
    }
    if (rule.type === 'not' && rule.rules.length !== 1) return 'rule.rules of a "not" rule must hold exactly one rule';
    let inner = vars;
    if (rule.type === 'exists') {
      if (typeof rule.var !== 'string' || !rule.var || vars.includes(rule.var)) return 'rule.var must be a new name';
      inner = [...vars, rule.var];
    }
    for (const sub of rule.rules) {
      const problem = ruleProblem(sub, attributes, inner, depth + 1);
      if (problem) return problem;
    }
    return null;
  }
  if (rule.type === 'note') return null;
  if (rule.type === 'total') return totalProblem(rule, attributes, vars);
  const refs = rule.type === 'eitherOr' || rule.type === 'sum' ? ['a', 'b', 'c'] : ['a', 'b'];
  for (const key of refs) {
    const ref = rule[key];
    if (isVar(ref) ? !vars.includes(ref.var) : !refIndex(ref, attributes)) {
      return `rule.${key} must name a category index and one of its values`;
    }
  }
  if (ORDER_TYPES.includes(rule.type)) {
    if (!Number.isInteger(rule.by) || !attributes[rule.by]) return 'rule.by must name a category';
    if (!orderMode(attributes[rule.by])) return 'rule.by must be an ordered category';
    if (!orderKeys(attributes[rule.by])) return 'the values of an ordered category must be distinct (and numbers if numeric)';
    if (rule.type === 'differsBy' && (typeof rule.offset !== 'number' || !Number.isFinite(rule.offset) || rule.offset === 0)) {
      return 'rule.offset must be a non-zero number';
    }
    if (rule.type === 'times' && (typeof rule.factor !== 'number' || !Number.isFinite(rule.factor) ||
        rule.factor === 0 || rule.factor === 1)) {
      return 'rule.factor must be a number other than 0 and 1';
    }
  }
  return null;
}

function totalProblem (rule, attributes, vars) {
  const refOk = ref => (isVar(ref) ? vars.includes(ref.var) : !!refIndex(ref, attributes));
  if (!refOk(rule.a)) return 'rule.a must name a category index and one of its values';
  const over = rule.over;
  if (!Array.isArray(over) || !over.length || new Set(over).size !== over.length ||
      !over.every(c => Number.isInteger(c) && attributes[c] && orderMode(attributes[c]) === 'numeric' && orderKeys(attributes[c]))) {
    return 'rule.over must list different numeric categories';
  }
  const targets = ['b', 'value', 'extreme'].filter(key => rule[key] !== undefined);
  if (targets.length !== 1) return 'a total rule needs exactly one of rule.b, rule.value and rule.extreme';
  if (rule.b !== undefined && !refOk(rule.b)) return 'rule.b must name a category index and one of its values';
  if (rule.value !== undefined && !(typeof rule.value === 'number' && Number.isFinite(rule.value))) {
    return 'rule.value must be a number';
  }
  if (rule.extreme !== undefined && !EXTREMES.includes(rule.extreme)) return `rule.extreme must be one of ${EXTREMES.join(', ')}`;
  if (rule.offset !== undefined && !(typeof rule.offset === 'number' && Number.isFinite(rule.offset))) {
    return 'rule.offset must be a number';
  }
  return null;
}

// Replaces { var } references by a value of the first category.
function substitute (rule, name, value) {
  const swap = ref => (isVar(ref) && ref.var === name ? { attr: 0, value } : ref);
  if (GROUP_TYPES.includes(rule.type)) {
    return { ...rule, rules: rule.rules.map(sub => substitute(sub, name, value)) };
  }
  const out = { ...rule };
  for (const key of ['a', 'b', 'c']) if (rule[key] !== undefined) out[key] = swap(rule[key]);
  return out;
}

// All value indices with the ref's text (several for a repeated value).
function refSlots (ref, attributes) {
  const found = refIndex(ref, attributes);
  if (!found) return [];
  const text = String(attributes[found.c].values[found.v]);
  const out = [];
  attributes[found.c].values.forEach((x, v) => { if (String(x) === text) out.push({ c: found.c, v }); });
  return out;
}

// Every combination of one entry per list.
const combinations = lists => lists.reduce((acc, list) => acc.flatMap(prefix => list.map(x => [...prefix, x])), [[]]);

function compileRule (rule, attributes) {
  const keys = rule.type === 'eitherOr' || rule.type === 'sum' ? ['a', 'b', 'c']
    : rule.type === 'total' ? (rule.b !== undefined ? ['a', 'b'] : ['a'])
      : GROUP_TYPES.includes(rule.type) || rule.type === 'note' ? [] : ['a', 'b'];
  const slots = keys.map(key => refSlots(rule[key], attributes));
  if (slots.some(list => list.length > 1)) {
    // A repeated value: "one of its copies" (notSame: "none of them").
    if (rule.type === 'eitherOr') {
      const s = (a, b) => ({ type: 'same', a, b });
      const ns = (a, b) => ({ type: 'notSame', a, b });
      return compileRule({
        type: 'anyOf',
        rules: [
          { type: 'allOf', rules: [s(rule.a, rule.b), ns(rule.a, rule.c)] },
          { type: 'allOf', rules: [ns(rule.a, rule.b), s(rule.a, rule.c)] }
        ]
      }, attributes);
    }
    const variants = combinations(slots).map(combo => {
      const out = compileLeaf(rule, attributes);
      keys.forEach((key, k) => { out[key] = combo[k]; });
      return out;
    });
    return { type: rule.type === 'notSame' ? 'allOf' : 'anyOf', rules: variants };
  }
  return compileLeaf(rule, attributes);
}

function compileLeaf (rule, attributes) {
  if (rule.type === 'exists') {
    return {
      type: 'anyOf',
      rules: attributes[0].values.map(value => ({
        type: 'allOf',
        rules: rule.rules.map(sub => compileRule(substitute(sub, rule.var, value), attributes))
      }))
    };
  }
  if (rule.type === 'anyOf' || rule.type === 'allOf' || rule.type === 'not') {
    return { type: rule.type, rules: rule.rules.map(sub => compileRule(sub, attributes)) };
  }
  if (rule.type === 'note') return { type: 'note' };
  if (rule.type === 'total') {
    return {
      type: 'total',
      a: refIndex(rule.a, attributes),
      b: rule.b !== undefined ? refIndex(rule.b, attributes) : null,
      value: rule.value !== undefined ? rule.value : null,
      extreme: rule.extreme || null,
      offset: rule.offset || 0,
      over: [...rule.over],
      keys: rule.over.map(c => orderKeys(attributes[c]))
    };
  }
  const out = { type: rule.type, a: refIndex(rule.a, attributes), b: refIndex(rule.b, attributes) };
  if (rule.type === 'eitherOr' || rule.type === 'sum') out.c = refIndex(rule.c, attributes);
  if (ORDER_TYPES.includes(rule.type)) {
    out.by = rule.by;
    out.keys = orderKeys(attributes[rule.by]);
    out.offset = rule.offset || 0;
    out.abs = rule.abs === true;
    out.factor = rule.factor || 1;
  }
  return out;
}

function compile (attributes, rules) {
  return rules.map(rule => compileRule(rule, attributes));
}

// rowOf[c][v] = row of value v of category c in a complete assignment.
function ruleHolds (rule, rowOf) {
  if (rule.type === 'anyOf') return rule.rules.some(sub => ruleHolds(sub, rowOf));
  if (rule.type === 'allOf') return rule.rules.every(sub => ruleHolds(sub, rowOf));
  if (rule.type === 'not') return !ruleHolds(rule.rules[0], rowOf);
  if (rule.type === 'note') return true;
  if (rule.type === 'total') {
    const n = rowOf[0].length;
    const totalAt = row => rule.over.reduce((s, c, k) => s + rule.keys[k][rowOf[c].indexOf(row)].key, 0);
    const ra = rowOf[rule.a.c][rule.a.v];
    let target;
    if (rule.b) {
      const rb = rowOf[rule.b.c][rule.b.v];
      if (rb === ra) return false;
      target = totalAt(rb);
    } else if (rule.extreme) {
      const all = Array.from({ length: n }, (_, row) => totalAt(row));
      target = rule.extreme === 'min' ? Math.min(...all) : Math.max(...all);
    } else {
      target = rule.value;
    }
    return Math.abs(totalAt(ra) - target - rule.offset) < EPS;
  }
  if (rule.type === 'sum') {
    const rows = [rule.a, rule.b, rule.c].map(ref => rowOf[ref.c][ref.v]);
    if (new Set(rows).size < 3) return false;
    const [ka, kb, kc] = rows.map(row => rule.keys[rowOf[rule.by].indexOf(row)].key);
    return Math.abs(ka + kb - kc) < EPS;
  }
  const ra = rowOf[rule.a.c][rule.a.v];
  const rb = rowOf[rule.b.c][rule.b.v];
  switch (rule.type) {
    case 'same': return ra === rb;
    case 'notSame': return ra !== rb;
    case 'eitherOr': {
      const rc = rowOf[rule.c.c][rule.c.v];
      return (ra === rb) !== (ra === rc);
    }
    default: {
      if (ra === rb) return false;
      const byRow = rowOf[rule.by];
      const va = byRow.indexOf(ra);
      const vb = byRow.indexOf(rb);
      return orderHolds(rule.type, rule.keys[va], rule.keys[vb], rule.offset, rule.abs, rule.factor);
    }
  }
}

/**
 * rowOf from a stored solution table (rows in any order). Copies of a
 * repeated value go to the rows in order (the first copy to the lowest row),
 * as the solver counts them. Null if it doesn't fit.
 */
function rowsFromSolution (attributes, solution) {
  const first = attributes[0].values.map(String);
  const rowOf = attributes.map(() => []);
  if (!Array.isArray(solution)) return null;
  const placed = [];
  for (const row of solution) {
    const r = Array.isArray(row) ? first.indexOf(String(row[0])) : -1;
    if (r < 0 || placed[r]) return null;
    placed[r] = row;
  }
  for (let r = 0; r < first.length; r++) {
    const row = placed[r];
    if (!row) return null;
    for (let c = 0; c < attributes.length; c++) {
      const v = attributes[c].values.findIndex((x, i) => String(x) === String(row[c]) && rowOf[c][i] === undefined);
      if (v < 0) return null;
      rowOf[c][v] = r;
    }
  }
  const n = first.length;
  if (rowOf.some(rows => rows.length !== n || new Set(rows).size !== n || rows.some(r => r === undefined))) return null;
  return rowOf;
}

/**
 * Indices of the rules the stored solution breaks (empty if it satisfies all).
 * Null if the solution does not match the attributes. With hidden
 * categories, a rule is broken if no filling of them makes it hold; if each
 * rule can hold but not all at once, the rules about hidden categories are
 * returned.
 */
export function brokenRules (puzzle) {
  const { attributes, solution } = puzzle;
  const rules = puzzle.rules || [];
  const rowOf = rowsFromSolution(attributes, solution);
  if (!rowOf) return null;
  const all = allAttributes(puzzle);
  const compiled = compile(all, rules);
  if (all.length === attributes.length) {
    return compiled.map((rule, i) => (ruleHolds(rule, rowOf) ? -1 : i)).filter(i => i >= 0);
  }
  if (all.slice(attributes.length).some(a => !a || !Array.isArray(a.values) || a.values.length !== rowOf[0].length)) return null;
  const m = all.length;
  const n = rowOf[0].length;
  const fixed = makeState(m, n);
  for (let c = 1; c < attributes.length; c++) {
    for (let v = 0; v < n; v++) fixed[c * n + v] = 1 << rowOf[c][v];
  }
  const ctx = context(all);
  const holds = list => {
    const dom = fixed.slice();
    try {
      propagate(dom, m, n, list, ctx);
    } catch (e) {
      if (!(e instanceof Contradiction)) throw e;
      return false;
    }
    let found = false;
    const budget = { nodes: 0, maxNodes: 2e5, deadline: Infinity, complete: true };
    explore(dom, m, n, list, ctx, budget, attributes.length, m, () => { found = true; return true; });
    return found;
  };
  if (holds(compiled)) return [];
  const broken = compiled.map((rule, i) => (holds([rule]) ? -1 : i)).filter(i => i >= 0);
  if (broken.length) return broken;
  return rules.map((rule, i) => (touchesHidden(rule, attributes.length) ? i : -1)).filter(i => i >= 0);
}

function touchesHidden (rule, visible) {
  if (Array.isArray(rule.rules)) return rule.rules.some(sub => touchesHidden(sub, visible));
  return ['a', 'b', 'c'].some(key => rule[key] && rule[key].attr >= visible) ||
    (Number.isInteger(rule.by) && rule.by >= visible) || (Array.isArray(rule.over) && rule.over.some(c => c >= visible));
}

// ---------------------------------------------------------------------------
// Propagation
// ---------------------------------------------------------------------------

const popcount = x => { let n = 0; while (x) { x &= x - 1; n++; } return n; };
const lowBit = x => x & -x;
const bitIndex = x => 31 - Math.clz32(x);

class Contradiction extends Error {}

function makeState (m, n) {
  const dom = new Int32Array(m * n);
  const all = (1 << n) - 1;
  for (let c = 0; c < m; c++) {
    for (let v = 0; v < n; v++) dom[c * n + v] = c === 0 ? 1 << v : all;
  }
  return dom;
}

/**
 * What propagation needs besides the rules: `dups` lists, per repeated value
 * of a category other than the first, the state indices of its copies.
 */
function context (attributes) {
  const n = attributes[0].values.length;
  const dups = [];
  attributes.forEach((attribute, c) => {
    if (c === 0) return;
    const byText = new Map();
    attribute.values.forEach((value, v) => {
      const text = String(value);
      if (!byText.has(text)) byText.set(text, []);
      byText.get(text).push(c * n + v);
    });
    for (const list of byText.values()) if (list.length > 1) dups.push(list);
  });
  return { dups };
}

/**
 * Applies all rules and the permutation constraints until nothing changes.
 * Throws Contradiction if some value has no row left.
 */
function propagate (dom, m, n, rules, ctx) {
  let changed = true;
  let rounds = 0;
  const set = (i, mask) => {
    const next = dom[i] & mask;
    if (next === dom[i]) return;
    if (!next) throw new Contradiction();
    dom[i] = next;
    changed = true;
  };
  const idx = ref => ref.c * n + ref.v;

  const apply = rule => {
    if (rule.type === 'allOf') {
      for (const sub of rule.rules) apply(sub);
      return;
    }
    if (rule.type === 'not' || rule.type === 'note') return; // checked on complete tables only
    if (rule.type === 'sum') {
      propagateSum(rule, dom, n, set, idx);
      return;
    }
    if (rule.type === 'total') {
      propagateTotal(rule, dom, n, set, idx);
      return;
    }
    if (rule.type === 'anyOf') {
      // Try every alternative on a copy; keep what at least one allows.
      const union = new Int32Array(dom.length);
      let alive = 0;
      for (const sub of rule.rules) {
        const trial = dom.slice();
        try {
          propagate(trial, m, n, [sub], ctx);
        } catch (e) {
          if (!(e instanceof Contradiction)) throw e;
          continue;
        }
        alive++;
        for (let i = 0; i < union.length; i++) union[i] |= trial[i];
      }
      if (!alive) throw new Contradiction();
      for (let i = n; i < dom.length; i++) set(i, union[i]);
      return;
    }
    const ia = idx(rule.a);
    const ib = idx(rule.b);
    switch (rule.type) {
      case 'same':
        set(ia, dom[ib]);
        set(ib, dom[ia]);
        break;
      case 'notSame':
        if (popcount(dom[ia]) === 1) set(ib, ~dom[ia]);
        if (popcount(dom[ib]) === 1) set(ia, ~dom[ib]);
        break;
      case 'eitherOr': {
        const ic = idx(rule.c);
        set(ia, dom[ib] | dom[ic]);
        if (!(dom[ia] & dom[ib])) { set(ia, dom[ic]); set(ic, dom[ia]); }
        if (!(dom[ia] & dom[ic])) { set(ia, dom[ib]); set(ib, dom[ia]); }
        if (popcount(dom[ia]) === 1) {
          if (dom[ib] === dom[ia]) set(ic, ~dom[ia]);
          if (dom[ic] === dom[ia]) set(ib, ~dom[ia]);
        }
        break;
      }
      default:
        propagateOrder(rule, dom, n, set, ia, ib);
    }
  };

  while (changed) {
    changed = false;
    rounds++;

    // Permutations: a row taken by one value is not available to the others;
    // a row only one value can take goes to that value.
    for (let c = 1; c < m; c++) {
      const base = c * n;
      for (let v = 0; v < n; v++) {
        const d = dom[base + v];
        if (popcount(d) === 1) {
          for (let w = 0; w < n; w++) if (w !== v) set(base + w, ~d);
        }
      }
      for (let r = 0; r < n; r++) {
        const bit = 1 << r;
        let only = -1;
        let count = 0;
        for (let v = 0; v < n; v++) if (dom[base + v] & bit) { only = v; count++; }
        if (count === 0) throw new Contradiction();
        if (count === 1) set(base + only, bit);
      }
    }

    // Copies of a repeated value are interchangeable: keep them in row
    // order, so each table is found once.
    for (const list of ctx.dups) {
      for (let k = 1; k < list.length; k++) {
        const s = list[k - 1];
        const t = list[k];
        set(t, ~((lowBit(dom[s]) << 1) - 1));
        set(s, (1 << bitIndex(dom[t])) - 1);
      }
    }

    for (const rule of rules) apply(rule);
  }
  return rounds;
}

// a + b = c along category `by`, three different entities: keep the
// `by` values each side can have in some combination that adds up.
function propagateSum (rule, dom, n, set, idx) {
  const base = rule.by * n;
  const refs = [rule.a, rule.b, rule.c];
  const possible = refs.map(ref => {
    if (ref.c === rule.by) return [ref.v];
    const out = [];
    for (let v = 0; v < n; v++) if (dom[base + v] & dom[idx(ref)]) out.push(v);
    return out;
  });
  const keep = refs.map(() => new Set());
  const key = v => rule.keys[v].key;
  for (const va of possible[0]) {
    for (const vb of possible[1]) {
      if (vb === va) continue;
      for (const vc of possible[2]) {
        if (vc === va || vc === vb || Math.abs(key(va) + key(vb) - key(vc)) >= EPS) continue;
        keep[0].add(va); keep[1].add(vb); keep[2].add(vc);
      }
    }
  }
  refs.forEach((ref, k) => {
    if (!keep[k].size) throw new Contradiction();
    if (ref.c === rule.by) return;
    let rows = 0;
    for (const v of keep[k]) rows |= dom[base + v];
    set(idx(ref), rows);
  });
}

const round = x => Math.round(x * 1e6) / 1e6;

// Totals a row can still reach: sums of one possible value per category of
// `over` (skipping category index `skip`).
function rowTotals (rule, dom, n, row, skip = -1) {
  let sums = new Set([0]);
  const bit = 1 << row;
  rule.over.forEach((c, k) => {
    if (k === skip) return;
    const next = new Set();
    for (let v = 0; v < n; v++) {
      if (!(dom[c * n + v] & bit)) continue;
      const key = rule.keys[k][v].key;
      for (const s of sums) next.add(round(s + key));
    }
    sums = next;
  });
  return sums;
}

// a's total = target + offset (see ruleHolds). Keeps the rows a (and b) can
// have and, in a known row, the values that can still reach the target.
function propagateTotal (rule, dom, n, set, idx) {
  const totals = Array.from({ length: n }, (_, row) => rowTotals(rule, dom, n, row));
  const rowsOf = mask => Array.from({ length: n }, (_, row) => row).filter(row => mask & (1 << row));
  const ia = idx(rule.a);
  const ib = rule.b ? idx(rule.b) : -1;

  // Which totals of row `row` the side may have, given the other side.
  let fitsA;
  let fitsB = null;
  if (rule.b) {
    const shifted = (rows, by) => {
      const out = new Set();
      for (const row of rows) for (const t of totals[row]) out.add(round(t + by));
      return out;
    };
    fitsA = row => {
      const wanted = shifted(rowsOf(dom[ib] & ~(1 << row)), rule.offset);
      return t => wanted.has(t);
    };
    fitsB = row => {
      const wanted = shifted(rowsOf(dom[ia] & ~(1 << row)), -rule.offset);
      return t => wanted.has(t);
    };
  } else if (rule.extreme) {
    // The smallest (largest) total lies between the smallest (largest)
    // possible totals' bounds over all rows.
    const lows = totals.map(s => Math.min(...s));
    const highs = totals.map(s => Math.max(...s));
    const pick = rule.extreme === 'min' ? Math.min : Math.max;
    const lo = pick(...lows) + rule.offset;
    const hi = pick(...highs) + rule.offset;
    fitsA = () => t => t >= lo - EPS && t <= hi + EPS;
  } else {
    const wanted = round(rule.value + rule.offset);
    fitsA = () => t => Math.abs(t - wanted) < EPS;
  }

  const narrow = (i, fits) => {
    let rows = 0;
    for (const row of rowsOf(dom[i])) {
      const ok = fits(row);
      for (const t of totals[row]) if (ok(t)) { rows |= 1 << row; break; }
    }
    set(i, rows);
    if (popcount(dom[i]) !== 1) return;
    // Known row: drop values that cannot reach a fitting total.
    const row = bitIndex(dom[i]);
    const ok = fits(row);
    rule.over.forEach((c, k) => {
      const rest = rowTotals(rule, dom, n, row, k);
      for (let v = 0; v < n; v++) {
        if (!(dom[c * n + v] & (1 << row))) continue;
        const key = rule.keys[k][v].key;
        let reachable = false;
        for (const s of rest) if (ok(round(s + key))) { reachable = true; break; }
        if (!reachable) set(c * n + v, ~(1 << row));
      }
    });
  };
  narrow(ia, fitsA);
  if (fitsB) narrow(ib, fitsB);
}

// Ordered relation between the entities of a and b along category `by`.
function propagateOrder (rule, dom, n, set, ia, ib) {
  // Different entities.
  if (popcount(dom[ia]) === 1) set(ib, ~dom[ia]);
  if (popcount(dom[ib]) === 1) set(ia, ~dom[ib]);

  const base = rule.by * n;
  // Values of `by` each side may have.
  const possible = (ref, i) => {
    if (ref.c === rule.by) return [ref.v];
    const out = [];
    for (let v = 0; v < n; v++) if (dom[base + v] & dom[i]) out.push(v);
    return out;
  };
  const pa = possible(rule.a, ia);
  const pb = possible(rule.b, ib);
  const keys = rule.keys;
  const sa = pa.filter(va => pb.some(vb => vb !== va && orderHolds(rule.type, keys[va], keys[vb], rule.offset, rule.abs, rule.factor)));
  const sb = pb.filter(vb => pa.some(va => va !== vb && orderHolds(rule.type, keys[va], keys[vb], rule.offset, rule.abs, rule.factor)));

  const restrict = (ref, i, supported, all) => {
    if (supported.length === all.length) return;
    if (!supported.length) throw new Contradiction();
    if (ref.c === rule.by) return; // its only value is supported
    let rows = 0;
    for (const v of supported) rows |= dom[base + v];
    set(i, rows);
    // A known row must hold a supported `by` value.
    if (popcount(dom[i]) === 1) {
      for (const v of all) if (!supported.includes(v)) set(base + v, ~dom[i]);
    }
  };
  restrict(rule.a, ia, sa, pa);
  restrict(rule.b, ib, sb, pb);
}

// Every value of categories [from, to) has one row.
const solved = (dom, n, from, to) => {
  for (let i = from * n; i < to * n; i++) if (popcount(dom[i]) !== 1) return false;
  return true;
};

function rowOfState (dom, m, n) {
  const rowOf = [];
  for (let c = 0; c < m; c++) {
    rowOf.push(Array.from({ length: n }, (_, v) => bitIndex(dom[c * n + v])));
  }
  return rowOf;
}

// "Assume value x is in row r; if that fails at once, rule it out."
// Repeats until no assumption fails any more. Only values of categories
// [1, to) are tried.
function contradictionPass (dom, m, n, rules, ctx, to = m) {
  let progress = true;
  let used = false;
  while (progress) {
    progress = false;
    for (let i = n; i < to * n; i++) {
      let d = dom[i];
      if (popcount(d) < 2) continue;
      while (d) {
        const bit = lowBit(d);
        d ^= bit;
        const trial = dom.slice();
        trial[i] = bit;
        try {
          propagate(trial, m, n, rules, ctx);
        } catch (e) {
          if (!(e instanceof Contradiction)) throw e;
          dom[i] &= ~bit;
          if (!dom[i]) throw new Contradiction();
          propagate(dom, m, n, rules, ctx);
          progress = used = true;
        }
      }
    }
  }
  return used;
}

/**
 * Backtracking below `dom` (already propagated) over the values of
 * categories [from, to). When those are all placed, the rest (hidden
 * categories, from `to` on) only needs one filling that works: found(dom)
 * is called with that complete state. Returns true to stop: found returned
 * true or the budget ran out (budget.complete is then false).
 */
function explore (dom, m, n, rules, ctx, budget, from, to, found) {
  if (++budget.nodes > budget.maxNodes || (budget.nodes % 256 === 0 && Date.now() > budget.deadline)) {
    budget.complete = false;
    return true;
  }
  // Branch on the value with the fewest rows left.
  let best = -1;
  let bestCount = Infinity;
  for (let i = from * n; i < to * n; i++) {
    const count = popcount(dom[i]);
    if (count > 1 && count < bestCount) { best = i; bestCount = count; }
  }
  if (best < 0) {
    if (to < m) {
      let witness = null;
      explore(dom, m, n, rules, ctx, budget, to, m, full => { witness = full; return true; });
      if (!budget.complete) return true;
      return witness ? found(witness) : false;
    }
    const rowOf = rowOfState(dom, m, n);
    return rules.every(rule => ruleHolds(rule, rowOf)) ? found(dom) : false;
  }
  let d = dom[best];
  while (d) {
    const bit = lowBit(d);
    d ^= bit;
    const next = dom.slice();
    next[best] = bit;
    try {
      propagate(next, m, n, rules, ctx);
    } catch (e) {
      if (!(e instanceof Contradiction)) throw e;
      continue;
    }
    if (explore(next, m, n, rules, ctx, budget, from, to, found)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Solving
// ---------------------------------------------------------------------------

/**
 * @param {{ attributes: { values: string[], ordered?: any }[], hiddenAttributes?: any[], rules?: any[] }} puzzle
 * @param {{ limit?: number, maxNodes?: number, maxMillis?: number }} [options]
 * @returns {{ solutions: string[][][], logicalOnly: boolean,
 *   technique: 'elimination' | 'contradiction' | 'search', steps: number, complete: boolean, nodes: number }}
 *   Each solution is a table with one row per value of the first category
 *   (in the stored order), like data.solution; hidden categories are left out.
 */
export function solveLogical (puzzle, { limit = 2, maxNodes = 2e6, maxMillis = Infinity } = {}) {
  const attributes = allAttributes(puzzle);
  const visible = puzzle.attributes.length;
  const m = attributes.length;
  const n = attributes[0].values.length;
  if (n > 30) throw new Error('too many values per category');
  if (attributes.some(a => !a || !Array.isArray(a.values) || a.values.length !== n)) {
    throw new Error('every category needs the same number of values');
  }
  // Simple rules first: they are cheap, and they narrow what the groups try.
  const rules = compile(attributes, (puzzle.rules || []).filter(r => !ruleProblem(r, attributes)))
    .sort((x, y) => Number(x.type === 'anyOf') - Number(y.type === 'anyOf'));
  const ctx = context(attributes);
  const solutions = [];

  const toTable = dom => {
    const rowOf = rowOfState(dom, m, n);
    return attributes[0].values.map((first, r) =>
      attributes.slice(0, visible).map((attr, c) => (c === 0 ? String(first) : String(attr.values[rowOf[c].indexOf(r)]))));
  };

  /** @type {'elimination' | 'contradiction' | 'search'} */
  let technique = 'elimination';
  const root = makeState(m, n);
  let steps = 0;
  const budget = { nodes: 0, maxNodes, deadline: Date.now() + maxMillis, complete: true };
  try {
    steps = propagate(root, m, n, rules, ctx);
    if (!solved(root, n, 1, visible) && contradictionPass(root, m, n, rules, ctx, visible)) technique = 'contradiction';
  } catch (e) {
    if (!(e instanceof Contradiction)) throw e;
    return { solutions, logicalOnly: false, technique: 'search', steps, complete: true, nodes: 0 };
  }
  if (!solved(root, n, 1, visible)) technique = 'search';

  if (limit > 0) {
    explore(root, m, n, rules, ctx, budget, 1, visible, dom => {
      solutions.push(toTable(dom));
      return solutions.length >= limit;
    });
  }

  if (solutions.length !== 1) technique = 'search';
  return { solutions, logicalOnly: technique !== 'search', technique, steps, complete: budget.complete, nodes: budget.nodes };
}
