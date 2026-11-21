<script setup>
// The player's helper grid (staircase of category blocks, see
// shared/puzzles/logicalGrid.js) with its toolbar.
//
// The grid cells and the undo history belong to LogicalDisplay (they are
// saved and restored with the game). This component paints: while a stroke
// runs it sends every new grid with 'update:grid', and when it ends
// 'stroke' with the grid before and after (for the history and the answer
// table). Tool, auto-cross and hover stay here; LogicalDisplay keeps this
// component alive while the grid is hidden, so they survive that too.

import { ref, computed, watch, nextTick, onMounted, onActivated } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGridPointer } from '../engine/useGridPointer'
import { categoryColor } from './categoryColors'
import { EMPTY, NO, YES, gridGeometry, paintRect } from '@shared/puzzles/logicalGrid.js'

const { t } = useI18n()
const props = defineProps({
  attributes: { type: Array, required: true },
  grid: { type: Array, required: true },
  solved: { type: Boolean, default: false },
  // "attr:value" keys of the clue under the mouse.
  hotValues: { type: Set, required: true },
  // Colour the category names (when the puzzle has relation chips).
  coloured: { type: Boolean, default: false },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false }
})
const emit = defineEmits(['update:grid', 'stroke', 'undo', 'redo', 'restart'])

const tool = ref(YES)
const autoCross = ref(true)
const cellSize = ref(28)
const hover = ref(null)

const n = computed(() => props.attributes.length)
const m = computed(() => props.attributes[0]?.values.length || 0)
const geo = computed(() => gridGeometry(n.value, m.value))
const blocks = computed(() => geo.value.blocks)
const size = computed(() => geo.value.size)
const blockPx = computed(() => m.value * cellSize.value)
const colAttr = c => geo.value.colAttr(c)
const rowAttr = r => geo.value.rowAttr(r)
const isValid = (x, y) => geo.value.isValid(x, y)
const rowLength = y => geo.value.rowLength(y)
const colLength = x => geo.value.colLength(x)

const columnAttributes = computed(() => Array.from({ length: blocks.value }, (_, c) => props.attributes[colAttr(c)]))
const rowAttributes = computed(() => Array.from({ length: blocks.value }, (_, r) => props.attributes[rowAttr(r)]))

const validCells = computed(() => {
  const cells = []
  for (let y = 0; y < size.value; y++) {
    for (let x = 0; x < rowLength(y); x++) cells.push({ x, y, i: geo.value.idx(x, y) })
  }
  return cells
})

// --- Clue highlight ------------------------------------------------------
const isHotValue = (attrIndex, value) => props.hotValues.has(`${attrIndex}:${value}`)
const categoryStyle = attrIndex => (props.coloured ? { fill: categoryColor(attrIndex).fg } : null)
const hotLines = (cellAttr) => {
  if (!props.hotValues.size) return []
  const list = []
  for (let k = 0; k < size.value; k++) {
    const block = Math.floor(k / m.value)
    const attr = cellAttr(block)
    if (isHotValue(attr, props.attributes[attr].values[k % m.value])) list.push(k)
  }
  return list
}
const hotColumns = computed(() => hotLines(colAttr))
const hotRows = computed(() => hotLines(rowAttr))

// --- Label measurement -------------------------------------------------
const NAME_BAND = 22
const LABEL_GAP = 8
const leftLabelRefs = ref([])
const topLabelRefs = ref([])
const leftLabelWidth = ref(70)
const topLabelHeight = ref(60)
const padLeft = computed(() => NAME_BAND + leftLabelWidth.value + LABEL_GAP)
const padTop = computed(() => NAME_BAND + topLabelHeight.value + LABEL_GAP)
const svgWidth = computed(() => padLeft.value + size.value * cellSize.value + 2)
const svgHeight = computed(() => padTop.value + size.value * cellSize.value + 2)

const measure = () => nextTick(() => {
  const widest = list => list.reduce((w, el) => (el ? Math.max(w, el.getBBox().width) : w), 0)
  leftLabelWidth.value = Math.max(Math.ceil(widest(leftLabelRefs.value)), 30)
  topLabelHeight.value = Math.max(Math.ceil(widest(topLabelRefs.value)), 30)
})
onMounted(measure)
onActivated(measure)
watch(() => props.attributes, measure)

