<template>
  <div class="board">
    <div class="notification is-warning" role="alert">
      Dieser Rätseltyp befindet sich noch in der Testphase. Es kann zu Fehlern kommen.
    </div>

    <div class="control-panels">
      <div class="control-card">
        <div class="control-label">Farben</div>
        <div class="color-controls">
          <button
            v-for="(color, index) in colors"
            :key="index"
            class="color-button"
            :style="{ backgroundColor: color }"
            :class="{ active: selectedColor === index }"
            @click="selectedColor = index"
          ></button>
        </div>
      </div>

      <div class="control-card">
        <div class="control-label">Zoom</div>
        <div class="size-controls">
          <button class="size-button" @click="zoomBy(-1)"><ion-icon name="remove-outline"></ion-icon></button>
          <button class="size-button" @click="zoomBy(1)"><ion-icon name="add-outline"></ion-icon></button>
        </div>
      </div>
    </div>

    <div class="grid-area">
      <svg :class="solved ? 'solved' : 'main-grid'" :width="width * cell + 1" :height="height * cell + 1"
           v-on="pointer.handlers">
        <defs>
          <pattern id="linelogSmallGrid" :width="cell" :height="cell" patternUnits="userSpaceOnUse">
            <path :d="`M ${cell} 0 L 0 0 0 ${cell}`" fill="none" stroke="#929292" stroke-width="1" />
          </pattern>
          <pattern id="linelogGrid" :width="cell * 5" :height="cell * 5" patternUnits="userSpaceOnUse">
            <rect :width="cell * 5" :height="cell * 5" fill="url(#linelogSmallGrid)" />
            <path :d="`M ${cell * 5} 0 L 0 0 0 ${cell * 5}`" fill="none" stroke="black" stroke-width="2" />
          </pattern>
        </defs>
        <rect v-if="!solved" width="100%" height="100%" fill="url(#linelogGrid)" style="pointer-events: none" />
        <path v-for="path in paths" :key="`path${path.id}`" class="no-select" :d="pathD(path.cells)"
              :stroke-width="strokeWidth" fill="none" stroke-linejoin="round" :stroke="colors[path.color]" />
        <path v-if="currentPath != null" class="no-select" :d="pathD(currentPath.cells)"
              :stroke-width="strokeWidth" fill="none" stroke-linejoin="round" :stroke="colors[currentPath.color]" />
        <template v-for="(infoRow, y) in information" :key="`row${y}`">
          <g v-for="(number, x) in infoRow" :key="`cell${y}_${x}`" class="no-select"
             :transform="`translate(${cell * x}, ${cell * y})`">
            <rect v-if="solved" :width="cell" :height="cell" :fill="colors[grid[x + width * y]]" />
            <circle v-if="number != 0" :cx="cell / 2" :cy="cell / 2" :r="cell * 0.4" :fill="colors[grid[y * width + x]]" />
            <text v-if="!solved && number != 0" :x="cell / 2" :y="cell / 2" :fill="fontColors[grid[y * width + x]]"
                  dominant-baseline="middle" text-anchor="middle" :style="`font-size: ${fontSize}px`">{{ number }}</text>
          </g>
        </template>
      </svg>
    </div>

    <div v-if="solved" class="solved-banner">
      <img src="@/assets/haken.png" width="40" height="40" alt="" />
      <span>Gratulation! Sie haben dieses Rätsel gelöst!</span>
    </div>
  </div>
</template>

<script setup>
// Linelog board: the player draws paths between equal numbers. A path's
// length must equal the number and its colour is the endpoints' colour.
// UI encoding: colour k of the puzzle is index k - 1; the last colour is the
// background. When every number is connected, the answer goes to the server,
// which compares it with the stored solution (shared/puzzles/linelog.js).

import { ref, computed, watch } from 'vue'
import { useOruga } from '@oruga-ui/oruga-next'
import { useGridPointer } from '../engine/useGridPointer'
import { useZoom } from '../engine/useZoom'
import { textColorFor } from '../engine/colors'

const props = defineProps({
  puzzle: { type: Object, required: true },
  submit: { type: Function, required: true }
})
const emit = defineEmits(['solved'])

const oruga = useOruga()

const zoom = useZoom({ base: 25, min: 15, step: 5 })
const cell = zoom.cellSize
const fontSize = computed(() => Math.max(14 + 3 * zoom.level.value, 12))
const strokeWidth = computed(() => Math.max(11 + 2 * zoom.level.value, 7))

const width = computed(() => Number(props.puzzle.width))
const height = computed(() => Number(props.puzzle.height))
const colors = computed(() => props.puzzle.colors)
const background = computed(() => colors.value.length - 1)
const information = computed(() => props.puzzle.information || [])
const fontColors = computed(() => colors.value.map(color => textColorFor(color)))
// Colour of each numbered cell in UI encoding (the background elsewhere).
const clueColors = computed(() =>
  (props.puzzle.informationColors || []).map(row =>
    row.map(value => (value == 0 ? background.value : value - 1))
  )
)

