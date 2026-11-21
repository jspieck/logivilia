// An ordering relation of a Logikrätsel clue, turned so that the smaller value
// comes first: "A is 4 € cheaper than B" and "B costs 4 € more than A" both
// read A < B. With the smaller value always on the left, clues chain
// (A < B, B < C -> A < B < C) instead of needing signs like "−4".
//
// Returns null for relations that are not a comparison between two values
// (same, notSame, sum, groups, ...).
//   { left, right, sym, kind, n }
//   sym:  true when the relation has no direction (next to, "4 apart")
//   kind: 'lt' | 'directly' | 'gap' | 'times' | 'nextTo'
//   n:    the gap / factor for 'gap' and 'times'

import { orderMode } from '@shared/puzzles/logicalSolver.js'

const round = x => Math.round(x * 1000) / 1000

/** Unit after the numbers of a numeric category ("5€" -> "€"), if all agree. */
export function unitOf (attribute) {
  if (!attribute || orderMode(attribute) !== 'numeric') return ''
  const units = new Set(attribute.values.map(v => String(v).replace(/^[^\d-]*-?[\d.,]+\s*/, '').trim()))
  const [unit] = units
  return units.size === 1 && unit && unit.length <= 3 ? unit : ''
}

export function orientRelation (r) {
  if (!r) return null
  switch (r.type) {
    case 'before': return { left: r.a, right: r.b, sym: false, kind: 'lt' }
    case 'after': return { left: r.b, right: r.a, sym: false, kind: 'lt' }
    case 'directlyBefore': return { left: r.a, right: r.b, sym: false, kind: 'directly' }
    case 'directlyAfter': return { left: r.b, right: r.a, sym: false, kind: 'directly' }
    case 'nextTo': return { left: r.a, right: r.b, sym: true, kind: 'nextTo' }
    case 'differsBy': {
      const n = round(Math.abs(r.offset))
      if (r.abs || !r.offset) return { left: r.a, right: r.b, sym: true, kind: 'gap', n }
      // a - b = offset: a positive offset makes a the bigger one.
      return r.offset > 0
        ? { left: r.b, right: r.a, sym: false, kind: 'gap', n }
        : { left: r.a, right: r.b, sym: false, kind: 'gap', n }
    }
    case 'times': {
      // a = b * factor
      if (r.factor >= 1) return { left: r.b, right: r.a, sym: false, kind: 'times', n: round(r.factor) }
      return { left: r.a, right: r.b, sym: false, kind: 'times', n: round(1 / r.factor) }
    }
    default: return null
  }
}

const format = n => String(n).replace('.', ',')

/**
 * Short text for the extra part of an oriented relation ("4 €", "×2",
 * "direkt"), or '' for a plain "<". Without a unit the category name is the
 * unit: "5 Seiten" (numbers read best before their unit).
 * @param {ReturnType<typeof orientRelation>} o
 * @param {string} unit
 * @param {(key: string) => string} t
 * @param {string} [category] category name, used when there is no unit
 */
export function orientDetail (o, unit, t, category = '') {
  if (!o) return ''
  const u = unit || category
  switch (o.kind) {
    case 'directly': return t('relations.directly')
    case 'gap': return u ? `${format(o.n)} ${u}` : format(o.n)
    case 'times': return `×${format(o.n)}`
    case 'nextTo': return t('relations.nextTo')
    default: return ''
  }
}

/**
 * The text written on the arrow of an oriented relation (it points from the
 * smaller value to the bigger one): "+5 Seiten", "+2 €", "Kosten ×2",
 * "Kosten" for a plain "<"; for one without direction "±5 Seiten", "Nachbar".
 * @param {ReturnType<typeof orientRelation>} o
 * @param {{ name: string, values: string[] } | undefined} attribute the `by` category
 * @param {(key: string) => string} t
 */
export function orientText (o, attribute, t) {
  if (!o) return ''
  const cat = attribute?.name?.trim() || ''
  const unit = unitOf(attribute)
  const detail = orientDetail(o, unit, t, cat)
  switch (o.kind) {
    case 'gap': return `${o.sym ? '±' : '+'}${detail}`
    case 'times': return cat ? `${cat} ${detail}` : detail
    case 'directly': return cat ? `${cat} · ${detail}` : detail
    case 'nextTo': return cat ? `${detail} (${cat})` : detail
    default: return cat
  }
}
