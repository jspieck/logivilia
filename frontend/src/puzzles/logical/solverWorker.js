// Runs the Logikrätsel solver off the main thread, so typing in the editor
// never stutters while it searches. Messages:
//   in:  { id, request, puzzle: { attributes, rules } }
//   out: { id, request, result }   (result of solveLogical, limit 2)
// `request` is passed back unchanged, so the editor can tell which state of
// the puzzle an answer belongs to.
import { solveLogical } from '@shared/puzzles/logicalSolver.js'

self.onmessage = ({ data }) => {
  const { id, request, puzzle } = data
  try {
    self.postMessage({ id, request, result: solveLogical(puzzle, { limit: 2, maxMillis: 5000 }) })
  } catch (error) {
    self.postMessage({ id, request, error: String(error) })
  }
}
