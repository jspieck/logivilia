// Zoom for a grid board: the cell size in px, changed in steps.
// `level` counts steps from the base size, so boards can derive their own
// sizes from it (font size, line width, ...).

import { ref, computed } from 'vue'

export function useZoom ({ base = 25, min = 15, step = 5 } = {}) {
  const cellSize = ref(base)

  return {
    cellSize,
    level: computed(() => (cellSize.value - base) / step),
    percent: computed(() => Math.round((cellSize.value / base) * 100)),
    zoomIn: () => { cellSize.value += step },
    zoomOut: () => { cellSize.value = Math.max(cellSize.value - step, min) },
    /** Sets the size directly, e.g. to fit the screen. */
    setCellSize: (size) => { cellSize.value = size }
  }
}
