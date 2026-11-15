// Runs the nonogram analysis off the main thread, so drawing in the editor
// never stutters while the solver works. Messages:
//   in:  { id, kind: 'analyze', grid, colourCount }
//        { id, kind: 'fixes', grid, colourCount, cells }
//   out: { id, result }
import { analyze, suggestFixes } from '@shared/puzzles/nonogramEditor.js'

self.onmessage = ({ data }) => {
  const { id, kind, grid, colourCount, cells } = data
  try {
    const result = kind === 'fixes'
      ? suggestFixes(grid, cells, { colourCount })
      : analyze(grid, { colourCount })
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: String(error) })
  }
}
