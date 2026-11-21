// State of the Logikrätsel notepad (CluePad.vue): one free board where the
// player puts value cards and pulls clues in. A card is one "person" of the
// puzzle: the values on it belong together (at most one per category). Clues
// on the pad are drawn as links between the cards of their values and turn
// green when the cards satisfy them, red when they cannot.
//
// pad: { cards: [card], clues: [clueIndex], nextId }
// card: { id, x, y, values: { [attr]: value },
//         parts:   [[attr, ...], ...]  cards it was joined from (to split it again),
//         crossed: { [attr]: [value] } values the player ruled out for it,
//         notes:   true while its candidate list is open }
// parts, crossed and notes may be missing (older saved pads).
// Only a scratch pad: it never touches the grid or the answer table.

import { orderKeys, orderHolds } from '@shared/puzzles/logicalSolver.js'
import { orientRelation } from './orientRelation'

const EPS = 1e-9

export const emptyPad = () => ({ cards: [], clues: [], nextId: 1 })

export const valueKey = ref => `${ref.attr}:${ref.value}`

const isValueRef = ref => !!ref && Number.isInteger(ref.attr) && ref.value !== undefined

/** The card holding a value, or undefined. */
export function cardOf (pad, ref) {
  if (!isValueRef(ref)) return undefined
  const value = String(ref.value)
  return pad.cards.find(card => card.values[ref.attr] === value)
}

/** Value refs a relation (or a group of them) mentions. */
export function refsOf (r) {
  if (!r) return []
  if (Array.isArray(r.rules)) return r.rules.flatMap(refsOf)
  return [r.a, r.b, r.c].filter(isValueRef)
}

// Two cards that hold different values of one category are two different people.
const conflict = (a, b) => Object.keys(a.values).some(k => b.values[k] !== undefined && b.values[k] !== a.values[k])

const combineAny = (states) => {
  if (states.includes('ok')) return 'ok'
  return states.length && states.every(s => s === 'bad') ? 'bad' : 'open'
}
const combineAll = (states) => {
  if (states.includes('bad')) return 'bad'
  return states.length && states.every(s => s === 'ok') ? 'ok' : 'open'
}

function sameState (pad, a, b) {
  const ca = cardOf(pad, a)
  const cb = cardOf(pad, b)
  if (a.attr === b.attr) return String(a.value) === String(b.value) ? 'ok' : 'bad'
  if (!ca || !cb) return 'open'
  if (ca === cb) return 'ok'
  return conflict(ca, cb) ? 'bad' : 'open'
}

// Order key of a value along category `by`: its own if it is a value of
// `by`, else that of the `by` value on its card.
function keyAlong (pad, ref, by, attributes, keys) {
  if (!isValueRef(ref)) return undefined
  const values = attributes[by].values.map(String)
  if (ref.attr === by) return keys[values.indexOf(String(ref.value))]
  const card = cardOf(pad, ref)
  const v = card?.values[by]
  return v === undefined ? undefined : keys[values.indexOf(v)]
}

/** 'ok' | 'bad' | 'open' for one relation, given the cards on the pad. */
export function relationState (r, pad, attributes) {
  if (!r) return 'open'
  switch (r.type) {
    case 'same': return sameState(pad, r.a, r.b)
    case 'notSame': {
      const s = sameState(pad, r.a, r.b)
      return s === 'ok' ? 'bad' : s === 'bad' ? 'ok' : 'open'
    }
    case 'eitherOr': return combineAny([sameState(pad, r.a, r.b), sameState(pad, r.a, r.c)])
    case 'anyOf': return combineAny((r.rules || []).map(x => relationState(x, pad, attributes)))
    case 'allOf': return combineAll((r.rules || []).map(x => relationState(x, pad, attributes)))
    case 'not': {
      const s = relationState(r.rules?.[0], pad, attributes)
      return s === 'ok' ? 'bad' : s === 'bad' ? 'ok' : 'open'
    }
    default: break
  }
  const attribute = attributes[r.by]
  const keys = attribute && orderKeys(attribute)
  if (!keys) return 'open'
  const refs = r.type === 'sum' ? [r.a, r.b, r.c] : [r.a, r.b]
  const k = refs.map(ref => keyAlong(pad, ref, r.by, attributes, keys))
  if (k.some(x => x === undefined)) return 'open'
  if (r.type === 'sum') return Math.abs(k[0].key + k[1].key - k[2].key) < EPS ? 'ok' : 'bad'
  return orderHolds(r.type, k[0], k[1], r.offset, r.abs, r.factor) ? 'ok' : 'bad'
}

