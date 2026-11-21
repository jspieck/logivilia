// Two-finger pinch and pan for a grid board on touch screens.
//
// The grid itself has touch-action: none (a one-finger drag paints), so the
// browser neither zooms nor scrolls over it. This brings both back with two
// fingers: spreading them changes the cell size, moving them scrolls the page
// (or the board's own scroll box). The point between the fingers stays under
// the fingers while zooming.
//
// Bind on the element around the grid; pointer events from the grid bubble up
// to it:  <div class="grid-area" v-on="pinch.handlers">
// When the second finger lands, onPinchStart() is called, so the board can
// drop the stroke the first finger began.

import { nextTick } from 'vue'

/**
 * @param {object} options
 * @param {import('vue').Ref<number>} options.cellSize  the zoom's cell size
 * @param {(size: number) => void} options.setCellSize
 * @param {number} [options.min]  smallest cell size in px
 * @param {number} [options.max]  largest cell size in px
 * @param {() => HTMLElement|null} options.grid  the element whose top-left is cell 0/0
 * @param {() => void} [options.onPinchStart]
 */
export function usePinchZoom ({ cellSize, setCellSize, min = 12, max = 64, grid, onPinchStart }) {
  const touches = new Map()
  let pinch = null

  const points = () => [...touches.values()]
  const distance = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y)
  const centre = ([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

  function begin () {
    const pts = points()
    const rect = grid()?.getBoundingClientRect()
    if (!rect) return
    const c = centre(pts)
    pinch = {
      startDistance: Math.max(distance(pts), 1),
      startSize: cellSize.value,
      // The grid point under the fingers, in cells.
      anchor: { x: (c.x - rect.left) / cellSize.value, y: (c.y - rect.top) / cellSize.value }
    }
    onPinchStart && onPinchStart()
  }

  // Vue re-renders once per tick, so a burst of moves costs one render.
  function update () {
    if (!pinch) return
    const pts = points()
    if (pts.length < 2) return
    const size = Math.round(Math.min(Math.max(pinch.startSize * distance(pts) / pinch.startDistance, min), max))
    if (size !== cellSize.value) setCellSize(size)
    const { anchor } = pinch
    const c = centre(pts)
    // After the re-render, scroll so the anchor point is back under the fingers.
    nextTick(() => {
      const el = grid()
      const rect = el?.getBoundingClientRect()
      if (!rect) return
      scrollBy(el, rect.left + anchor.x * cellSize.value - c.x, rect.top + anchor.y * cellSize.value - c.y)
    })
  }

  const handlers = {
    pointerdown (event) {
      if (event.pointerType !== 'touch') return
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (touches.size === 2) {
        // Keep receiving this finger's moves even when it leaves the grid.
        try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* pointer already gone */ }
        begin()
      }
    },
    pointermove (event) {
      const point = touches.get(event.pointerId)
      if (!point) return
      point.x = event.clientX
      point.y = event.clientY
      update()
    },
    pointerup: end,
    pointercancel: end
  }

  function end (event) {
    if (!touches.delete(event.pointerId)) return
    if (touches.size < 2) pinch = null
  }

  return { handlers, isPinching: () => pinch !== null }
}

// Scrolls the nearest scrollable ancestors of `el` (then the window) by
// dx/dy px, each taking as much as it can.
function scrollBy (el, dx, dy) {
  for (let node = el?.parentElement; node && (Math.abs(dx) >= 1 || Math.abs(dy) >= 1); node = node.parentElement) {
    if (node === document.body || node === document.documentElement) break
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowX)) dx -= take(node, 'scrollLeft', dx, node.scrollWidth - node.clientWidth)
    if (/(auto|scroll)/.test(style.overflowY)) dy -= take(node, 'scrollTop', dy, node.scrollHeight - node.clientHeight)
  }
  if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) window.scrollBy(dx, dy)
}

function take (node, prop, delta, limit) {
  const before = node[prop]
  node[prop] = Math.min(Math.max(before + delta, 0), limit)
  return node[prop] - before
}
