<template>
  <div class="board">
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
            :title="index === dotIndex ? 'Als leer markieren' : undefined"
            @click="selectedColor = index"
          >
            <div v-if="index === dotIndex" class="empty-cell-dot"></div>
          </button>
        </div>
      </div>

      <div class="control-card">
        <div class="control-label">Zoom</div>
        <div class="size-controls">
          <button class="size-button" @click="zoom.zoomOut"><ion-icon name="remove-outline"></ion-icon></button>
          <button class="size-button" @click="zoom.zoomIn"><ion-icon name="add-outline"></ion-icon></button>
        </div>
      </div>

      <div class="control-card">
        <div class="control-label">Rückgängig</div>
        <div class="size-controls">
          <button class="size-button" :disabled="!history.canUndo.value" @click="undo">
            <ion-icon name="return-up-back-outline"></ion-icon>
          </button>
          <button class="size-button" :disabled="!history.canRedo.value" @click="redo">
            <ion-icon name="refresh"></ion-icon>
          </button>
        </div>
      </div>
    </div>

    <div class="grid-area">
      <table class="nonoGrid">
        <tr>
          <td></td>
          <td>
            <!-- Column clues -->
            <svg v-if="!solved" :height="columnClueDepth * cell + 8" :width="width * cell + 1">
              <template v-for="(clues, x) in columnClueCells" :key="`col-${x}`">
                <g v-for="(block, i) in clues" :key="i" class="clue"
                   :transform="`translate(${x * cell}, ${i * cell})`" @click="selectClueColor(block)">
                  <rect :width="cell" :height="cell" :fill="block.background" />
                  <text :x="cell / 2" :y="cell / 2" :fill="block.color" dominant-baseline="middle"
                        text-anchor="middle" :style="`font-size: ${fontSize}px`">{{ block.length || '' }}</text>
                </g>
                <rect :x="x * cell" :y="columnClueDepth * cell" :width="cell" height="7"
                      :fill="INDICATOR[columnOk[x] ? 1 : 0]" />
              </template>
              <rect :width="width * cell + 1" :height="columnClueDepth * cell" fill="url(#nonoGrid)" style="pointer-events: none" />
            </svg>
          </td>
        </tr>
        <tr>
          <td>
            <!-- Row clues -->
            <svg v-if="!solved" :width="rowClueDepth * cell + 8" :height="height * cell + 1">
              <template v-for="(clues, y) in rowClueCells" :key="`row-${y}`">
                <g v-for="(block, i) in clues" :key="i" class="clue"
                   :transform="`translate(${i * cell}, ${y * cell})`" @click="selectClueColor(block)">
                  <rect :width="cell" :height="cell" :fill="block.background" />
                  <text :x="cell / 2" :y="cell / 2" :fill="block.color" dominant-baseline="middle"
                        text-anchor="middle" :style="`font-size: ${fontSize}px`">{{ block.length || '' }}</text>
                </g>
                <rect :x="rowClueDepth * cell" :y="y * cell" width="7" :height="cell"
                      :fill="INDICATOR[rowOk[y] ? 1 : 0]" />
              </template>
              <rect :width="rowClueDepth * cell" :height="height * cell + 1" fill="url(#nonoGrid)" style="pointer-events: none" />
            </svg>
          </td>
          <td>
            <!-- Main grid -->
            <svg :class="solved ? 'solved' : 'main-grid'" :width="width * cell + 1" :height="height * cell + 1"
                 v-on="pointer.handlers">
              <defs>
                <pattern id="nonoSmallGrid" :width="cell" :height="cell" patternUnits="userSpaceOnUse">
                  <path :d="`M ${cell} 0 L 0 0 0 ${cell}`" fill="none" stroke="#d7dadd" stroke-width="1" />
                </pattern>
                <pattern id="nonoGrid" :width="cell * 5" :height="cell * 5" patternUnits="userSpaceOnUse">
                  <rect :width="cell * 5" :height="cell * 5" fill="url(#nonoSmallGrid)" />
                  <path :d="`M ${cell * 5} 0 L 0 0 0 ${cell * 5}`" fill="none" stroke="black" stroke-width="2" />
                </pattern>
              </defs>
              <template v-for="y in height" :key="`r${y}`">
                <g v-for="x in width" :key="`c${x}`" :transform="`translate(${(x - 1) * cell}, ${(y - 1) * cell})`">
                  <rect :width="cell" :height="cell" :fill="colors[grid[(y - 1) * width + x - 1]]" />
                  <circle v-if="!solved && grid[(y - 1) * width + x - 1] === dotIndex"
                          :cx="cell / 2" :cy="cell / 2" r="3" />
                </g>
              </template>
              <rect v-if="!solved" width="100%" height="100%" fill="url(#nonoGrid)" style="pointer-events: none" />
            </svg>
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup>
// Nonogram board. Encoding in the UI: colour k of the puzzle is index k - 1,
// `background` is the last puzzle colour, and one extra index (`dotIndex`,
// white with a dot) marks cells the player knows are empty. The shared
// plugin (shared/puzzles/nonogram.js) decides whether a line matches its
// clues, exactly as the server does.