/** State of a whole clue (all its relations). */
export const clueState = (relations, pad, attributes) =>
  combineAll(relations.map(r => relationState(r, pad, attributes)))

/**
 * Links to draw for one relation: { from, to, kind, maybe, relation }, from/to
 * being card ids. kind: 'order' (from = smaller), 'sym', 'same', 'not'.
 * Links inside one card or to values not on the pad are left out.
 */
export function relationLinks (r, pad, maybe = false) {
  if (!r) return []
  const link = (a, b, kind, relation = r) => {
    const ca = cardOf(pad, a)
    const cb = cardOf(pad, b)
    return ca && cb && ca !== cb ? [{ from: ca.id, to: cb.id, kind, maybe, relation }] : []
  }
  switch (r.type) {
    case 'same': return link(r.a, r.b, 'same')
    case 'notSame': return link(r.a, r.b, 'not')
    case 'eitherOr': return [...link(r.a, r.b, 'same'), ...link(r.a, r.c, 'same')].map(l => ({ ...l, maybe: true }))
    case 'anyOf': return (r.rules || []).flatMap(x => relationLinks(x, pad, true))
    case 'allOf': return (r.rules || []).flatMap(x => relationLinks(x, pad, maybe))
    case 'sum': return [...link(r.a, r.c, 'order'), ...link(r.b, r.c, 'order')]
    default: break
  }
  const o = orientRelation(r)
  return o ? link(o.left, o.right, o.sym ? 'sym' : 'order') : []
}

// --- "=" bonds -----------------------------------------------------------------
// A definite "same" of a clue on the pad joins its two values for good: they
// sit on one card and move together (no "maybe" from anyOf / eitherOr / not).

/** [[refA, refB], ...] for the definite "same" relations among `relations`. */
export function sameBonds (relations) {
  const out = []
  const visit = (r) => {
    if (!r) return
    if (r.type === 'allOf') return (r.rules || []).forEach(visit)
    if (r.type === 'same' && isValueRef(r.a) && isValueRef(r.b) && r.a.attr !== r.b.attr) out.push([r.a, r.b])
  }
  ;(relations || []).forEach(visit)
  return out
}

const sameRef = (p, q) => p.attr === q.attr && String(p.value) === String(q.value)

/**
 * The values that move with `ref`: itself and every value bonded to it (also
 * through others) that is on the same card.
 */
export function boundRefs (pad, ref, bonds) {
  const card = cardOf(pad, ref)
  const group = [{ attr: ref.attr, value: String(ref.value) }]
  if (!card) return group
  for (let k = 0; k < group.length; k++) {
    for (const [a, b] of bonds) {
      for (const [p, q] of [[a, b], [b, a]]) {
        if (!sameRef(p, group[k]) || group.some(g => sameRef(g, q))) continue
        if (cardOf(pad, q) === card) group.push({ attr: q.attr, value: String(q.value) })
      }
    }
  }
  return group
}

// --- Card parts (what was joined) ----------------------------------------------

