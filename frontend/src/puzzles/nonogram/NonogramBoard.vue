<template>
  <div ref="root" class="board" :class="{ 'is-solved': solved, expanded }">
    <div v-if="!solved" class="toolbar">
      <div class="tool-group palette" role="radiogroup" :aria-label="t('nonogram.colour')">
        <button
          v-for="(entry, i) in palette"
          :key="entry.value"
          class="swatch"
          :class="{ active: selected === entry.value, dot: entry.value === DOT }"
          :style="{ backgroundColor: entry.color }"
          :title="entry.value === DOT ? t('nonogram.markEmpty') : t('nonogram.colourN', { n: i + 1 })"
          role="radio"
          :aria-checked="selected === entry.value"
          @click="selected = entry.value"
        ><span v-if="entry.value === DOT" class="swatch-dot"></span></button>
      </div>

      <div class="tool-group">
        <button class="tool" :title="t('nonogram.undo')" :disabled="!history.canUndo.value" @click="undo">
          <ion-icon name="return-up-back-outline"></ion-icon>
        </button>
        <button class="tool" :title="t('nonogram.redo')" :disabled="!history.canRedo.value" @click="redo">
          <ion-icon name="return-up-forward-outline"></ion-icon>
        </button>
      </div>

      <div class="tool-group">
        <button class="tool labelled" :title="t('nonogram.hintTitle')" @click="showHint">
          <ion-icon name="bulb-outline"></ion-icon><span>{{ t('nonogram.hint') }}</span>
        </button>
        <button class="tool labelled" :title="t('nonogram.checkTitle')" @click="checkMistakes">
          <ion-icon name="checkmark-done-outline"></ion-icon><span>{{ t('nonogram.check') }}</span>
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

      <div class="timer" :title="t('nonogram.time')"><ion-icon name="time-outline"></ion-icon>{{ formatTime(elapsed) }}</div>
    </div>

    <!-- Always takes its space, so the grid doesn't jump when a message appears. -->
    <p v-if="!solved" class="board-message" :class="[message?.kind, { empty: !message }]" role="status">
      {{ message?.text }}
    </p>

    <div class="grid-area">
      <svg
        class="nonogram"
        :width="left + width * cell + 2"
        :height="top + height * cell + 2"
        :style="{ '--cell': `${cell}px` }"
      >
        <!-- Clue backgrounds, hover and status per line -->
        <g v-if="!solved">
          <rect v-for="y in height" :key="`rbg${y}`" :x="0" :y="top + (y - 1) * cell" :width="left" :height="cell"
                :class="lineClass('row', y - 1)" class="clue-bg" />
          <rect v-for="x in width" :key="`cbg${x}`" :x="left + (x - 1) * cell" :y="0" :width="cell" :height="top"
                :class="lineClass('column', x - 1)" class="clue-bg" />

          <!-- Row clues, right-aligned -->
          <template v-for="(clues, y) in rowClues" :key="`r${y}`">
            <g v-for="(block, i) in clues" :key="i" class="clue"
               :class="{ done: isDone('row', y, i) }"
               :transform="`translate(${left - (clues.length - i) * cell}, ${top + y * cell})`"
               @click="clueClick('row', y, i, block)"
               @contextmenu.prevent="toggleCross('row', y, i)">
              <rect v-if="multiColour" :width="cell - 2" :height="cell - 2" x="1" y="1" rx="3" :fill="colourOf(block[0])" />
              <text :x="cell / 2" :y="cell / 2 + 1" :style="multiColour ? { fill: textColourOf(block[0]) } : null">{{ block[1] }}</text>
              <line v-if="isDone('row', y, i)" class="strike" :x1="cell * 0.2" :y1="cell * 0.8" :x2="cell * 0.8" :y2="cell * 0.2" />
            </g>
          </template>

          <!-- Column clues, bottom-aligned -->
          <template v-for="(clues, x) in columnClues" :key="`c${x}`">
            <g v-for="(block, i) in clues" :key="i" class="clue"
               :class="{ done: isDone('column', x, i) }"
               :transform="`translate(${left + x * cell}, ${top - (clues.length - i) * cell})`"
               @click="clueClick('column', x, i, block)"
               @contextmenu.prevent="toggleCross('column', x, i)">
              <rect v-if="multiColour" :width="cell - 2" :height="cell - 2" x="1" y="1" rx="3" :fill="colourOf(block[0])" />
              <text :x="cell / 2" :y="cell / 2 + 1" :style="multiColour ? { fill: textColourOf(block[0]) } : null">{{ block[1] }}</text>
              <line v-if="isDone('column', x, i)" class="strike" :x1="cell * 0.2" :y1="cell * 0.8" :x2="cell * 0.8" :y2="cell * 0.2" />
            </g>
          </template>

          <!-- Clue grid lines -->
          <path :d="clueLines" class="clue-lines" />
        </g>

        <!-- Main grid -->
        <svg :x="left" :y="top" :width="width * cell + 2" :height="height * cell + 2"
             class="main-grid" :class="{ solved }" v-on="gridHandlers">
          <rect :width="width * cell" :height="height * cell" :fill="solved ? backgroundColour : '#ffffff'" />

          <!-- Hover cross -->
          <template v-if="hover && !solved">
            <rect :x="0" :y="hover.y * cell" :width="width * cell" :height="cell" class="hover-line" />
            <rect :x="hover.x * cell" :y="0" :width="cell" :height="height * cell" class="hover-line" />
          </template>

          <!-- Hint line -->
          <rect v-if="hintLine" class="hint-line" v-bind="hintLine" />

          <!-- Cells -->
          <template v-for="c in paintedCells" :key="c.i">
            <rect v-if="c.value > 0" :x="c.x * cell" :y="c.y * cell" :width="cell" :height="cell" :fill="colourOf(c.value)" />
            <circle v-else-if="!solved" :cx="c.x * cell + cell / 2" :cy="c.y * cell + cell / 2" :r="Math.max(cell * 0.11, 1.5)" class="dot" />
          </template>

          <!-- Hint cells and mistakes -->
          <g v-for="c in hintCells" :key="`h${c.x}-${c.y}`" class="hint-cell"
             :transform="`translate(${c.x * cell}, ${c.y * cell})`">
            <rect v-if="c.value > 0" :x="cell * 0.2" :y="cell * 0.2" :width="cell * 0.6" :height="cell * 0.6"
                  :fill="colourOf(c.value)" class="hint-preview" />
            <circle v-else :cx="cell / 2" :cy="cell / 2" :r="Math.max(cell * 0.11, 1.5)" class="hint-preview dot" />
            <rect x="2" y="2" :width="cell - 4" :height="cell - 4" class="hint-frame" />
          </g>
          <g v-for="i in mistakes" :key="`m${i}`" class="mistake"
             :transform="`translate(${(i % width) * cell}, ${Math.floor(i / width) * cell})`">
            <rect :width="cell" :height="cell" />
            <path :d="`M ${cell * 0.25} ${cell * 0.25} L ${cell * 0.75} ${cell * 0.75} M ${cell * 0.75} ${cell * 0.25} L ${cell * 0.25} ${cell * 0.75}`" />
          </g>

          <!-- Grid lines: thin per cell, thick every 5 -->
          <template v-if="!solved">
            <path :d="gridLines.thin" class="grid-thin" />
            <path :d="gridLines.thick" class="grid-thick" />
          </template>

          <!-- Drag length -->
          <g v-if="dragCount > 1" class="drag-count" :transform="`translate(${dragLabel.x}, ${dragLabel.y})`">
            <rect x="-14" y="-11" width="28" height="22" rx="11" />
            <text>{{ dragCount }}</text>
          </g>
        </svg>
      </svg>
    </div>

    <p v-if="solved" class="solved-time">{{ t('nonogram.solvedIn', { time: formatTime(elapsed) }) }}</p>
    <p v-else class="help">
      {{ t('nonogram.help') }} ·
      {{ multiColour ? t('nonogram.helpClueMulti') : t('nonogram.helpClue') }} ·
      {{ t('nonogram.helpHint') }}
    </p>
  </div>