import { ref, computed, watch } from 'vue'
import { lineMatches } from '@shared/puzzles/index.js'
import { useGridPointer } from '../engine/useGridPointer'
import { useHistory } from '../engine/useHistory'
import { useZoom } from '../engine/useZoom'
import { textColorFor } from '../engine/colors'

const props = defineProps({
  puzzle: { type: Object, required: true },
  submit: { type: Function, required: true }
})
const emit = defineEmits(['solved'])

const INDICATOR = ['#ff0000', '#00ff00']

const zoom = useZoom({ base: 25, min: 15, step: 5 })
const cell = zoom.cellSize
const fontSize = computed(() => Math.max(18 + 3 * zoom.level.value, 12))
const history = useHistory()

const width = computed(() => Number(props.puzzle.width))
const height = computed(() => Number(props.puzzle.height))
const colors = computed(() => [...props.puzzle.colors, '#FFFFFF'])
const background = computed(() => colors.value.length - 2)
const dotIndex = computed(() => colors.value.length - 1)

const selectedColor = ref(0)
const solved = ref(false)
const grid = ref([])
const rowOk = ref([])
const columnOk = ref([])

// Clue blocks for display, padded at the front so all lines are equally long.
const clueCells = (lines) => {
  const depth = Math.max(1, ...lines.map(line => line.length))
  return lines.map(line => [
    ...Array.from({ length: depth - line.length }, () => ({ colour: null, length: 0, background: '#fff', color: '#fff' })),
    ...line.map(([colour, length]) => ({
      colour: colour - 1,
      length,
      background: colors.value[colour - 1],
      color: textColorFor(colors.value[colour - 1])
    }))
  ])
}
const rowClueCells = computed(() => clueCells(props.puzzle.rowClues || []))
const columnClueCells = computed(() => clueCells(props.puzzle.columnClues || []))
const rowClueDepth = computed(() => rowClueCells.value[0]?.length || 0)
const columnClueDepth = computed(() => columnClueCells.value[0]?.length || 0)

const selectClueColor = (block) => {
  if (block.colour != null) selectedColor.value = block.colour
}

// UI value -> stored encoding (0 = empty, k = colour k).
const stored = value => (value >= background.value ? 0 : value + 1)
const row = y => grid.value.slice(y * width.value, (y + 1) * width.value).map(stored)
const column = x => Array.from({ length: height.value }, (_, y) => stored(grid.value[y * width.value + x]))

/** The grid in the stored encoding, as the server expects it. */
const answer = () => Array.from({ length: height.value }, (_, y) => row(y))

const checkLines = () => {
  rowOk.value = (props.puzzle.rowClues || []).map((clues, y) => lineMatches(row(y), clues))
  columnOk.value = (props.puzzle.columnClues || []).map((clues, x) => lineMatches(column(x), clues))
  if (!solved.value && rowOk.value.every(Boolean) && columnOk.value.every(Boolean)) {
    solved.value = true
    emit('solved')
    // The clues prove it is solved; this records it for logged-in players.
    props.submit(answer())
  }
}

const reset = () => {
  grid.value = new Array(width.value * height.value).fill(background.value)
  solved.value = false
  history.reset(grid.value)
  checkLines()
}
watch(() => props.puzzle, reset, { immediate: true })

// Drag-fill: paint the rectangle between the start cell and the current
// cell, starting from the grid as it was before the drag.
let start = null
let before = null
let paint = 0
const fillTo = ({ x, y }) => {
  const next = [...before]
  for (let yy = Math.min(start.y, y); yy <= Math.max(start.y, y); yy++) {
    for (let xx = Math.min(start.x, x); xx <= Math.max(start.x, x); xx++) {
      next[yy * width.value + xx] = paint
    }
  }
  grid.value = next
}

const pointer = useGridPointer({
  cellSize: cell,
  width,
  height,
  enabled: () => !solved.value,
  onStart (cellPos, event) {
    start = cellPos
    before = [...grid.value]
    // Right button paints the background.
    paint = event.button === 2 ? background.value : selectedColor.value
    fillTo(cellPos)
  },
  onMove: fillTo,
  onEnd () {
    history.push(grid.value)
    checkLines()
  }
})

const undo = () => {
  const state = history.undo()
  if (state) { grid.value = state; checkLines() }
}
const redo = () => {
  const state = history.redo()
  if (state) { grid.value = state; checkLines() }
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

.empty-cell-dot {
  width: 6px;
  height: 6px;
  background-color: #000;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.color-button {
  position: relative;
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

  &:hover:not(:disabled) {
    background: #e0e0e0;
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
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

.nonoGrid {
  border-spacing: 0;
  border-collapse: collapse;

  td {
    padding: 0;
    vertical-align: bottom;
  }

  td:first-child {
    text-align: right;
  }
}

.clue {
  cursor: pointer;
}

.main-grid {
  cursor: pointer;
  touch-action: none;
}
</style>