/** The parts of a card as lists of attribute keys, every value in exactly one. */
export function partsOf (card) {
  const keys = Object.keys(card.values)
  const seen = new Set()
  const parts = (Array.isArray(card.parts) ? card.parts : [])
    .map(part => (Array.isArray(part) ? part : []).map(String).filter((k) => {
      if (!keys.includes(k) || seen.has(k)) return false
      seen.add(k)
      return true
    }))
    .filter(part => part.length)
  const rest = keys.filter(k => !seen.has(k))
  if (rest.length) {
    if (parts.length) parts[0].push(...rest)
    else parts.push(rest)
  }
  return parts
}

// --- Changing the pad (all return a new pad) ---------------------------------

const cloneCard = c => ({
  ...c,
  values: { ...c.values },
  parts: partsOf(c),
  crossed: Object.fromEntries(Object.entries(c.crossed || {}).map(([k, v]) => [k, [...v]]))
})
const clone = pad => ({ ...pad, cards: pad.cards.map(cloneCard), clues: [...pad.clues] })
const dropEmpty = pad => ({
  ...pad,
  cards: pad.cards.filter(c => Object.keys(c.values).length).map(c => ({ ...c, parts: partsOf(c) }))
})
const asList = refs => (Array.isArray(refs) ? refs : [refs]).filter(isValueRef)

function takeOff (pad, ref) {
  const card = cardOf(pad, ref)
  if (card) delete card.values[ref.attr]
}

/**
 * Put values (one ref or a list) on a card. A value of the same category
 * already there goes off the pad. Values that came from another card join as
 * their own part, so the card shows what was joined and it can be split again.
 */
export function addToCard (pad, refs, cardId) {
  const list = asList(refs)
  const next = clone(pad)
  const card = next.cards.find(c => c.id === cardId)
  if (!card || !list.length) return pad
  const fromOtherCard = list.some((ref) => {
    const c = cardOf(next, ref)
    return c && c !== card
  })
  list.forEach(ref => takeOff(next, ref))
  const keys = list.map(ref => String(ref.attr))
  card.parts = card.parts.map(part => part.filter(k => !keys.includes(k))).filter(part => part.length)
  for (const ref of list) {
    card.values[ref.attr] = String(ref.value)
    delete card.crossed[ref.attr]
  }
  if (fromOtherCard || !card.parts.length) card.parts.push(keys)
  else card.parts[0].push(...keys)
  return dropEmpty(next)
}

/** A new card with the given values (one ref or a list, taken off their old cards). */
export function newCard (pad, refs, x, y) {
  const list = asList(refs)
  if (!list.length) return pad
  const next = clone(pad)
  list.forEach(ref => takeOff(next, ref))
  next.cards.push({
    id: next.nextId,
    x,
    y,
    values: Object.fromEntries(list.map(ref => [ref.attr, String(ref.value)])),
    parts: [list.map(ref => String(ref.attr))],
    crossed: {}
  })
  next.nextId += 1
  return dropEmpty(next)
}

export function removeValue (pad, refs) {
  const next = clone(pad)
  asList(refs).forEach(ref => takeOff(next, ref))
  return dropEmpty(next)
}

export function removeCard (pad, id) {
  return { ...pad, cards: pad.cards.filter(c => c.id !== id) }
}

export function moveCard (pad, id, x, y) {
  return { ...pad, cards: pad.cards.map(c => (c.id === id ? { ...c, x, y } : c)) }
}

/** Would joining the two cards put two values of one category together? */
export function cardsClash (pad, fromId, intoId) {
  const from = pad.cards.find(c => c.id === fromId)
  const into = pad.cards.find(c => c.id === intoId)
  return !from || !into || from === into || conflict(from, into)
}

/** Would putting these values on the card replace a value already there? */
export function valuesClash (pad, refs, cardId) {
  const card = pad.cards.find(c => c.id === cardId)
  return !!card && asList(refs).some(ref => card.values[ref.attr] !== undefined && card.values[ref.attr] !== String(ref.value))
}

