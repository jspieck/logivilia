// Colours of a Logikrätsel's categories, by attribute index: relation chips
// under the clues and the category names in the helper grid share them.
// `fg` on `bg` keeps at least 4.5:1 contrast; `dot` is the strong tone.

const PALETTE = [
  { fg: '#4b33a8', bg: '#efeafd', dot: '#7957d5' }, // violet
  { fg: '#0d5f58', bg: '#dcf2ee', dot: '#14a090' }, // teal
  { fg: '#7a4300', bg: '#fdeed6', dot: '#e08a12' }, // amber
  { fg: '#1c4f96', bg: '#e3edfb', dot: '#3b7dd8' }, // blue
  { fg: '#8a1f4f', bg: '#fbe6ef', dot: '#d4548a' }, // pink
  { fg: '#3d5a12', bg: '#e9f3dc', dot: '#6e9a2c' } // green
]

const NEUTRAL = { fg: '#3d3a52', bg: '#f1eff7', dot: '#8b879e' }

/** @param {number} index attribute index */
export function categoryColor (index) {
  return Number.isInteger(index) && index >= 0 ? PALETTE[index % PALETTE.length] : NEUTRAL
}
