<template>
  <div ref="root" class="board" :class="{ 'is-solved': solved, expanded }">
    <div v-if="!solved" class="notification is-warning beta" role="note">
      {{ t('linelog.beta') }}
    </div>

    <div v-if="!solved" class="toolbar">
      <div class="tool-group">
        <button class="tool" :title="t('nonogram.undo')" :disabled="!history.canUndo.value" @click="undo">
          <ion-icon name="return-up-back-outline"></ion-icon>
        </button>
        <button class="tool" :title="t('nonogram.redo')" :disabled="!history.canRedo.value" @click="redo">
          <ion-icon name="return-up-forward-outline"></ion-icon>
        </button>
        <button class="tool" :title="t('nonogram.restart')" @click="restart">
          <ion-icon name="refresh-outline"></ion-icon>
        </button>
      </div>

      <div class="tool-group">
        <button class="tool" :title="t('nonogram.zoomOut')" @click="zoom.zoomOut"><ion-icon name="remove-outline"></ion-icon></button>
        <button class="tool" :title="t('nonogram.zoomIn')" @click="zoom.zoomIn"><ion-icon name="add-outline"></ion-icon></button>
        <button class="tool labelled" :title="expanded ? t('nonogram.closeExpandedTitle') : t('nonogram.expandTitle')"
                :aria-pressed="expanded" @click="toggleExpanded">
          <ion-icon :name="expanded ? 'contract-outline' : 'expand-outline'"></ion-icon>
          <span>{{ expanded ? t('common.close') : t('nonogram.expand') }}</span>
        </button>
      </div>

      <div class="pairs" :title="t('linelog.progressTitle')">
        <ion-icon name="git-commit-outline"></ion-icon>{{ t('linelog.progress', { done: connectedPairs, total: totalPairs }) }}
      </div>
      <div class="timer" :title="t('nonogram.time')"><ion-icon name="time-outline"></ion-icon>{{ formatTime(elapsed) }}</div>
    </div>

    <!-- Always takes its space, so the grid doesn't jump when a message appears. -->
    <p v-if="!solved" class="board-message" :class="[message?.kind, { empty: !message }]" role="status">
      {{ message?.text }}
    </p>

    <div class="grid-area">
      <svg class="main-grid linelog" :class="{ solved }"
           :width="width * cell + 2" :height="height * cell + 2"
           :style="{ cursor: gridCursor }" v-on="gridHandlers">
        <rect :width="width * cell" :height="height * cell" :fill="solved ? backgroundColour : '#ffffff'" />

        <!-- Solved: the picture alone -->
        <template v-if="solved">
          <template v-for="(value, i) in finalGrid" :key="`s${i}`">
            <rect v-if="value !== background" :x="(i % width) * cell" :y="Math.floor(i / width) * cell"
                  :width="cell" :height="cell" :fill="colourOf(value)" />
          </template>
        </template>

        <template v-else>
          <rect v-if="hover && !current" class="hover-cell" :x="hover.x * cell" :y="hover.y * cell" :width="cell" :height="cell" />

          <!-- Light tint under every path, so its shape reads as a picture -->
          <g class="path-tint">
            <template v-for="(path, k) in shownPaths" :key="`t${k}`">
              <rect v-for="([x, y], j) in path.cells" :key="j" :x="x * cell" :y="y * cell"
                    :width="cell" :height="cell" :fill="colourOf(path.color)" />
            </template>
          </g>

          <path :d="gridLines.thin" class="grid-thin" />
          <path :d="gridLines.thick" class="grid-thick" />

          <!-- Paths: a thin dark outline under each, so light colours show on white -->
          <g v-for="(path, k) in shownPaths" :key="`p${k}`" class="path" :class="{ complete: isComplete(path) }">
            <path :d="pathD(path.cells)" class="path-outline" :stroke-width="strokeWidth + 2" />
            <path :d="pathD(path.cells)" :stroke="colourOf(path.color)" :stroke-width="strokeWidth" />
          </g>

          <!-- Numbers that the current path could end on -->
          <circle v-for="c in candidates" :key="`c${c.x}-${c.y}`" class="candidate"
                  :cx="(c.x + 0.5) * cell" :cy="(c.y + 0.5) * cell" :r="cell * 0.47" />

          <!-- Numbers -->
          <g v-for="c in numberCells" :key="`n${c.x}-${c.y}`" class="number" :class="{ connected: c.n === 1 || connected.has(c.i) }"
             :transform="`translate(${c.x * cell}, ${c.y * cell})`">
            <circle :cx="cell / 2" :cy="cell / 2" :r="cell * 0.4" :fill="colourOf(c.color)" />
            <text :x="cell / 2" :y="cell / 2 + 1" :fill="textColourOf(c.color)"
                  :style="{ fontSize: `${c.n > 9 ? cell * 0.42 : cell * 0.52}px` }">{{ c.n }}</text>
          </g>

          <!-- Length of the path being drawn -->
          <g v-if="current" class="drag-count" :transform="`translate(${dragLabel.x}, ${dragLabel.y})`">
            <rect x="-20" y="-11" width="40" height="22" rx="11" :class="{ full: current.cells.length === current.length }" />
            <text>{{ current.cells.length }}/{{ current.length }}</text>
          </g>
        </template>
      </svg>
    </div>

    <p v-if="solved" class="solved-time">{{ t('nonogram.solvedIn', { time: formatTime(elapsed) }) }}</p>
    <p v-else class="help">{{ t('linelog.help') }}</p>
  </div>