</template>

<script setup>
// Nonogram board.
//
// Cell values (shared/puzzles/nonogramPlay.js): -1 unknown, 0 dot (the
// player is sure it's empty), k >= 1 colour k of the puzzle. Unknown cells
// count as empty for "solved", so dots are optional.
//
// Left button sets the selected colour, right button a dot; pressing a cell
// that already has that value clears it instead. A drag stays on its row or
// column and only fills unknown cells, so it never destroys work. Clues of a
// line are crossed off when they are certainly placed, and turn red when the
// line can no longer match. "Tipp" and "Prüfen" use the shared solver.
// Progress and time are saved per puzzle (localStorage, and the server for
// logged-in players); see ../engine/progress.js.

import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  UNKNOWN, DOT, lineStatus, rowOf, columnOf, nextHint, solutionFromClues,
  wrongCells, dragLine, dragAction, applyDrag
} from '@shared/puzzles/nonogramPlay.js'
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
const zoom = useZoom({ base: 25, min: 12, step: 3 })
const cell = zoom.cellSize
const history = useHistory()

const width = computed(() => Number(props.puzzle.width))
const height = computed(() => Number(props.puzzle.height))
const rowClues = computed(() => props.puzzle.rowClues || [])
const columnClues = computed(() => props.puzzle.columnClues || [])
// Stored encoding: colour k is colors[k - 1]; the last colour is the background.
const fillColours = computed(() => props.puzzle.colors.slice(0, -1))
const backgroundColour = computed(() => props.puzzle.colors[props.puzzle.colors.length - 1])
const multiColour = computed(() => fillColours.value.length > 1)
const colourOf = k => fillColours.value[k - 1] || '#000000'
const textColourOf = k => textColorFor(colourOf(k))

