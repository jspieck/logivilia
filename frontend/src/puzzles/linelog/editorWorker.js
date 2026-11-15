// Runs the linelog analysis and generator off the main thread, so drawing in
// the editor never stutters while the solver works. Messages:
//   in:  { id, kind: 'analyze', picture, paths }
//        { id, kind: 'generate', picture, paths, maxNumber, seed }
//        { id, kind: 'layout', picture, information }
//   out: { id, result } or { id, error }
import { analyze, generate, layoutFor } from '@shared/puzzles/linelogEditor.js'

self.onmessage = ({ data }) => {
  const { id, kind, picture, paths, maxNumber, seed, information } = data
  try {
    const result = kind === 'generate'
      ? generate(picture, paths, { maxNumber, seed })
      : kind === 'layout'
        ? layoutFor(picture, information)
        : analyze(picture, paths)
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: String(error) })
  }
}
