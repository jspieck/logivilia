<script setup>
// Logic grid puzzle: story, clues, the helper grid and the answer table.
//
// Helper grid layout (n categories, m values each, B = n - 1 blocks):
//   columns: categories 1 .. n-1, left to right
//   rows:    category 0, then n-1, n-2, ..., 2 (top to bottom)
// so every pair of categories meets in exactly one block, and the blocks
// form a staircase: block row r has B - r blocks.
// The grid is only a scratch pad for the player; the answer is the table.

import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import Toggle from './Toggle.vue'
import MySelect from './MySelect.vue'
import DifficultyIndicator from './DifficultyIndicator.vue'
import { useGridPointer } from '@/puzzles/engine/useGridPointer'
import { useHistory } from '@/puzzles/engine/useHistory'

const { t } = useI18n()
const props = defineProps({
  logical: { type: Object, required: true },
  isPreview: { type: Boolean, default: false },
  solved: { type: Boolean, default: false }
})

const emit = defineEmits(['solution-check', 'solution-update'])

const EMPTY = 0
const NO = 1
const YES = 2

const tableVisible = ref(true)
const tool = ref(YES)
const autoCross = ref(true)
const attrInputs = ref({})
const doneClues = ref(new Set())
const cellSize = ref(28)
const grid = ref([])
const hover = ref(null)
const history = useHistory()

const attributes = computed(() => props.logical.attributes || [])
const n = computed(() => attributes.value.length)
const m = computed(() => attributes.value[0]?.values.length || 0)
const blocks = computed(() => Math.max(n.value - 1, 0))
const size = computed(() => blocks.value * m.value)
const blockPx = computed(() => m.value * cellSize.value)

// Category shown in block column c / block row r.
const colAttr = c => c + 1
const rowAttr = r => (r === 0 ? 0 : n.value - r)
const columnAttributes = computed(() => Array.from({ length: blocks.value }, (_, c) => attributes.value[colAttr(c)]))
const rowAttributes = computed(() => Array.from({ length: blocks.value }, (_, r) => attributes.value[rowAttr(r)]))

const isValid = (x, y) => Math.floor(x / m.value) + Math.floor(y / m.value) < blocks.value
const idx = (x, y) => y * size.value + x
// Number of cells in grid row y / column x (the staircase).
const rowLength = y => (blocks.value - Math.floor(y / m.value)) * m.value
const colLength = x => (blocks.value - Math.floor(x / m.value)) * m.value

const validCells = computed(() => {
  const cells = []
  for (let y = 0; y < size.value; y++) {
    for (let x = 0; x < rowLength(y); x++) cells.push({ x, y, i: idx(x, y) })
  }
  return cells
})

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

// --- State ---------------------------------------------------------------
const reset = () => {
  grid.value = new Array(size.value * size.value).fill(EMPTY)
  history.reset(grid.value)
  const inputs = {}
  for (let i = 0; i < m.value; i++) {
    for (let j = 0; j < n.value - 1; j++) inputs[`${i}_${j}`] = null
  }
  attrInputs.value = inputs
  doneClues.value = new Set()
  measure()
}

watch(() => props.logical, (value) => {
  if (value?.attributes?.length) reset()
}, { immediate: true })

watch(tableVisible, visible => { if (visible) measure() })

watch([grid, attrInputs], () => {
  emit('solution-update', { gridState: grid.value, attrInputs: attrInputs.value })
}, { deep: true })

// --- Painting ------------------------------------------------------------
let snapshot = null
let start = null
let paint = YES

const setCell = (cells, x, y, value) => {
  if (!isValid(x, y)) return
  cells[idx(x, y)] = value
  if (value !== YES || !autoCross.value) return
  // A "yes" rules out every other value of both categories in this block.
  const bx = Math.floor(x / m.value) * m.value
  const by = Math.floor(y / m.value) * m.value
  for (let k = 0; k < m.value; k++) {
    if (bx + k !== x && cells[idx(bx + k, y)] === EMPTY) cells[idx(bx + k, y)] = NO
    if (by + k !== y && cells[idx(x, by + k)] === EMPTY) cells[idx(x, by + k)] = NO
  }
}

const paintRect = (to) => {
  const cells = [...snapshot]
  for (let y = Math.min(start.y, to.y); y <= Math.max(start.y, to.y); y++) {
    for (let x = Math.min(start.x, to.x); x <= Math.max(start.x, to.x); x++) {
      setCell(cells, x, y, paint)
    }
  }
  grid.value = cells
}

// Grid "yes" marks in the top block row fill the answer table.
const syncTable = () => {
  for (let i = 0; i < m.value; i++) {
    for (let x = 0; x < size.value; x++) {
      const before = snapshot[idx(x, i)]
      const now = grid.value[idx(x, i)]
      if (before === now) continue
      const key = `${i}_${Math.floor(x / m.value)}`
      const value = attributes.value[colAttr(Math.floor(x / m.value))].values[x % m.value]
      if (now === YES) attrInputs.value[key] = value
      else if (before === YES && attrInputs.value[key] === value) attrInputs.value[key] = null
    }
  }
}