</template>

<script setup>
// Linelog board: the player joins pairs of equal numbers with paths whose
// length (in cells, both numbers included) equals the number. A path takes the
// colour of its numbers.
//
// State: a list of paths { color, length, cells: [[x, y], ...] }. cells[0] is
// always a number; a path is complete when it is `length` long and ends on its
// partner. Press a number to start a path, a path's loose end to continue it,
// a complete path's number to pull that end back, or the middle of a path to
// cut it there. Right-click deletes a path. Undo/redo, time and progress are
// saved per puzzle (localStorage, and the server for logged-in players).
//
// UI colour encoding: colour k of the puzzle is index k - 1; the last colour is
// the background. When every number is connected, the answer goes to the
// server, which compares it with the stored solution (shared/puzzles/linelog.js).

import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGridPointer } from '../engine/useGridPointer'
import { useHistory } from '../engine/useHistory'
import { useZoom } from '../engine/useZoom'
import { readProgress, saveProgress, clearProgress, formatTime } from '../engine/progress'
import { textColorFor } from '../engine/colors'

const props = defineProps({
  puzzle: { type: Object, required: true },
  submit: { type: Function, required: true }
})
const emit = defineEmits(['solved'])
const { t } = useI18n()

const root = ref(null)
const zoom = useZoom({ base: 25, min: 14, step: 3 })
const cell = zoom.cellSize
const history = useHistory()

const width = computed(() => Number(props.puzzle.width))
const height = computed(() => Number(props.puzzle.height))
const colors = computed(() => props.puzzle.colors)
const background = computed(() => colors.value.length - 1)
const backgroundColour = computed(() => colors.value[background.value])
const colourOf = k => colors.value[k] || '#000000'
const textColourOf = k => textColorFor(colourOf(k))
const strokeWidth = computed(() => Math.max(cell.value * 0.36, 4))

const numbers = computed(() => (props.puzzle.information || []).map(row => row.map(Number)))
const numberAt = (x, y) => numbers.value[y]?.[x] || 0
// Colour of each numbered cell, UI encoding.
const clueColours = computed(() => (props.puzzle.informationColors || []).map(row =>
  row.map(value => (Number(value) === 0 ? background.value : Number(value) - 1))))
const clueColourAt = (x, y) => clueColours.value[y]?.[x] ?? background.value

const numberCells = computed(() => {
  const list = []
  numbers.value.forEach((row, y) => row.forEach((n, x) => {
    if (n !== 0) list.push({ x, y, n, i: y * width.value + x, color: clueColourAt(x, y) })
  }))
  return list
})
const totalPairs = computed(() => numberCells.value.filter(c => c.n > 1).length / 2)

const paths = ref([])
const current = ref(null)
const solved = ref(false)
const elapsed = ref(0)
const started = ref(false)
const hover = ref(null)
const message = ref(null)
// Großansicht: the board covers the whole window, sized to fit both ways.
const expanded = ref(false)

const same = (a, b) => a[0] === b[0] && a[1] === b[1]
const lastOf = path => path.cells[path.cells.length - 1]
const isComplete = path => {
  if (path.cells.length !== path.length || path.cells.length < 2) return false
  const [x, y] = lastOf(path)
  return numberAt(x, y) === path.length
}