// --- Painting ------------------------------------------------------------
let before = null
let current = null
let start = null
let paint = YES

const paintTo = (to) => {
  current = paintRect(before, geo.value, start, to, paint, autoCross.value)
  emit('update:grid', current)
}

const gridInput = {
  onStart (cell, event) {
    if (!isValid(cell.x, cell.y)) {
      start = null
      return
    }
    before = [...props.grid]
    start = cell
    const wanted = event.button === 2 ? NO : tool.value
    // Clicking a cell that already shows the tool's mark takes it back.
    paint = wanted !== EMPTY && before[geo.value.idx(cell.x, cell.y)] === wanted ? EMPTY : wanted
    paintTo(cell)
  },
  onMove (cell) {
    if (start) paintTo(cell)
  },
  onEnd () {
    if (!start) return
    emit('stroke', { before, after: current })
    start = null
    before = null
    current = null
  }
}

const pointer = useGridPointer({
  cellSize,
  width: size,
  height: size,
  enabled: () => !props.solved,
  ...gridInput
})

const cellAt = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = Math.floor((event.clientX - rect.left) / cellSize.value)
  const y = Math.floor((event.clientY - rect.top) / cellSize.value)
  return x >= 0 && y >= 0 && x < size.value && y < size.value ? { x, y } : null
}

// Phones and tablets: the grid lets a swipe scroll the page (touch-action in
// the style), so a mark is set by a tap, never by a drag.
const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
let tap = null
const tapHandlers = {
  pointerdown (event) {
    if (props.solved) return
    tap = { id: event.pointerId, x: event.clientX, y: event.clientY }
  },
  pointerup (event) {
    const t0 = tap
    tap = null
    if (!t0 || t0.id !== event.pointerId || props.solved) return
    if (Math.hypot(event.clientX - t0.x, event.clientY - t0.y) > 10) return
    const cell = cellAt(event)
    if (!cell || !isValid(cell.x, cell.y)) return
    gridInput.onStart(cell, event)
    gridInput.onEnd()
  },
  pointercancel () { tap = null },
  contextmenu (event) { event.preventDefault() }
}

const gridHandlers = {
  ...pointer.handlers,
  ...(coarse ? tapHandlers : {}),
  pointermove (event) {
    pointer.handlers.pointermove(event)
    const cell = cellAt(event)
    hover.value = cell && isValid(cell.x, cell.y) ? cell : null
  },
  pointerleave () {
    hover.value = null
  }
}

// --- Drawing -------------------------------------------------------------
const thinPath = computed(() => {
  const cs = cellSize.value
  let d = ''
  for (let y = 1; y < size.value; y++) {
    if (y % m.value) d += `M0 ${y * cs}H${rowLength(y) * cs}`
  }
  for (let x = 1; x < size.value; x++) {
    if (x % m.value) d += `M${x * cs} 0V${colLength(x) * cs}`
  }
  return d
})

const thickPath = computed(() => {
  const b = blockPx.value
  let d = ''
  for (let r = 0; r <= blocks.value; r++) d += `M0 ${r * b}H${(blocks.value - Math.max(r - 1, 0)) * b}`
  for (let c = 0; c <= blocks.value; c++) d += `M${c * b} 0V${(blocks.value - Math.max(c - 1, 0)) * b}`
  return d
})

const crossPath = computed(() => {
  const p = Math.round(cellSize.value * 0.28)
  const q = cellSize.value - p
  return `M${p} ${p}L${q} ${q}M${p} ${q}L${q} ${p}`
})

const tools = computed(() => [
  { value: YES, icon: 'ellipse', label: t('logical.toolYes') },
  { value: NO, icon: 'close', label: t('logical.toolNo') },
  { value: EMPTY, icon: 'backspace-outline', label: t('logical.toolErase') }
])
</script>

