// A saved Logikrätsel game (LogicalDisplay saveState) with its values mapped
// between the language shown and the German original
// (@shared/puzzles/logicalTranslation.js). Games are stored with the German
// values, so they survive switching the language.
//
// map: (attr, value) => value, e.g. toCanonical or fromCanonical.

const mapKeyed = (values, map) => Object.fromEntries(
  Object.entries(values || {}).map(([attr, value]) => [attr, value == null ? value : map(Number(attr), value)])
)

const mapCard = (card, map) => {
  const out = { ...card, values: mapKeyed(card.values, map) }
  if (card.crossed && typeof card.crossed === 'object') {
    out.crossed = Object.fromEntries(Object.entries(card.crossed).map(([attr, list]) =>
      [attr, Array.isArray(list) ? list.map(v => map(Number(attr), v)) : list]))
  }
  return out
}

export function mapSavedState (state, map) {
  if (!state || typeof state !== 'object') return state
  const attrInputs = {}
  for (const [key, value] of Object.entries(state.attrInputs || {})) {
    // Key `${row}_${j}`: column j of the table is attribute j + 1.
    const attr = Number(key.split('_')[1]) + 1
    attrInputs[key] = value == null ? value : map(attr, value)
  }
  const pad = state.pad && Array.isArray(state.pad.cards)
    ? { ...state.pad, cards: state.pad.cards.map(card => (card && typeof card === 'object' ? mapCard(card, map) : card)) }
    : state.pad
  return { ...state, attrInputs, pad }
}

/** The answer table (rows of values, attribute j in column j) mapped. */
export const mapTable = (table, map) => table.map(row => row.map((cell, j) => (cell == null ? cell : map(j, cell))))