// Index into `paths` of the path through each cell, -1 if none (the path
// being drawn is not in `paths`).
const owner = computed(() => {
  const result = new Array(width.value * height.value).fill(-1)
  paths.value.forEach((path, k) => path.cells.forEach(([x, y]) => { result[y * width.value + x] = k }))
  return result
})
const ownerAt = (x, y) => owner.value[y * width.value + x]

const shownPaths = computed(() => (current.value ? [...paths.value, current.value] : paths.value))

// Cell indices of numbers on a complete path.
const connected = computed(() => {
  const set = new Set()
  for (const path of paths.value) {
    if (!isComplete(path)) continue
    for (const cellXY of [path.cells[0], lastOf(path)]) set.add(cellXY[1] * width.value + cellXY[0])
  }
  return set
})
const connectedPairs = computed(() => paths.value.filter(isComplete).length)

// Numbers the path being drawn can still reach with exactly its remaining length.
const candidates = computed(() => {
  const path = current.value
  if (!path || isComplete(path)) return []
  const [lx, ly] = lastOf(path)
  const remaining = path.length - path.cells.length
  return numberCells.value.filter(c => {
    if (c.n !== path.length || c.color !== path.color || same([c.x, c.y], path.cells[0])) return false
    const k = ownerAt(c.x, c.y)
    if (k !== -1 && isComplete(paths.value[k])) return false
    const distance = Math.abs(c.x - lx) + Math.abs(c.y - ly)
    return distance <= remaining && (remaining - distance) % 2 === 0
  })
})

// The picture: path colours, numbers in their colour, background elsewhere.
const finalGrid = computed(() => {
  const grid = new Array(width.value * height.value).fill(background.value)
  numberCells.value.forEach(c => { grid[c.i] = c.color })
  paths.value.forEach(path => path.cells.forEach(([x, y]) => { grid[y * width.value + x] = path.color }))
  return grid
})

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