<template>
  <div class="logic-grid-wrap">
    <div v-if="!solved" class="toolbar">
      <div class="tool-group" role="radiogroup" :aria-label="t('logical.tool')">
        <button
          v-for="entry in tools"
          :key="entry.value"
          class="tool labelled"
          :class="{ active: tool === entry.value, [`tool-${entry.value}`]: true }"
          role="radio"
          :aria-checked="tool === entry.value"
          @click="tool = entry.value"
        >
          <ion-icon :name="entry.icon"></ion-icon><span>{{ entry.label }}</span>
        </button>
      </div>
      <div class="tool-group">
        <button class="tool" :title="t('logical.undo')" :disabled="!canUndo" @click="emit('undo')">
          <ion-icon name="return-up-back-outline"></ion-icon>
        </button>
        <button class="tool" :title="t('logical.redo')" :disabled="!canRedo" @click="emit('redo')">
          <ion-icon name="return-up-forward-outline"></ion-icon>
        </button>
        <button class="tool" :title="t('logical.restart')" @click="emit('restart')">
          <ion-icon name="refresh-outline"></ion-icon>
        </button>
      </div>
      <label class="tool-group auto-cross" :title="t('logical.autoCrossTitle')">
        <input v-model="autoCross" type="checkbox" />
        <span>{{ t('logical.autoCross') }}</span>
      </label>
    </div>

    <div class="grid-area">
      <svg class="logic-grid" :width="svgWidth" :height="svgHeight">
        <!-- Category names -->
        <g class="category-names">
          <text
            v-for="(attr, c) in columnAttributes"
            :key="`cname${c}`"
            :x="padLeft + c * blockPx + blockPx / 2"
            :y="NAME_BAND / 2"
            class="category-name"
            :style="categoryStyle(colAttr(c))"
          >{{ attr.name }}</text>
          <text
            v-for="(attr, r) in rowAttributes"
            :key="`rname${r}`"
            class="category-name"
            :style="categoryStyle(rowAttr(r))"
            :transform="`translate(${NAME_BAND / 2}, ${padTop + r * blockPx + blockPx / 2}) rotate(-90)`"
          >{{ attr.name }}</text>
        </g>

        <!-- Value labels: columns (rotated) and rows -->
        <g class="value-labels">
          <template v-for="(attr, c) in columnAttributes" :key="`cvals${c}`">
            <text
              v-for="(val, j) in attr.values"
              :key="`cval${c}_${j}`"
              ref="topLabelRefs"
              class="top-label"
              :class="{ highlight: hover && hover.x === c * m + j, 'clue-hot': isHotValue(colAttr(c), val) }"
              :style="isHotValue(colAttr(c), val) ? { fill: categoryColor(colAttr(c)).fg } : null"
              :transform="`translate(${padLeft + (c * m + j) * cellSize + cellSize / 2}, ${padTop - LABEL_GAP}) rotate(-90)`"
            >{{ val }}</text>
          </template>
          <template v-for="(attr, r) in rowAttributes" :key="`rvals${r}`">
            <text
              v-for="(val, j) in attr.values"
              :key="`rval${r}_${j}`"
              ref="leftLabelRefs"
              class="left-label"
              :class="{ highlight: hover && hover.y === r * m + j, 'clue-hot': isHotValue(rowAttr(r), val) }"
              :style="isHotValue(rowAttr(r), val) ? { fill: categoryColor(rowAttr(r)).fg } : null"
              :x="padLeft - LABEL_GAP"
              :y="padTop + (r * m + j) * cellSize + cellSize / 2"
            >{{ val }}</text>
          </template>
        </g>

        <g :transform="`translate(${padLeft + 1}, ${padTop + 1})`">
          <!-- Block backgrounds, alternating -->
          <template v-for="r in blocks" :key="`brow${r}`">
            <rect
              v-for="c in blocks - r + 1"
              :key="`bg${r}_${c}`"
              class="block-bg"
              :class="{ alt: (r + c) % 2 === 1 }"
              :x="(c - 1) * blockPx"
              :y="(r - 1) * blockPx"
              :width="blockPx"
              :height="blockPx"
            />
          </template>

          <!-- Values of the clue under the mouse -->
          <g v-if="hotValues.size" class="clue-lines">
            <rect v-for="y in hotRows" :key="`hr${y}`" :x="0" :y="y * cellSize" :width="rowLength(y) * cellSize" :height="cellSize" />
            <rect v-for="x in hotColumns" :key="`hc${x}`" :x="x * cellSize" :y="0" :width="cellSize" :height="colLength(x) * cellSize" />
          </g>

          <!-- Hover crosshair -->
          <g v-if="hover && !solved" class="hover-lines">
            <rect :x="0" :y="hover.y * cellSize" :width="rowLength(hover.y) * cellSize" :height="cellSize" />
            <rect :x="hover.x * cellSize" :y="0" :width="cellSize" :height="colLength(hover.x) * cellSize" />
          </g>

          <!-- Marks -->
          <g class="marks">
            <template v-for="cell in validCells" :key="`m${cell.i}`">
              <g v-if="grid[cell.i] !== EMPTY" :transform="`translate(${cell.x * cellSize}, ${cell.y * cellSize})`">
                <template v-if="grid[cell.i] === YES">
                  <rect class="yes-bg" :width="cellSize" :height="cellSize" />
                  <circle class="yes-dot" :cx="cellSize / 2" :cy="cellSize / 2" :r="cellSize * 0.24" />
                </template>
                <path v-else class="no-cross" :d="crossPath" />
              </g>
            </template>
          </g>

          <path class="grid-thin" :d="thinPath" />
          <path class="grid-thick" :d="thickPath" />

          <!-- Input surface -->
          <rect
            class="input-surface"
            :class="{ disabled: solved }"
            :width="size * cellSize"
            :height="size * cellSize"
            v-on="gridHandlers"
          />
        </g>
      </svg>
    </div>
    <p v-if="!solved" class="hint-text">{{ t('logical.help') }}</p>
  </div>