const selectedColor = ref(0)
const solved = ref(false)
const grid = ref([])
// Index into `paths` of the path through each cell, -1 if none.
const pathIndices = ref([])
const paths = ref({})
const nextPathId = ref(0)
const currentPath = ref(null)
const isDrawing = ref(false)
const lastSetCell = ref([0, 0])
const originalCells = ref([])
const pathComplete = ref(false)

const reset = () => {
  const size = width.value * height.value
  grid.value = new Array(size).fill(background.value)
  pathIndices.value = new Array(size).fill(-1)
  paths.value = {}
  nextPathId.value = 0
  currentPath.value = null
  solved.value = false
  information.value.forEach((row, y) => row.forEach((number, x) => {
    if (number != 0) grid.value[x + y * width.value] = clueColors.value[y][x]
  }))
}
watch(() => props.puzzle, reset, { immediate: true })

const errorMessage = (text) => {
  if (!solved.value) {
    oruga.notification.open({ duration: 1000, message: text, position: 'top-right', closable: false, variant: 'danger' })
  }
}

const zoomBy = (direction) => {
  if (direction > 0) zoom.zoomIn()
  else zoom.zoomOut()
  oruga.notification.open({
    duration: 1000, message: `Zoom: ${zoom.percent.value} %`, position: 'top-right', closable: false, variant: 'info', queue: true
  })
}