const pathD = cells =>
  cells.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + 0.5) * cell.value} ${(y + 0.5) * cell.value}`).join(' ')

const gridLines = computed(() => {
  const w = width.value * cell.value
  const h = height.value * cell.value
  let thin = ''
  let thick = ''
  for (let x = 0; x <= width.value; x++) {
    const d = `M ${x * cell.value} 0 V ${h} `
    if (x % 5 === 0 || x === width.value) thick += d; else thin += d
  }
  for (let y = 0; y <= height.value; y++) {
    const d = `M 0 ${y * cell.value} H ${w} `
    if (y % 5 === 0 || y === height.value) thick += d; else thin += d
  }
  return { thin, thick }
})

const dragLabel = computed(() => {
  if (!current.value) return { x: 0, y: 0 }
  const [x, y] = lastOf(current.value)
  return {
    x: Math.min(Math.max((x + 0.5) * cell.value, 20), width.value * cell.value - 20),
    y: y > 0 ? y * cell.value - 4 : (y + 1) * cell.value + 4
  }
})

const gridCursor = computed(() => {
  if (solved.value) return 'default'
  if (current.value) return 'grabbing'
  const h = hover.value
  return h && (numberAt(h.x, h.y) > 1 || ownerAt(h.x, h.y) !== -1) ? 'pointer' : 'default'
})

// ---------------------------------------------------------------------------
// Progress: localStorage per puzzle, mirrored to the server for logged-in
// players (../engine/progress.js)
// ---------------------------------------------------------------------------

function save () {
  if (solved.value) {
    clearProgress('linelog', props.puzzle.id)
    return
  }
  // Nothing to keep yet (also after "Neu starten").
  if (!started.value) return
  saveProgress('linelog', props.puzzle.id, {
    w: width.value, h: height.value, paths: paths.value, elapsed: elapsed.value
  })
}

const isValidPath = path => path && Number.isInteger(path.color) && Number.isInteger(path.length) &&
  Array.isArray(path.cells) && path.cells.length > 1 &&
  path.cells.every(c => Array.isArray(c) && Number.isInteger(c[0]) && Number.isInteger(c[1]) &&
    c[0] >= 0 && c[1] >= 0 && c[0] < width.value && c[1] < height.value) &&
  numberAt(path.cells[0][0], path.cells[0][1]) === path.length

function load () {
  const saved = readProgress('linelog', props.puzzle.id)
  if (saved && saved.w === width.value && saved.h === height.value &&
      Array.isArray(saved.paths) && saved.paths.every(isValidPath)) {
    return saved
  }
  return null
}

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------

/** The grid in the stored encoding (0 = empty, k = colour k). */
const answer = () => Array.from({ length: height.value }, (_, y) =>
  Array.from({ length: width.value }, (_, x) => {
    const value = finalGrid.value[y * width.value + x]
    return value === background.value ? 0 : value + 1
  }))

const allConnected = () => connectedPairs.value === totalPairs.value

async function checkSolved () {
  if (solved.value || !allConnected()) return
  if (await props.submit(answer(), { seconds: elapsed.value })) {
    solved.value = true
    hover.value = null
    if (expanded.value) toggleExpanded()
    message.value = null
    save()
    emit('solved')
  } else {
    message.value = { kind: 'error', text: t('linelog.errors.wrongSolution') }
  }
}

function reset () {
  const saved = load()
  paths.value = saved ? saved.paths : []
  elapsed.value = saved ? saved.elapsed || 0 : 0
  started.value = Boolean(saved)
  current.value = null
  solved.value = false
  message.value = saved ? { kind: 'info', text: t('common.restored') } : null
  history.reset(JSON.stringify(paths.value))
}
watch(() => props.puzzle, () => { reset(); fitToScreen() }, { immediate: true })

// Same paths regardless of their order and of the direction of complete paths.
const canonical = list => list.map(path => {
  const forward = JSON.stringify(path.cells)
  const backward = isComplete(path) ? JSON.stringify([...path.cells].reverse()) : forward
  return `${path.color}:${forward < backward ? forward : backward}`
}).sort().join('|')

const undo = () => {
  const previous = history.undo()
  if (previous) { message.value = null; paths.value = JSON.parse(previous); save() }
}
const redo = () => {
  const next = history.redo()
  if (next) { message.value = null; paths.value = JSON.parse(next); save(); checkSolved() }
}

function restart () {
  if (started.value && !window.confirm(t('nonogram.restartConfirm'))) return
  clearProgress('linelog', props.puzzle.id)
  reset()
  message.value = null
}

// ---------------------------------------------------------------------------
// Pointer input
// ---------------------------------------------------------------------------

let before = null

const fail = key => {
  message.value = { kind: 'error', text: t(`linelog.errors.${key}`) }
  return false
}
const removePath = k => { paths.value = paths.value.filter((_, i) => i !== k) }

function startDrag ({ x, y }, event) {
  message.value = null
  before = paths.value
  const k = ownerAt(x, y)
  if (event.button === 2) {
    if (k !== -1) removePath(k)
    return
  }
  if (k === -1) {
    const n = numberAt(x, y)
    if (n > 1) current.value = { color: clueColourAt(x, y), length: n, cells: [[x, y]] }
    return
  }
  const path = paths.value[k]
  const at = path.cells.findIndex(c => same(c, [x, y]))
  let cells
  if (at === 0) {
    // Its first number: a complete path is pulled back from this end, a loose
    // one starts over.
    cells = isComplete(path) ? [...path.cells].reverse() : [[x, y]]
  } else {
    // Its last cell continues it; a cell in the middle cuts it there.
    cells = path.cells.slice(0, at + 1)
  }
  removePath(k)
  current.value = { color: path.color, length: path.length, cells }
}

// Adds one neighbouring cell to the path being drawn, if the rules allow it.
function step ([x, y]) {
  const path = current.value
  const cells = path.cells
  if (isComplete(path)) return fail('complete')
  if (cells.length >= path.length) return fail('tooLong')
  const n = numberAt(x, y)
  const k = ownerAt(x, y)
  if (n !== 0) {
    if (clueColourAt(x, y) !== path.color) return fail('wrongColor')
    if (n !== path.length || cells.length + 1 !== path.length) return fail('lengthMismatch')
    if (k !== -1) {
      if (isComplete(paths.value[k])) return fail('taken')
      // A loose path started from this number gives way to the connection.
      removePath(k)
    }
    cells.push([x, y])
    return true
  }
  if (k !== -1) {
    const other = paths.value[k]
    if (other.color !== path.color) return fail('otherColor')
    if (!same(lastOf(other), [x, y]) || isComplete(other)) return fail('middleOfPath')
    if (other.length !== path.length || cells.length + other.cells.length !== path.length) return fail('combinedLength')
    // Meeting another path's loose end joins the two.
    removePath(k)
    cells.push(...[...other.cells].reverse())
    return true
  }
  cells.push([x, y])
  return true
}

function moveDrag (pos) {
  const path = current.value
  if (!path) return
  const target = [pos.x, pos.y]
  // Back onto the path: shorten it to there.
  const at = path.cells.findIndex(c => same(c, target))
  if (at !== -1) {
    path.cells.splice(at + 1)
    return
  }
  // Fast moves skip cells: walk there one neighbour at a time.
  for (let guard = 0; guard < width.value + height.value; guard++) {
    const [lx, ly] = lastOf(path)
    if (lx === pos.x && ly === pos.y) return
    const dx = pos.x - lx
    const dy = pos.y - ly
    const next = Math.abs(dx) >= Math.abs(dy) ? [lx + Math.sign(dx), ly] : [lx, ly + Math.sign(dy)]
    if (path.cells.some(c => same(c, next)) || !step(next)) return
  }
}

function endDrag () {
  const path = current.value
  current.value = null
  if (path && path.cells.length > 1) paths.value = [...paths.value, path]
  if (canonical(paths.value) === canonical(before)) {
    paths.value = before
  } else {
    history.push(JSON.stringify(paths.value))
    started.value = true
    save()
    checkSolved()
  }
  before = null
}

const pointer = useGridPointer({
  cellSize: cell,
  width,
  height,
  enabled: () => !solved.value,
  onStart: startDrag,
  onMove: moveDrag,
  onEnd: endDrag
})

const cellAt = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = Math.floor((event.clientX - rect.left) / cell.value)
  const y = Math.floor((event.clientY - rect.top) / cell.value)
  return x >= 0 && y >= 0 && x < width.value && y < height.value ? { x, y } : null
}

const gridHandlers = {
  ...pointer.handlers,
  pointermove (event) {
    if (event.pointerType === 'mouse' && !solved.value) hover.value = cellAt(event)
    pointer.handlers.pointermove(event)
  },
  pointerleave () {
    if (!pointer.active.value) hover.value = null
  }
}

// ---------------------------------------------------------------------------
// Keyboard, timer, fitting the screen
// ---------------------------------------------------------------------------

function onKey (event) {
  if (event.key === 'Escape' && expanded.value) {
    toggleExpanded()
    return
  }
  if (solved.value || current.value || event.target.closest?.('input, textarea, [contenteditable]')) return
  const ctrl = event.ctrlKey || event.metaKey
  if (ctrl && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? redo() : undo()
  } else if (ctrl && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    redo()
  }
}

let timer = null
function tick () {
  if (started.value && !solved.value && document.visibilityState === 'visible') {
    elapsed.value += 1
    if (elapsed.value % 10 === 0) save()
  }
}

function toggleExpanded () {
  expanded.value = !expanded.value
  nextTick(fitToScreen)
}

function fitToScreen () {
  const available = (root.value?.clientWidth || window.innerWidth) - (expanded.value ? 48 : 8)
  let size = Math.floor(available / width.value)
  if (expanded.value) {
    // Room for toolbar, message line and help text.
    size = Math.min(size, Math.floor((window.innerHeight - 190) / height.value))
  }
  zoom.setCellSize(Math.min(Math.max(size, 16), expanded.value ? 64 : 40))
}

const onResize = () => { if (expanded.value) fitToScreen() }

onMounted(() => {
  fitToScreen()
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
  timer = window.setInterval(tick, 1000)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
  window.clearInterval(timer)
  save()
})
</script>

<style lang="scss" scoped>
@import '../engine/board.scss';

.beta {
  margin-bottom: 12px;
  padding: 8px 12px;
  font-size: 14px;
}

.pairs {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
  color: #4b5563;

  ion-icon { font-size: 18px; }
}

.linelog {
  display: block;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.main-grid {
  overflow: visible;
  touch-action: none;
}

.hover-cell { fill: var(--hover); pointer-events: none; }

.path-tint {
  opacity: 0.22;
  pointer-events: none;
}

.path {
  pointer-events: none;

  path {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .path-outline { stroke: rgba(0, 0, 0, 0.28); }
}

.candidate {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-dasharray: 4 3;
  pointer-events: none;
}

.number {
  pointer-events: none;

  circle { stroke: rgba(0, 0, 0, 0.3); stroke-width: 1; }

  text {
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  // Unconnected numbers stand out with a ring.
  &:not(.connected) circle { stroke: #111827; stroke-width: 2; }
}

.drag-count rect.full { fill: #16a34a; }
</style>
