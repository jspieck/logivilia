// Pointer input for an SVG grid, shared by the grid boards.
//
// Turns mouse, pen and touch input into cell coordinates and calls
// onStart(cell, event) / onMove(cell, event) / onEnd(event). Uses Pointer
// Events with pointer capture, so one code path serves mouse and touch, and a
// drag keeps working when it leaves the grid (cells are clamped to the edge).
// onMove fires only when the pointer enters a different cell.
//
// Usage: <svg v-on="pointer.handlers" style="touch-action: none">

import { ref, unref } from 'vue'

/**
 * @param {object} options
 * @param {import('vue').Ref<number>|number} options.cellSize  cell size in px
 * @param {import('vue').Ref<number>|number} options.width   grid width in cells
 * @param {import('vue').Ref<number>|number} options.height  grid height in cells
 * @param {(cell: {x: number, y: number}, event: PointerEvent) => void} [options.onStart]
 * @param {(cell: {x: number, y: number}, event: PointerEvent) => void} [options.onMove]
 * @param {(event: PointerEvent) => void} [options.onEnd]
 * @param {() => void} [options.onCancel]  the stroke was dropped (see cancel())
 * @param {() => boolean} [options.enabled]  input is ignored while this returns false
 */
export function useGridPointer ({ cellSize, width, height, onStart, onMove, onEnd, onCancel, enabled = () => true }) {
  const active = ref(false)
  let pointerId = null
  let last = null

  const cellFromEvent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const size = unref(cellSize)
    const clamp = (value, max) => Math.min(Math.max(value, 0), max - 1)
    return {
      x: clamp(Math.floor((event.clientX - rect.left) / size), unref(width)),
      y: clamp(Math.floor((event.clientY - rect.top) / size), unref(height))
    }
  }

  const finish = (event) => {
    if (!active.value || event.pointerId !== pointerId) return
    active.value = false
    pointerId = null
    last = null
    onEnd && onEnd(event)
  }

  // Drops the stroke in progress without onEnd, e.g. when a second finger
  // turns it into a pinch. The finger still down does nothing more.
  const cancel = () => {
    if (!active.value) return
    active.value = false
    pointerId = null
    last = null
    onCancel && onCancel()
  }

  const handlers = {
    pointerdown (event) {
      // One pointer at a time; ignore a second finger and middle clicks.
      if (active.value || !enabled() || event.button === 1) return
      event.preventDefault()
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* pointer already gone */ }
      active.value = true
      pointerId = event.pointerId
      last = cellFromEvent(event)
      onStart && onStart(last, event)
    },
    pointermove (event) {
      if (!active.value || event.pointerId !== pointerId) return
      const cell = cellFromEvent(event)
      if (cell.x === last.x && cell.y === last.y) return
      last = cell
      onMove && onMove(cell, event)
    },
    pointerup: finish,
    pointercancel: finish,
    lostpointercapture: finish,
    // Right-click paints "empty" on some boards, so no context menu.
    contextmenu (event) {
      event.preventDefault()
    }
  }

  return { handlers, active, cancel }
}
