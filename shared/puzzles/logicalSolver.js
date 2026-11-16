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

export const SAME_TYPES = ['same', 'notSame', 'eitherOr', 'note'];
export const ORDER_TYPES = ['before', 'after', 'directlyBefore', 'directlyAfter', 'nextTo', 'differsBy', 'times', 'sum'];
export const GROUP_TYPES = ['anyOf', 'allOf', 'exists', 'not'];
export const RULE_TYPES = [...SAME_TYPES, ...ORDER_TYPES, ...GROUP_TYPES];

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
 * `rank` is the position in the order (0 = smallest). Null if the category
 * is unordered or its values cannot be ordered (unparsable or equal numbers).
 */
export function orderKeys (attribute) {
  const mode = orderMode(attribute);
  if (!mode) return null;
  const values = attribute.values.map(String);
  let keys;
  if (mode === 'numeric') {
    keys = values.map(parseNumber);
    if (keys.some(k => !Number.isFinite(k))) return null;
  } else if (mode === 'alpha') {
    const sorted = values.map((v, i) => i).sort((i, j) => alphaCompare(values[i], values[j]));
    keys = [];
    sorted.forEach((i, rank) => { keys[i] = rank; });
  } else {
    keys = values.map((v, i) => i);
  }
  const order = keys.map((k, i) => i).sort((i, j) => keys[i] - keys[j]);
  if (order.some((i, n) => n > 0 && Math.abs(keys[i] - keys[order[n - 1]]) < EPS)) return null;
  const rank = [];
  order.forEach((i, n) => { rank[i] = n; });
  return keys.map((key, i) => ({ key, rank: rank[i] }));
}