const pointer = useGridPointer({
  cellSize,
  width: size,
  height: size,
  enabled: () => !props.solved,
  onStart (cell, event) {
    if (!isValid(cell.x, cell.y)) {
      start = null
      return
    }
    snapshot = [...grid.value]
    start = cell
    const wanted = event.button === 2 ? NO : tool.value
    // Clicking a cell that already shows the tool's mark takes it back.
    paint = wanted !== EMPTY && grid.value[idx(cell.x, cell.y)] === wanted ? EMPTY : wanted
    paintRect(cell)
  },
  onMove (cell) {
    if (start) paintRect(cell)
  },
  onEnd () {
    if (!start) return
    syncTable()
    history.push(grid.value)
    start = null
    snapshot = null
  }
})

const gridHandlers = {
  ...pointer.handlers,
  pointermove (event) {
    pointer.handlers.pointermove(event)
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left) / cellSize.value)
    const y = Math.floor((event.clientY - rect.top) / cellSize.value)
    hover.value = x >= 0 && y >= 0 && x < size.value && y < size.value && isValid(x, y) ? { x, y } : null
  },
  pointerleave () {
    hover.value = null
  }
}

const undo = () => {
  const state = history.undo()
  if (state) grid.value = state
}
const redo = () => {
  const state = history.redo()
  if (state) grid.value = state
}
const restart = () => {
  if (!window.confirm(t('logical.restartConfirm'))) return
  grid.value = new Array(size.value * size.value).fill(EMPTY)
  history.push(grid.value)
}