</template>

<style lang="scss" scoped>
@import '../engine/board.scss';
@import './logical.scss';

.logic-grid-wrap {
  --accent: #2563eb;
  --line: #d4d8de;
  --line-strong: #1f2937;
  --hover: rgba(37, 99, 235, 0.1);
}

.tool {
  &.active {
    background: #e0e7ff;
    color: #1e3a8a;
    box-shadow: inset 0 0 0 1px #a5b4fc;
  }

  &.tool-2 ion-icon { color: var(--accent); font-size: 14px; }
  &.tool-1 ion-icon { color: #4b5563; }
}

.auto-cross {
  padding: 4px 10px;
  height: 42px;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;

  input {
    margin: 0;
    padding: 0;
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
    display: inline-block;
  }
}

.grid-area {
  padding: 4px 0;
  // A grid wider than the screen scrolls sideways inside its own box.
  overflow-x: auto;
}

.logic-grid {
  display: block;
  font-family: inherit;
}

.category-name {
  text-anchor: middle;
  dominant-baseline: central;
  font-size: 13px;
  font-weight: 700;
  fill: #262664;
}

.top-label,
.left-label {
  font-size: 13px;
  fill: #374151;
  dominant-baseline: central;
  text-anchor: end;
  transition: fill 0.1s;

  &.highlight {
    fill: var(--accent);
    font-weight: 700;
  }
}

.top-label {
  text-anchor: start;
}

.block-bg {
  fill: #fff;

  &.alt { fill: #f8fafc; }
}

.clue-lines rect {
  fill: rgba(121, 87, 213, 0.12);
  pointer-events: none;
}

.top-label.clue-hot,
.left-label.clue-hot {
  font-weight: 700;
}

.hover-lines rect {
  fill: var(--hover);
  pointer-events: none;
}

.marks {
  pointer-events: none;
}

.yes-bg {
  fill: #dbeafe;
}

.yes-dot {
  fill: var(--accent);
}

.no-cross {
  stroke: #6b7280;
  stroke-width: 2;
  stroke-linecap: round;
  fill: none;
}

.input-surface {
  fill: transparent;
  cursor: pointer;
  touch-action: none;

  &.disabled { cursor: default; }
}

// On touch screens a swipe over the grid scrolls the page; a tap sets a mark.
@media (pointer: coarse) {
  .input-surface { touch-action: pan-x pan-y pinch-zoom; }
}
</style>