const palette = computed(() => [
  ...fillColours.value.map((color, i) => ({ value: i + 1, color })),
  { value: DOT, color: '#ffffff' }
])
const selected = ref(1)

const state = ref([])
const solved = ref(false)

// Clue areas; gone once solved, so the picture stands on its own.
const left = computed(() => (solved.value ? 0 : Math.max(1, ...rowClues.value.map(c => c.length)) * cell.value + 4))
const top = computed(() => (solved.value ? 0 : Math.max(1, ...columnClues.value.map(c => c.length)) * cell.value + 4))
const elapsed = ref(0)
const started = ref(false)
const crossed = ref(new Set())
const hover = ref(null)
const message = ref(null)
const hint = ref(null)
const mistakes = ref([])
// Großansicht: the board covers the whole window, sized to fit both ways.
const expanded = ref(false)
let solution = null

// ---------------------------------------------------------------------------
// Line status and clue crossing
// ---------------------------------------------------------------------------

const rowStatus = computed(() => rowClues.value.map((clues, y) => lineStatus(rowOf(state.value, width.value, y), clues)))
const columnStatus = computed(() => columnClues.value.map((clues, x) =>
  lineStatus(columnOf(state.value, width.value, height.value, x), clues)))
const statusOf = (axis, index) => (axis === 'row' ? rowStatus.value : columnStatus.value)[index]

const crossKey = (axis, index, i) => `${axis}:${index}:${i}`
const isDone = (axis, index, i) => statusOf(axis, index)?.done[i] || crossed.value.has(crossKey(axis, index, i))
// Multi-colour: clicking a clue picks its colour (quick switch while solving);
// right-click crosses it off. Single colour: click crosses it off.
const clueClick = (axis, index, i, block) => {
  if (multiColour.value) selected.value = block[0]
  else toggleCross(axis, index, i)
}
const toggleCross = (axis, index, i) => {
  const next = new Set(crossed.value)
  const key = crossKey(axis, index, i)
  next.has(key) ? next.delete(key) : next.add(key)
  crossed.value = next
  save()
}