/** Put two cards together (fails, returning null, if they clash). */
export function mergeCards (pad, fromId, intoId) {
  if (cardsClash(pad, fromId, intoId)) return null
  const from = pad.cards.find(c => c.id === fromId)
  const into = pad.cards.find(c => c.id === intoId)
  const crossed = Object.fromEntries(Object.entries(into.crossed || {}).map(([k, v]) => [k, [...v]]))
  for (const [k, vs] of Object.entries(from.crossed || {})) crossed[k] = [...new Set([...(crossed[k] || []), ...vs])]
  for (const k of Object.keys({ ...into.values, ...from.values })) delete crossed[k]
  return {
    ...pad,
    cards: pad.cards
      .filter(c => c.id !== fromId)
      .map(c => (c.id === intoId
        ? { ...c, values: { ...c.values, ...from.values }, parts: [...partsOf(c), ...partsOf(from)], crossed, notes: !!(c.notes || from.notes) }
        : c))
  }
}

/** Take part `index` off a card again, as a new card at (x, y). */
export function splitPart (pad, cardId, index, x, y) {
  const card = pad.cards.find(c => c.id === cardId)
  const parts = card && partsOf(card)
  if (!parts || parts.length < 2 || !parts[index]) return pad
  return newCard(pad, parts[index].map(k => ({ attr: Number(k), value: card.values[k] })), x, y)
}

/** Rule a value out for a card, or back in. */
export function toggleCrossed (pad, cardId, ref) {
  return {
    ...pad,
    cards: pad.cards.map((c) => {
      if (c.id !== cardId) return c
      const crossed = { ...(c.crossed || {}) }
      const list = new Set(crossed[ref.attr] || [])
      const value = String(ref.value)
      if (list.has(value)) list.delete(value)
      else list.add(value)
      if (list.size) crossed[ref.attr] = [...list]
      else delete crossed[ref.attr]
      return { ...c, crossed }
    })
  }
}

/** Open or close a card's candidate list. */
export function toggleNotes (pad, cardId) {
  return { ...pad, cards: pad.cards.map(c => (c.id === cardId ? { ...c, notes: !c.notes } : c)) }
}

export function removeClue (pad, index) {
  return { ...pad, clues: pad.clues.filter(i => i !== index) }
}

/**
 * Pull a clue onto the pad. Its values that are not on the pad yet get cards:
 * next to the card they are compared with (smaller left, bigger right), on
 * the card they belong to ("same"; two cards it names are put together), or
 * at a free spot near (x, y). `freeSpot(pad, x, y)` finds room for a new card.
 */
export function addClue (pad, index, relations, x, y, freeSpot) {
  if (pad.clues.includes(index)) return pad
  let next = clone(pad)
  next.clues.push(index)
  const STEP = 240
  const place = (ref, near, dx) => {
    if (cardOf(next, ref)) return
    const anchor = near && cardOf(next, near)
    const spot = anchor ? freeSpot(next, anchor.x + dx, anchor.y) : freeSpot(next, x, y)
    next = newCard(next, ref, spot.x, spot.y)
  }
  const visit = (r) => {
    if (!r) return
    if (Array.isArray(r.rules) && r.type !== 'not') return r.rules.forEach(visit)
    if (r.type === 'same' && isValueRef(r.a) && isValueRef(r.b) && r.a.attr !== r.b.attr) {
      if (!cardOf(next, r.a) && !cardOf(next, r.b)) place(r.a)
      const a = cardOf(next, r.a)
      const b = cardOf(next, r.b)
      if (a && !b && a.values[r.b.attr] === undefined) { next = addToCard(next, r.b, a.id); return }
      if (b && !a && b.values[r.a.attr] === undefined) { next = addToCard(next, r.a, b.id); return }
      if (a && b && a !== b) { next = mergeCards(next, b.id, a.id) || next; return }
    }
    const o = orientRelation(r)
    if (o) {
      place(o.left, o.right, -STEP)
      place(o.right, o.left, STEP)
      return
    }
    refsOf(r).forEach((ref, k) => place(ref, refsOf(r)[0], k ? STEP : 0))
  }
  ;(relations || []).forEach(visit)
  return next
}