const onKey = (event) => {
  if (props.solved || !tableVisible.value) return
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return
  if (!(event.ctrlKey || event.metaKey)) return
  const key = event.key.toLowerCase()
  if (key === 'z' && !event.shiftKey) { event.preventDefault(); undo() }
  else if (key === 'y' || (key === 'z' && event.shiftKey)) { event.preventDefault(); redo() }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  measure()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

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

// --- Clues & answer ------------------------------------------------------
const toggleClue = (i) => {
  const next = new Set(doneClues.value)
  next.has(i) ? next.delete(i) : next.add(i)
  doneClues.value = next
}

// The player's table: one row per value of the first attribute (that value
// in column 0), then the chosen value of each other attribute. The solution
// is not sent to the browser; the server checks the table.
const submittedTable = () =>
  attributes.value[0].values.map((label, i) => [
    label,
    ...attributes.value.slice(1).map((_, j) => attrInputs.value[`${i}_${j}`])
  ])

const isTableComplete = table =>
  table.every(row => row.every(cell => cell !== null && cell !== undefined && cell !== ''))

// Emits ('solution-check', complete, table). The parent asks the server
// whether a complete table is correct.
const checkSolution = () => {
  const table = submittedTable()
  emit('solution-check', isTableComplete(table), table)
}

const tools = computed(() => [
  { value: YES, icon: 'ellipse', label: t('logical.toolYes') },
  { value: NO, icon: 'close', label: t('logical.toolNo') },
  { value: EMPTY, icon: 'backspace-outline', label: t('logical.toolErase') }
])

defineExpose({ checkSolution, tableVisible, attrInputs })
</script>

<template>
  <div class="logical" v-if="logical">
    <div class="puzzle-header">
      <h1 class="puzzle-title">{{ logical.name }}</h1>
      <DifficultyIndicator :difficulty="logical.difficulty" :maxDifficulty="5" />
    </div>

    <section class="puzzle-intro">
      <img v-if="logical.image" class="header-image" :src="logical.image" :alt="t('logical.headerImage')" />
      <div class="description-section">
        <p class="description">{{ logical.description }}</p>
        <p v-if="logical.question" class="question">{{ logical.question }}</p>
      </div>
    </section>

    <div class="info-columns">
      <section class="card clues-section">
        <h3>{{ t('logical.clues') }}</h3>
        <ol class="clues-list">
          <li
            v-for="(clue, i) in logical.clues"
            :key="`clue${i}`"
            class="clue"
            :class="{ done: doneClues.has(i) }"
            :title="t('logical.clueDoneTitle')"
            @click="toggleClue(i)"
          >
            <span class="clue-number">{{ i + 1 }}</span>
            <span class="clue-text">{{ clue }}</span>
          </li>
        </ol>
        <p class="hint-text">{{ t('logical.clueHelp') }}</p>
      </section>

      <section class="card attributes-section">
        <h3>{{ t('logical.attributes') }}</h3>
        <dl class="attributes-list">
          <template v-for="(attr, i) in attributes" :key="`attr${i}`">
            <dt>{{ attr.name }}</dt>
            <dd>
              <span v-for="(v, j) in attr.values" :key="`attr${i}_${j}`" class="chip">{{ v }}</span>
            </dd>
          </template>
        </dl>
      </section>
    </div>

    <section class="grid-section">
      <div class="section-head">
        <h3>{{ t('logical.grid') }}</h3>
        <label class="toggle-container">
          <span>{{ t('logical.showTable') }}</span>
          <Toggle v-model="tableVisible" />
        </label>
      </div>

      <template v-if="tableVisible">
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
            <button class="tool" :title="t('logical.undo')" :disabled="!history.canUndo.value" @click="undo">
              <ion-icon name="return-up-back-outline"></ion-icon>
            </button>
            <button class="tool" :title="t('logical.redo')" :disabled="!history.canRedo.value" @click="redo">
              <ion-icon name="return-up-forward-outline"></ion-icon>
            </button>
            <button class="tool" :title="t('logical.restart')" @click="restart">
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
              >{{ attr.name }}</text>
              <text
                v-for="(attr, r) in rowAttributes"
                :key="`rname${r}`"
                class="category-name"
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
                  :class="{ highlight: hover && hover.x === c * m + j }"
                  :transform="`translate(${padLeft + (c * m + j) * cellSize + cellSize / 2}, ${padTop - LABEL_GAP}) rotate(-90)`"
                >{{ val }}</text>
              </template>
              <template v-for="(attr, r) in rowAttributes" :key="`rvals${r}`">
                <text
                  v-for="(val, j) in attr.values"
                  :key="`rval${r}_${j}`"
                  ref="leftLabelRefs"
                  class="left-label"
                  :class="{ highlight: hover && hover.y === r * m + j }"
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
      </template>
    </section>

    <section class="solution-section">
      <h3>{{ t('logical.solution') }}</h3>
      <div class="solution-table">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="attr in attributes" :key="attr.name" scope="col">{{ attr.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in attributes[0].values" :key="i">
              <th scope="row">{{ v }}</th>
              <td v-for="(attr, j) in attributes.slice(1)" :key="j" :data-title="attr.name">
                <MySelect
                  :options="attr.values"
                  :is-disabled="solved"
                  v-model="attrInputs[i + '_' + j]"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@import '../puzzles/engine/board.scss';

.logical {
  --accent: #2563eb;
  --line: #d4d8de;
  --line-strong: #1f2937;
  --hover: rgba(37, 99, 235, 0.1);
  padding-top: 4px;
}

h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px;
}

.puzzle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;

  .puzzle-title {
    font-size: 26px;
    font-weight: 600;
    margin: 0;
  }
}

.puzzle-intro {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 24px;

  .header-image {
    width: 280px;
    max-width: 40%;
    border-radius: 10px;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .description-section {
    flex: 1;
    min-width: 0;
  }

  .description {
    margin: 0 0 12px;
    line-height: 1.6;
  }

  .question {
    margin: 0;
    padding: 10px 14px;
    border-left: 4px solid var(--accent);
    background: #eff6ff;
    border-radius: 0 8px 8px 0;
    font-weight: 600;
    color: #1e3a8a;
  }
}

.info-columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 20px;
  margin-bottom: 28px;
}

.card {
  padding: 16px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafbfc;
}

.clues-list {
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: none;
}

.clue {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 6px 8px;
  margin: 0 -8px 2px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s, color 0.15s;

  &:hover { background: #eef2f7; }

  .clue-number {
    flex: none;
    min-width: 22px;
    height: 22px;
    line-height: 22px;
    text-align: center;
    border-radius: 11px;
    background: #e0e7ff;
    color: #3730a3;
    font-size: 12px;
    font-weight: 700;
  }

  &.done {
    color: #9ca3af;

    .clue-text { text-decoration: line-through; }
    .clue-number { background: #e5e7eb; color: #9ca3af; }
  }
}

.attributes-list {
  margin: 0;

  dt {
    font-weight: 600;
    color: #374151;
    margin-top: 8px;

    &:first-child { margin-top: 0; }
  }

  dd {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 4px 0 0;
  }

  .chip {
    padding: 1px 9px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid #dfe3e8;
    font-size: 13px;
  }
}

.hint-text {
  margin: 10px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 8px;

  h3 { margin: 0; }
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #4b5563;
  cursor: pointer;
}

.grid-section {
  margin-bottom: 28px;
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

.solution-table {
  overflow-x: auto;

  table {
    border-collapse: separate;
    border-spacing: 0;
    min-width: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  th, td {
    padding: 8px 12px;
    border-bottom: 1px solid #eef0f3;
    text-align: left;
    vertical-align: middle;
  }

  tbody tr:last-child th,
  tbody tr:last-child td { border-bottom: none; }

  thead th {
    background: #f3f4f6;
    color: #262664;
    font-weight: 600;
  }

  tbody th {
    font-weight: 600;
    background: #fafbfc;
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  .puzzle-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .puzzle-intro {
    flex-direction: column;

    .header-image {
      width: 100%;
      max-width: 100%;
    }
  }

  .info-columns {
    grid-template-columns: 1fr;
  }
}
</style>