const lineClass = (axis, index) => {
  const status = statusOf(axis, index)
  const hovered = hover.value && (axis === 'row' ? hover.value.y : hover.value.x) === index
  const hinted = hint.value && hint.value.axis === axis && hint.value.index === index
  return {
    hovered,
    complete: status?.complete,
    error: status?.error,
    hinted
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

const paintedCells = computed(() => {
  const cells = []
  state.value.forEach((value, i) => {
    if (value !== UNKNOWN) cells.push({ i, value, x: i % width.value, y: Math.floor(i / width.value) })
  })
  return cells
})

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

const clueLines = computed(() => {
  let d = ''
  for (let y = 0; y <= height.value; y += 1) {
    if (y % 5 === 0) d += `M 0 ${top.value + y * cell.value} H ${left.value} `
  }
  for (let x = 0; x <= width.value; x += 1) {
    if (x % 5 === 0) d += `M ${left.value + x * cell.value} 0 V ${top.value} `
  }
  return d
})

const hintLine = computed(() => {
  if (!hint.value) return null
  const { axis, index } = hint.value
  return axis === 'row'
    ? { x: 0, y: index * cell.value, width: width.value * cell.value, height: cell.value }
    : { x: index * cell.value, y: 0, width: cell.value, height: height.value * cell.value }
})
// Hinted cells the player has not set to the suggested value yet.
const hintCells = computed(() => (hint.value?.cells || [])
  .filter(c => state.value[c.y * width.value + c.x] !== c.value))
const hintAt = pos => hintCells.value.find(c => c.x === pos.x && c.y === pos.y)

// ---------------------------------------------------------------------------
// Progress: localStorage per puzzle, mirrored to the server for logged-in
// players (../engine/progress.js)
// ---------------------------------------------------------------------------

function save () {
  if (solved.value) {
    clearProgress('nonogram', props.puzzle.id)
    return
  }
  // Nothing to keep yet (also after "Neu starten").
  if (!started.value) return
  saveProgress('nonogram', props.puzzle.id, {
    w: width.value, h: height.value, cells: state.value, elapsed: elapsed.value, crossed: [...crossed.value]
  })
}

function load () {
  const saved = readProgress('nonogram', props.puzzle.id)
  if (saved && saved.w === width.value && saved.h === height.value &&
      Array.isArray(saved.cells) && saved.cells.length === width.value * height.value) {
    return saved
  }
  return null
}

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------

const answer = () => Array.from({ length: height.value }, (_, y) =>
  rowOf(state.value, width.value, y).map(v => (v === UNKNOWN ? 0 : v)))

function checkSolved () {
  if (solved.value) return
  if (rowStatus.value.every(s => s.complete) && columnStatus.value.every(s => s.complete)) {
    solved.value = true
    hover.value = null
    if (expanded.value) toggleExpanded()
    clearFeedback()
    save()
    emit('solved')
    // The clues prove it is solved; this records it for logged-in players.
    props.submit(answer(), { seconds: elapsed.value })
  }
}

function clearFeedback () {
  hint.value = null
  mistakes.value = []
  message.value = null
}

function reset () {
  const saved = load()
  state.value = saved ? saved.cells : new Array(width.value * height.value).fill(UNKNOWN)
  elapsed.value = saved ? saved.elapsed || 0 : 0
  crossed.value = new Set(saved ? saved.crossed || [] : [])
  started.value = Boolean(saved)
  solved.value = false
  solution = null
  selected.value = 1
  clearFeedback()
  history.reset(state.value)
  if (saved) message.value = { kind: 'info', text: t('common.restored') }
}
watch(() => props.puzzle, () => { reset(); fitToScreen() }, { immediate: true })

function commit (next) {
  if (next.every((v, i) => v === state.value[i])) return
  state.value = next
  history.push(next)
  started.value = true
  save()
  checkSolved()
}

const undo = () => {
  const previous = history.undo()
  if (previous) { clearFeedback(); state.value = previous; save() }
}
const redo = () => {
  const next = history.redo()
  if (next) { clearFeedback(); state.value = next; save(); checkSolved() }
}

function restart () {
  if (started.value && !window.confirm(t('nonogram.restartConfirm'))) return
  clearProgress('nonogram', props.puzzle.id)
  reset()
}

function showHint () {
  mistakes.value = []
  const result = nextHint(state.value, { rowClues: rowClues.value, columnClues: columnClues.value })
  const name = (axis, index) => t(axis === 'row' ? 'nonogram.row' : 'nonogram.column', { n: index + 1 })
  if (result.kind === 'error') {
    hint.value = { axis: result.axis, index: result.index, cells: [] }
    message.value = { kind: 'error', text: t('nonogram.lineError', { line: name(result.axis, result.index) }) }
  } else if (result.kind === 'line') {
    hint.value = { axis: result.axis, index: result.index, cells: result.cells }
    message.value = {
      kind: 'info',
      text: t('nonogram.lineHint', { line: name(result.axis, result.index), n: result.cells.length }, result.cells.length)
    }
  } else if (result.kind === 'cross') {
    hint.value = { axis: null, index: null, cells: [{ x: result.x, y: result.y, value: result.value }] }
    message.value = {
      kind: 'info',
      text: t('nonogram.crossHint', { row: result.y + 1, column: result.x + 1 })
    }
  } else if (result.kind === 'stuck') {
    hint.value = null
    message.value = {
      kind: 'info',
      text: t('nonogram.stuck')
    }
  } else {
    message.value = { kind: 'info', text: t('nonogram.allFilled') }
  }
}

function checkMistakes () {
  hint.value = null
  if (!solution) solution = solutionFromClues({ rowClues: rowClues.value, columnClues: columnClues.value })
  if (!solution) {
    message.value = { kind: 'error', text: t('nonogram.checkUnavailable') }
    return
  }
  mistakes.value = wrongCells(state.value, solution)
  message.value = mistakes.value.length
    ? { kind: 'error', text: t('nonogram.mistakes', mistakes.value.length) }
    : { kind: 'success', text: t('nonogram.allCorrect') }
}

// ---------------------------------------------------------------------------
// Pointer input
// ---------------------------------------------------------------------------

let dragStart = null
let before = null
let action = null
const dragCount = ref(0)
const dragLabel = ref({ x: 0, y: 0 })

const pointer = useGridPointer({
  cellSize: cell,
  width,
  height,
  enabled: () => !solved.value,
  onStart (pos, event) {
    // A left click on a hinted cell sets the suggested value (and picks that
    // colour), and keeps the remaining hint cells visible.
    const hinted = event.button !== 2 && hintAt(pos)
    if (hinted) {
      mistakes.value = []
      if (hinted.value > 0) selected.value = hinted.value
    } else {
      clearFeedback()
    }
    dragStart = pos
    before = [...state.value]
    const value = hinted ? hinted.value : event.button === 2 ? DOT : selected.value
    action = dragAction(before[pos.y * width.value + pos.x], value)
    drag(pos)
  },
  onMove (pos) {
    hover.value = pos
    drag(pos)
  },
  onEnd () {
    const next = state.value
    state.value = before
    dragCount.value = 0
    dragStart = null
    commit(next)
  }
})

function drag (pos) {
  const cells = dragLine(dragStart, pos)
  state.value = applyDrag(before, width.value, cells, action)
  dragCount.value = cells.length
  const end = cells[cells.length - 1]
  dragLabel.value = { x: end.x * cell.value + cell.value / 2, y: Math.max(end.y * cell.value - 12, 12) }
}

const cellAt = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = Math.floor((event.clientX - rect.left) / cell.value)
  const y = Math.floor((event.clientY - rect.top) / cell.value)
  return x >= 0 && y >= 0 && x < width.value && y < height.value ? { x, y } : null
}

const gridHandlers = {
  ...pointer.handlers,
  pointermove (event) {
    if (!pointer.active.value && event.pointerType === 'mouse') hover.value = cellAt(event)
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
  if (solved.value || event.target.closest?.('input, textarea, [contenteditable]')) return
  const ctrl = event.ctrlKey || event.metaKey
  if (ctrl && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? redo() : undo()
  } else if (ctrl && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    redo()
  } else if (!ctrl && /^[1-9]$/.test(event.key) && Number(event.key) <= fillColours.value.length) {
    selected.value = Number(event.key)
  } else if (!ctrl && (event.key === '0' || event.key.toLowerCase() === 'x')) {
    selected.value = DOT
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
  const columns = width.value + Math.max(1, ...rowClues.value.map(c => c.length))
  const available = (root.value?.clientWidth || window.innerWidth) - (expanded.value ? 48 : 8)
  let size = Math.floor(available / columns)
  if (expanded.value) {
    const rows = height.value + Math.max(1, ...columnClues.value.map(c => c.length))
    // Room for toolbar, message line and help text.
    size = Math.min(size, Math.floor((window.innerHeight - 190) / rows))
  }
  zoom.setCellSize(Math.min(Math.max(size, 14), expanded.value ? 64 : 34))
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

.palette {
  gap: 6px;
  padding: 5px 7px;
}

.swatch {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.12s ease;

  &:hover { transform: scale(1.08); }

  &.active {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
}

.swatch-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #374151;
  transform: translate(-50%, -50%);
}

.nonogram {
  display: block;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.clue-bg {
  fill: var(--clue-bg);

  &.hovered { fill: #e1eafd; }
  &.complete { fill: #eef0f3; }
  &.hinted { fill: #fdecc8; }
  &.error { fill: #fde2e2; }
}

.clue {
  cursor: pointer;

  text {
    font-size: calc(var(--cell) * 0.56);
    font-weight: 600;
    fill: #111827;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  &.done text { opacity: 0.35; }

  &:hover rect, &:hover text { opacity: 0.8; }
}

.strike {
  stroke: #6b7280;
  stroke-width: 1.5;
  pointer-events: none;
}

.clue-lines {
  stroke: #d5d9df;
  stroke-width: 1;
  fill: none;
}

.main-grid {
  overflow: visible;
  cursor: crosshair;
  touch-action: none;

  &.solved { cursor: default; }
}

.hover-line { fill: var(--hover); pointer-events: none; }
.hint-line { fill: rgba(245, 158, 11, 0.16); pointer-events: none; }

.hint-cell {
  pointer-events: none;
}

.hint-frame {
  fill: none;
  stroke: var(--hint);
  stroke-width: 2.5;
  stroke-dasharray: 4 3;
}

.hint-preview { opacity: 0.45; }

.mistake {
  pointer-events: none;

  rect { fill: rgba(220, 38, 38, 0.18); }
  path { stroke: var(--error); stroke-width: 2; }
}

.dot { fill: #4b5563; pointer-events: none; }

</style>
