// Undo/redo for a board state. Keeps copies of whole states (boards are at
// most 100x100 cells, so a snapshot per move is cheap).
//
//   const history = useHistory()
//   history.reset(grid)            // new puzzle
//   history.push(grid)             // after each finished move
//   grid = history.undo() ?? grid  // null when there is nothing to undo

import { ref, computed } from 'vue'

const copy = state => (Array.isArray(state) ? state.map(item => (Array.isArray(item) ? [...item] : item)) : state)

export function useHistory () {
  const states = ref([])
  const index = ref(-1)

  const reset = (state) => {
    states.value = [copy(state)]
    index.value = 0
  }

  const push = (state) => {
    // A new move after undoing drops the redo branch.
    states.value = states.value.slice(0, index.value + 1)
    states.value.push(copy(state))
    index.value = states.value.length - 1
  }

  const undo = () => {
    if (index.value <= 0) return null
    index.value -= 1
    return copy(states.value[index.value])
  }

  const redo = () => {
    if (index.value >= states.value.length - 1) return null
    index.value += 1
    return copy(states.value[index.value])
  }

  return {
    reset,
    push,
    undo,
    redo,
    canUndo: computed(() => index.value > 0),
    canRedo: computed(() => index.value < states.value.length - 1)
  }
}