const pathD = (cells) =>
  cells.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + 0.5) * cell.value} ${(y + 0.5) * cell.value}`).join('')

const endsOf = (pathIndex) => {
  if (pathIndex == -1) return [[0, 0], [0, 0]]
  const cells = paths.value[pathIndex].cells
  return [cells[0], cells[cells.length - 1]]
}

const startPath = ({ x, y }) => {
  const pathIndex = pathIndices.value[y * width.value + x]
  const [[x0, y0], [x1, y1]] = endsOf(pathIndex)
  const correctLength = pathIndex == -1 ? information.value[y][x] : paths.value[pathIndex].correctLength

  // A finished path can only be restarted from one of its numbers.
  if (pathIndex != -1 && information.value[y][x] != 0 &&
      (information.value[y0][x0] == 0 || information.value[y1][x1] == 0)) {
    return
  }
  // Paths can be continued from their ends only, not from the middle.
  if (pathIndex != -1 && !(x0 == x && y0 == y) && !(x1 == x && y1 == y)) {
    return
  }
  isDrawing.value = true
  lastSetCell.value = [x, y]
  const color = grid.value[x + width.value * y]
  currentPath.value = { id: pathIndex, color, correctLength, cells: [[x, y]] }
  selectedColor.value = color
  originalCells.value = []
  if (pathIndex != -1) {
    // Starting on a number redraws the path from there.
    if (information.value[y][x] != 0) {
      if (x0 == x && y0 == y) {
        paths.value[pathIndex].cells = paths.value[pathIndex].cells.reverse()
      }
      for (const [cx, cy] of paths.value[pathIndex].cells) {
        pathIndices.value[cy * width.value + cx] = -1
      }
    }
    originalCells.value = [...paths.value[pathIndex].cells]
    currentPath.value.cells = paths.value[pathIndex].cells
    if (information.value[y][x] != 0) {
      delete paths.value[pathIndex]
    }
  }
}

const extendPath = ({ x, y }) => {
  if (!isDrawing.value || solved.value) return
  const path = currentPath.value
  // Moving back onto the second-to-last cell removes the last one.
  const onPath = path.cells.findIndex(([cx, cy]) => cx == x && cy == y)
  if (onPath != -1) {
    if (onPath == path.cells.length - 2) {
      path.cells.pop()
      lastSetCell.value = [x, y]
      pathComplete.value = false
    }
    return
  }
  const cellColor = grid.value[y * width.value + x]
  const pathIndex = pathIndices.value[y * width.value + x]
  const [[x0, y0], [x1, y1]] = endsOf(pathIndex)
  const correctLength = pathIndex == -1 ? information.value[y][x] : paths.value[pathIndex].correctLength
  const isEnd = (x == x0 && y == y0) || (x == x1 && y == y1)

  let problem = null
  if (pathComplete.value) {
    problem = 'Pfad schon komplett'
  } else if (information.value[y][x] != 0 && selectedColor.value != clueColors.value[y][x]) {
    problem = 'Falsche Farbe'
  } else if (path.cells.length + 1 > path.correctLength) {
    problem = 'Zu langer Pfad'
  } else if (information.value[y][x] != 0 &&
      (correctLength != path.correctLength || correctLength - 1 != path.cells.length)) {
    problem = 'Unterschiedliche Pfadlänge'
  } else if (cellColor != background.value && cellColor != selectedColor.value) {
    problem = 'Feld anders gefärbt'
  } else if (cellColor != background.value && pathIndex != -1 && !isEnd) {
    problem = 'Feld in der Mitte eines anderen Pfades'
  } else if (cellColor != background.value && pathIndex != -1 && isEnd) {
    // Joining another path: the combined path must have the right length.
    if (path.cells.length + paths.value[pathIndex].cells.length != path.correctLength) {
      problem = 'Falsche Länge des kombinierten Pfads'
    } else {
      pathComplete.value = true
    }
  }
  if (problem) {
    errorMessage(problem)
    return
  }
  // Only horizontal or vertical neighbours extend the path.
  if (Math.abs(x - lastSetCell.value[0]) + Math.abs(y - lastSetCell.value[1]) == 1) {
    path.cells.push([x, y])
    lastSetCell.value = [x, y]
  }
}

const setPathIndices = (cells, index) => {
  for (const [x, y] of cells) pathIndices.value[y * width.value + x] = index
}

const finishPath = () => {
  pathComplete.value = false
  if (!isDrawing.value) return
  const path = currentPath.value
  if (path != null) {
    const [x0, y0] = path.cells[0]
    const pathIndex0 = pathIndices.value[y0 * width.value + x0]
    const [x1, y1] = path.cells[path.cells.length - 1]
    const pathIndex1 = pathIndices.value[y1 * width.value + x1]
    // Clear the cells of the path being redrawn.
    for (const [x, y] of originalCells.value) {
      if (information.value[y][x] == 0) grid.value[y * width.value + x] = background.value
      pathIndices.value[y * width.value + x] = -1
    }
    originalCells.value = []
    if (path.cells.length > 1) {
      if (pathIndex1 != -1 && pathIndex0 != pathIndex1) {
        // Ended on another path's end: append to it (minus the shared cell).
        for (let i = path.cells.length - 2; i >= 0; i--) {
          paths.value[pathIndex1].cells.push(path.cells[i])
        }
        setPathIndices(paths.value[pathIndex1].cells, pathIndex1)
      } else {
        setPathIndices(path.cells, nextPathId.value)
        paths.value[nextPathId.value] = path
        nextPathId.value += 1
      }
      for (const [x, y] of path.cells) grid.value[y * width.value + x] = path.color
    }
    if (pathIndex0 != -1) delete paths.value[pathIndex0]
  }
  currentPath.value = null
  isDrawing.value = false
  checkIfSolved()
}

const pointer = useGridPointer({
  cellSize: cell,
  width,
  height,
  enabled: () => !solved.value,
  onStart: startPath,
  onMove: extendPath,
  onEnd: finishPath
})

// Every number > 1 lies on a path, and each path has the right length and
// ends on two numbers. Whether that is the solution is decided by the server.
const allNumbersConnected = () => {
  for (let y = 0; y < information.value.length; y++) {
    for (let x = 0; x < information.value[y].length; x++) {
      if (information.value[y][x] > 1 && pathIndices.value[y * width.value + x] == -1) return false
    }
  }
  return Object.values(paths.value).every(path => {
    const [x0, y0] = path.cells[0]
    const [x1, y1] = path.cells[path.cells.length - 1]
    return path.cells.length == path.correctLength &&
      information.value[y0][x0] != 0 && information.value[y1][x1] != 0
  })
}

/** The grid in the stored encoding (0 = empty, k = colour k). */
const answer = () => Array.from({ length: height.value }, (_, y) =>
  Array.from({ length: width.value }, (_, x) => {
    const value = grid.value[y * width.value + x]
    return value === background.value ? 0 : value + 1
  })
)

const fitToScreen = () => {
  const target = Math.min(Math.max(50, window.screen.width - 50), 500)
  zoom.setCellSize(target / width.value)
}

const checkIfSolved = async () => {
  if (solved.value || !allNumbersConnected()) return
  if (await props.submit(answer())) {
    solved.value = true
    fitToScreen()
    emit('solved')
  } else {
    errorMessage('Alle Zahlen sind verbunden, aber die Lösung stimmt nicht.')
  }
}
</script>

<style lang="scss" scoped>
.control-panels {
  display: flex;
  gap: 20px;
  margin: 5px 0 15px;
  flex-wrap: wrap;
}

.control-card {
  background: white;
  border-radius: 12px;
  padding: 10px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 120px;
  border: 1px solid #dddddd;
}

.control-label {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 0 10px;
  font-size: 14px;
  color: #666;
  border-radius: 12px;
}

.color-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 5px;
}

.color-button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);

  &:hover {
    transform: scale(1.1);
  }

  &.active {
    border-color: #2196F3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
  }
}

.size-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 5px;
}

.size-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #e0e0e0;
    transform: scale(1.1);
  }

  ion-icon {
    font-size: 20px;
    color: #666;
  }
}

.grid-area {
  user-select: none;
  overflow-x: auto;
}

.main-grid {
  cursor: pointer;
  touch-action: none;
}

.no-select {
  pointer-events: none;
}

.solved-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
}
</style>