/** Does the pair of ordered values (a, b) satisfy the relation? */
function orderHolds (type, a, b, offset, abs, factor) {
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

// Replaces { var } references by a value of the first category.
function substitute (rule, name, value) {
  const swap = ref => (isVar(ref) && ref.var === name ? { attr: 0, value } : ref);
  if (GROUP_TYPES.includes(rule.type)) {
    return { ...rule, rules: rule.rules.map(sub => substitute(sub, name, value)) };
  }
  return { ...rule, a: swap(rule.a), b: swap(rule.b), ...(rule.c ? { c: swap(rule.c) } : {}) };
}

function compileRule (rule, attributes) {
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

/** rowOf from a stored solution table (rows in any order). Null if it doesn't fit. */
function rowsFromSolution (attributes, solution) {
  const first = attributes[0].values.map(String);
  const rowOf = attributes.map(() => []);
  for (const row of solution) {
    const r = first.indexOf(String(row[0]));
    if (r < 0) return null;
    for (let c = 0; c < attributes.length; c++) {
      const v = attributes[c].values.findIndex(x => String(x) === String(row[c]));
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
 * Null if the solution does not match the attributes.
 */
export function brokenRules ({ attributes, solution, rules }) {
  const rowOf = rowsFromSolution(attributes, solution);
  if (!rowOf) return null;
  const compiled = compile(attributes, rules || []);
  return compiled.map((rule, i) => (ruleHolds(rule, rowOf) ? -1 : i)).filter(i => i >= 0);
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
 * Applies all rules and the permutation constraints until nothing changes.
 * Throws Contradiction if some value has no row left.
 */
function propagate (dom, m, n, rules) {
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
    if (rule.type === 'anyOf') {
      // Try every alternative on a copy; keep what at least one allows.
      const union = new Int32Array(dom.length);
      let alive = 0;
      for (const sub of rule.rules) {
        const trial = dom.slice();
        try {
          propagate(trial, m, n, [sub]);
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

const solved = (dom, m, n) => {
  for (let i = n; i < m * n; i++) if (popcount(dom[i]) !== 1) return false;
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
// Repeats until no assumption fails any more.
function contradictionPass (dom, m, n, rules) {
  let progress = true;
  let used = false;
  while (progress) {
    progress = false;
    for (let i = n; i < m * n; i++) {
      let d = dom[i];
      if (popcount(d) < 2) continue;
      while (d) {
        const bit = lowBit(d);
        d ^= bit;
        const trial = dom.slice();
        trial[i] = bit;
        try {
          propagate(trial, m, n, rules);
        } catch (e) {
          if (!(e instanceof Contradiction)) throw e;
          dom[i] &= ~bit;
          if (!dom[i]) throw new Contradiction();
          propagate(dom, m, n, rules);
          progress = used = true;
        }
      }
    }
  }
  return used;
}

// ---------------------------------------------------------------------------
// Solving
// ---------------------------------------------------------------------------

/**
 * @param {{ attributes: { values: string[], ordered?: any }[], rules?: any[] }} puzzle
 * @param {{ limit?: number, maxNodes?: number, maxMillis?: number }} [options]
 * @returns {{ solutions: string[][][], logicalOnly: boolean,
 *   technique: 'elimination' | 'contradiction' | 'search', steps: number, complete: boolean, nodes: number }}
 *   Each solution is a table with one row per value of the first category
 *   (in the stored order), like data.solution.
 */
export function solveLogical (puzzle, { limit = 2, maxNodes = 2e6, maxMillis = Infinity } = {}) {
  const attributes = puzzle.attributes;
  const m = attributes.length;
  const n = attributes[0].values.length;
  if (n > 30) throw new Error('too many values per category');
  // Simple rules first: they are cheap, and they narrow what the groups try.
  const rules = compile(attributes, (puzzle.rules || []).filter(r => !ruleProblem(r, attributes)))
    .sort((x, y) => Number(x.type === 'anyOf') - Number(y.type === 'anyOf'));
  const deadline = Date.now() + maxMillis;
  const solutions = [];
  let nodes = 0;
  let complete = true;

  const toTable = dom => {
    const rowOf = rowOfState(dom, m, n);
    return attributes[0].values.map((first, r) =>
      attributes.map((attr, c) => (c === 0 ? String(first) : String(attr.values[rowOf[c].indexOf(r)]))));
  };
  const accept = dom => {
    const rowOf = rowOfState(dom, m, n);
    if (rules.every(rule => ruleHolds(rule, rowOf))) solutions.push(toTable(dom));
  };

  /** @type {'elimination' | 'contradiction' | 'search'} */
  let technique = 'elimination';
  const root = makeState(m, n);
  let steps = 0;
  try {
    steps = propagate(root, m, n, rules);
    if (!solved(root, m, n) && contradictionPass(root, m, n, rules)) technique = 'contradiction';
  } catch (e) {
    if (!(e instanceof Contradiction)) throw e;
    return { solutions, logicalOnly: false, technique: 'search', steps, complete: true, nodes };
  }
  if (!solved(root, m, n)) technique = 'search';

  const search = dom => {
    if (solutions.length >= limit) return;
    if (++nodes > maxNodes || (nodes % 256 === 0 && Date.now() > deadline)) {
      complete = false;
      return;
    }
    // Branch on the value with the fewest rows left.
    let best = -1;
    let bestCount = Infinity;
    for (let i = n; i < m * n; i++) {
      const count = popcount(dom[i]);
      if (count > 1 && count < bestCount) { best = i; bestCount = count; }
    }
    if (best < 0) { accept(dom); return; }
    let d = dom[best];
    while (d && complete && solutions.length < limit) {
      const bit = lowBit(d);
      d ^= bit;
      const next = dom.slice();
      next[best] = bit;
      try {
        propagate(next, m, n, rules);
      } catch (e) {
        if (!(e instanceof Contradiction)) throw e;
        continue;
      }
      search(next);
    }
  };
  search(root);

  if (solutions.length !== 1) technique = 'search';
  return { solutions, logicalOnly: technique !== 'search', technique, steps, complete, nodes };
}
