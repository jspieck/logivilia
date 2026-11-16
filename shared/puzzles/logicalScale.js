// The "Skala" scratch pad of a Logikrätsel: one ordered category drawn as a
// line of slots (one per value). Players put values of the other categories
// on slots; values on the same slot belong together. The relations of the
// clues that compare along this category (logical.js publicRelations) are
// then checked against the placement.
//
// placement: { "attr:value": slotIndex } where slotIndex is the index of a
// value of the scale's category. A value of the scale's own category sits on
// its own slot.

import { ORDER_TYPES, orderKeys, orderHolds } from './logicalSolver.js';

const EPS = 1e-9;

export const tokenKey = ref => `${ref.attr}:${ref.value}`;

/** Relations (top level) that compare along category `cat`. */
export function scaleRelations (relations, cat) {
  return (relations || []).filter(r => ORDER_TYPES.includes(r.type) && r.by === cat);
}

/** The refs a relation is about (sum has three). */
export const relationRefs = r => (r.type === 'sum' ? [r.a, r.b, r.c] : [r.a, r.b]);

/** Slot of a value on the scale of `cat`, or undefined if not placed. */
export function slotOf (ref, attributes, cat, placement) {
  if (!ref) return undefined;
  if (ref.attr === cat) {
    const v = attributes[cat].values.findIndex(x => String(x) === String(ref.value));
    return v < 0 ? undefined : v;
  }
  return placement[tokenKey(ref)];
}

function holdsAt (r, slots, keys) {
  if (slots.some(s => s === undefined || !keys[s])) return false;
  if (r.type === 'sum') return Math.abs(keys[slots[0]].key + keys[slots[1]].key - keys[slots[2]].key) < EPS;
  return orderHolds(r.type, keys[slots[0]], keys[slots[1]], r.offset, r.abs, r.factor);
}

/**
 * 'ok' when every value of the relation is placed and it holds, 'bad' when
 * placed and it does not, 'open' otherwise.
 */
export function relationState (r, attributes, cat, placement) {
  const keys = orderKeys(attributes[cat]);
  if (!keys) return 'open';
  const slots = relationRefs(r).map(ref => slotOf(ref, attributes, cat, placement));
  if (slots.some(s => s === undefined)) return 'open';
  return holdsAt(r, slots, keys) ? 'ok' : 'bad';
}

/**
 * For each slot: can `token` ({ attr, value }) go there without breaking a
 * relation? Values not placed yet may go anywhere, so a relation only rules a
 * slot out when no slots for its other values make it hold ("5 more or less"
 * rules out a slot without a neighbour 5 away).
 * @returns {boolean[]}
 */
export function possibleSlots (token, relations, attributes, cat, placement) {
  const keys = orderKeys(attributes[cat]);
  const count = attributes[cat].values.length;
  if (!keys) return new Array(count).fill(true);
  const key = tokenKey(token);
  const mine = scaleRelations(relations, cat).filter(r => relationRefs(r).some(ref => tokenKey(ref) === key));
  return Array.from({ length: count }, (_, s) => {
    const trial = { ...placement, [key]: s };
    // A value of the same category already there would be moved off.
    for (const [k, slot] of Object.entries(placement)) {
      if (slot === s && k !== key && Number(k.split(':')[0]) === token.attr) delete trial[k];
    }
    return mine.every(r => {
      const slots = relationRefs(r).map(ref => slotOf(ref, attributes, cat, trial));
      const open = slots.map((slot, i) => (slot === undefined ? i : -1)).filter(i => i >= 0);
      const tryFill = (n) => {
        if (n === open.length) return holdsAt(r, slots, keys);
        for (let t = 0; t < count; t++) {
          slots[open[n]] = t;
          if (tryFill(n + 1)) return true;
        }
        slots[open[n]] = undefined;
        return false;
      };
      return tryFill(0);
    });
  });
}

/**
 * x position of each slot as a fraction 0..1: by value for numeric
 * categories (so gaps show), evenly otherwise. Falls back to even spacing
 * when two slots would be closer than `minGap` (a fraction).
 * @returns {{ positions: number[], toScale: boolean }}
 */
export function slotPositions (attribute, minGap = 0) {
  const n = attribute.values.length;
  const even = attribute.values.map((_, i) => (n > 1 ? i / (n - 1) : 0.5));
  const keys = orderKeys(attribute);
  if (!keys || attribute.ordered !== 'numeric' || n < 2) return { positions: rankOrder(keys, even), toScale: false };
  const min = Math.min(...keys.map(k => k.key));
  const max = Math.max(...keys.map(k => k.key));
  const positions = keys.map(k => (k.key - min) / (max - min));
  const sorted = [...positions].sort((a, b) => a - b);
  if (sorted.some((p, i) => i > 0 && p - sorted[i - 1] < minGap)) return { positions: rankOrder(keys, even), toScale: false };
  return { positions, toScale: true };
}

// Even spacing in the category's order (value i at the place of its rank).
function rankOrder (keys, even) {
  return keys ? keys.map(k => even[k.rank]) : even;
}
