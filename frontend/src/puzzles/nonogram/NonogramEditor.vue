<template>
  <div class="editor-page">
    <h1 class="page-title">{{ editId ? $t('editor.titleEdit') : $t('editor.titleCreate') }}</h1>
    <div v-if="loadError" class="notification is-danger">{{ loadError }}</div>

    <div v-else class="editor-layout">
      <!-- Drawing -->
      <section class="card canvas-card">
        <div class="toolbar">
          <div class="tool-group" role="radiogroup" :aria-label="$t('editor.tool')">
            <button v-for="t in TOOLS" :key="t.id" class="tool" :class="{ active: tool === t.id }"
                    :title="$t(t.title)" role="radio" :aria-checked="tool === t.id" @click="tool = t.id">
              <ion-icon :name="t.icon"></ion-icon><span>{{ $t(t.label) }}</span>
            </button>
          </div>

          <div class="tool-group palette" role="radiogroup" :aria-label="$t('nonogram.colour')">
            <button v-for="(colour, i) in fills" :key="i" class="swatch" :style="{ backgroundColor: colour }"
                    :class="{ active: selected === i + 1 }" :title="$t('nonogram.colourN', { n: i + 1 })"
                    role="radio" :aria-checked="selected === i + 1" @click="selected = i + 1"></button>
            <button class="swatch eraser" :style="{ backgroundColor: background }" :class="{ active: selected === 0 }"
                    :title="$t('editor.eraser')" role="radio" :aria-checked="selected === 0"
                    @click="selected = 0"><ion-icon name="close-outline"></ion-icon></button>
          </div>

          <div class="tool-group">
            <button class="tool" :title="$t('nonogram.undo')" :disabled="!history.canUndo.value" @click="undo">
              <ion-icon name="return-up-back-outline"></ion-icon>
            </button>
            <button class="tool" :title="$t('nonogram.redo')" :disabled="!history.canRedo.value" @click="redo">
              <ion-icon name="return-up-forward-outline"></ion-icon>
            </button>
          </div>

          <div class="tool-group">
            <button class="tool" :title="$t('editor.shiftLeft')" @click="transform(g => shift(g, -1, 0))"><ion-icon name="arrow-back-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.shiftUp')" @click="transform(g => shift(g, 0, -1))"><ion-icon name="arrow-up-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.shiftDown')" @click="transform(g => shift(g, 0, 1))"><ion-icon name="arrow-down-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.shiftRight')" @click="transform(g => shift(g, 1, 0))"><ion-icon name="arrow-forward-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.flipH')" @click="transform(flipHorizontal)"><ion-icon name="swap-horizontal-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.flipV')" @click="transform(flipVertical)"><ion-icon name="swap-vertical-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.clear')" @click="clearAll"><ion-icon name="trash-outline"></ion-icon></button>
          </div>

          <div class="tool-group">
            <button class="tool" :title="$t('nonogram.zoomOut')" @click="zoom.zoomOut"><ion-icon name="remove-outline"></ion-icon></button>
            <button class="tool" :title="$t('nonogram.zoomIn')" @click="zoom.zoomIn"><ion-icon name="add-outline"></ion-icon></button>
          </div>
        </div>

        <div ref="gridArea" class="grid-area">
          <svg class="editor-svg" :width="left + width * cell + 2" :height="top + height * cell + 2"
               :style="{ '--cell': `${cell}px` }">
            <rect :width="left" :height="top" fill="transparent" />
            <rect :y="top" :width="left" :height="height * cell" class="clue-bg" />
            <rect :x="left" :width="width * cell" :height="top" class="clue-bg" />
            <template v-for="(clues, y) in clueSet.rowClues" :key="`r${y}`">
              <g v-for="(block, i) in clues" :key="i" class="clue"
                 :transform="`translate(${left - (clues.length - i) * cell}, ${top + y * cell})`">
                <rect v-if="fills.length > 1" :width="cell - 2" :height="cell - 2" x="1" y="1" rx="3" :fill="fills[block[0] - 1]" />
                <text :x="cell / 2" :y="cell / 2 + 1" :style="fills.length > 1 ? { fill: textOn(fills[block[0] - 1]) } : null">{{ block[1] }}</text>
              </g>
            </template>
            <template v-for="(clues, x) in clueSet.columnClues" :key="`c${x}`">
              <g v-for="(block, i) in clues" :key="i" class="clue"
                 :transform="`translate(${left + x * cell}, ${top - (clues.length - i) * cell})`">
                <rect v-if="fills.length > 1" :width="cell - 2" :height="cell - 2" x="1" y="1" rx="3" :fill="fills[block[0] - 1]" />
                <text :x="cell / 2" :y="cell / 2 + 1" :style="fills.length > 1 ? { fill: textOn(fills[block[0] - 1]) } : null">{{ block[1] }}</text>
              </g>
            </template>

            <svg :x="left" :y="top" :width="width * cell + 2" :height="height * cell + 2" class="main-grid"
                 v-on="gridHandlers">
              <rect :width="width * cell" :height="height * cell" :fill="background" />
              <template v-for="(row, y) in shown" :key="`gr${y}`">
                <template v-for="(value, x) in row" :key="`gc${x}`">
                  <rect v-if="value > 0" :x="x * cell" :y="y * cell" :width="cell" :height="cell" :fill="fills[value - 1]" />
                </template>
              </template>

              <!-- Ambiguous cells and the suggestion under the mouse -->
              <g v-if="showAmbiguous">
                <rect v-for="c in analysis.cells" :key="`a${c.x}-${c.y}`" :x="c.x * cell + 1.5" :y="c.y * cell + 1.5"
                      :width="cell - 3" :height="cell - 3" class="ambiguous" />
              </g>
              <rect v-if="previewFix" :x="previewFix.x * cell" :y="previewFix.y * cell" :width="cell" :height="cell"
                    class="fix-preview" />

              <path :d="gridLines.thin" class="grid-thin" />
              <path :d="gridLines.thick" class="grid-thick" />
              <g v-if="hover" class="hover-label" :transform="`translate(${hover.x * cell + cell / 2}, ${Math.max(hover.y * cell - 12, 12)})`">
                <rect x="-26" y="-11" width="52" height="22" rx="11" />
                <text>{{ hover.x + 1 }}, {{ hover.y + 1 }}</text>
              </g>
            </svg>
          </svg>
        </div>
        <p class="help">
          {{ $t('editor.help') }}
        </p>
      </section>

      <!-- Side panel -->
      <aside class="side">
        <section class="card status-card" :class="statusClass">
          <h2>{{ $t('editor.check') }}</h2>
          <p class="status-line">
            <ion-icon :name="statusIcon"></ion-icon>
            <span>{{ statusText }}</span>
          </p>
          <template v-if="analysis.status === 'ambiguous'">
            <label class="checkbox-line">
              <input v-model="showOther" type="checkbox"> {{ $t('editor.showOther') }}
            </label>
            <button class="button is-small" :disabled="fixState === 'searching'" @click="findFixes">
              {{ fixState === 'searching' ? $t('editor.searchingFixes') : $t('editor.suggestFixes') }}
            </button>
            <p v-if="fixState === 'none'" class="muted">{{ $t('editor.noFix') }}</p>
            <ul v-if="fixes.length" class="fix-list">
              <li v-for="fix in fixes" :key="`${fix.x}-${fix.y}-${fix.value}`"
                  @mouseenter="previewFix = fix" @mouseleave="previewFix = null">
                <span class="fix-swatch" :style="{ backgroundColor: fix.value ? fills[fix.value - 1] : background }"></span>
                <span class="fix-text">
                  {{ $t('editor.fixCell', { row: fix.y + 1, column: fix.x + 1 }) }}: {{ fix.value ? $t('editor.colourN', { n: fix.value }) : $t('editor.empty') }}
                  <span class="muted">· {{ fix.technique === 'line' ? $t('difficulty.easy') : $t('difficulty.hard') }}</span>
                </span>
                <button class="tool small apply" :title="$t('editor.apply')" @click="applyFix(fix)">{{ $t('editor.apply') }}</button>
              </li>
            </ul>
          </template>
        </section>

        <section class="card">
          <h2>{{ $t('editor.puzzle') }}</h2>
          <label class="field-label">{{ $t('overview.name') }}
            <input v-model.trim="name" class="input" maxlength="80" :placeholder="$t('editor.namePlaceholder')">
          </label>
          <div class="size-row">
            <label class="field-label">{{ $t('overview.width') }}
              <input v-model.number="sizeInput.width" class="input" type="number" :min="MIN_SIZE" :max="MAX_SIZE" @change="applySize">
            </label>
            <label class="field-label">{{ $t('overview.height') }}
              <input v-model.number="sizeInput.height" class="input" type="number" :min="MIN_SIZE" :max="MAX_SIZE" @change="applySize">
            </label>
          </div>
          <label class="field-label">{{ $t('overview.difficulty') }}
            <select v-model.number="difficulty" class="input">
              <option v-for="d in 5" :key="d" :value="d">{{ d }}{{ d === suggested ? ` (${$t('editor.suggested')})` : '' }}</option>
            </select>
          </label>

          <div class="field-label">{{ $t('overview.colors') }}</div>
          <div class="colour-list">
            <div v-for="(colour, i) in fills" :key="i" class="colour-row">
              <input type="color" :value="colour" :aria-label="$t('editor.colourN', { n: i + 1 })" @input="setFill(i, $event.target.value)">
              <span>{{ $t('editor.colourN', { n: i + 1 }) }}</span>
              <button v-if="fills.length > 1" class="tool small" :title="$t('editor.removeColour')" @click="removeFill(i)">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </div>
            <div class="colour-row">
              <input type="color" :value="background" :aria-label="$t('editor.background')" @input="setBackground($event.target.value)">
              <span>{{ $t('editor.background') }}</span>
            </div>
            <button v-if="fills.length < MAX_FILLS" class="button is-small" @click="addFill">+ {{ $t('editor.addColour') }}</button>
          </div>
        </section>

        <section class="card">
          <h2>{{ $t('editor.importTitle') }}</h2>
          <p class="muted">{{ $t('editor.importText') }}</p>
          <div class="size-row">
            <label class="field-label">{{ $t('overview.width') }}
              <input v-model.number="importOptions.width" class="input" type="number" :min="MIN_SIZE" :max="MAX_SIZE">
            </label>
            <label class="field-label">{{ $t('overview.colors') }}
              <select v-model.number="importOptions.colours" class="input">
                <option v-for="n in 6" :key="n" :value="n">{{ n }}</option>
              </select>
            </label>
          </div>
          <input ref="fileInput" type="file" accept="image/*" class="file-input" @change="importImage">
          <p v-if="importError" class="error-text">{{ importError }}</p>
        </section>

        <section class="card actions">
          <button class="button" @click="togglePlay">{{ playing ? $t('editor.stopTest') : $t('editor.test') }}</button>
          <button class="button is-primary" :disabled="!canSave || saving" @click="save">
            {{ saving ? $t('editor.saving') : editId ? $t('editor.saveChanges') : $t('editor.publish') }}
          </button>
          <p v-if="!store.isUserLoggedIn" class="muted">{{ $t('editor.loginToPublish') }}</p>
          <p v-else-if="store.user && store.user.emailVerified === false" class="muted">{{ $t('editor.verifyToPublish') }}</p>
          <p v-else-if="saveBlocker" class="muted">{{ saveBlocker }}</p>
          <p v-if="saveError" class="error-text">{{ saveError }}</p>
        </section>
      </aside>
    </div>

    <section v-if="playing" ref="playCard" class="card play-card">
      <h2>{{ $t('editor.testTitle') }}</h2>
      <p class="muted">{{ $t('editor.testText') }}</p>
      <NonogramBoard :puzzle="playPuzzle" :submit="noSubmit" @solved="playSolved = true" />
      <p v-if="playSolved" class="success-text">{{ $t('editor.testSolved') }}</p>
    </section>
  </div>
</template>

<script setup>
// Nonogram editor: draw (or import) a picture, see its clues live, and let
// the solver (in a Web Worker) check that it has exactly one solution. For an
// ambiguous drawing it marks the cells that could differ and suggests
// one-cell fixes. New puzzles are drafted in localStorage until published.

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from '@/store/store'
import { apiErrorMessage } from '@/i18n'
import PuzzleService from '@/services/PuzzleService'
import {
  MIN_SIZE, MAX_SIZE, blankGrid, cluesOf, lineCells, rectCells, paint, floodFill, resize, shift,
  flipHorizontal, flipVertical, removeColour, quantizeImage
} from '@shared/puzzles/nonogramEditor.js'
import NonogramBoard from './NonogramBoard.vue'
import { useGridPointer } from '../engine/useGridPointer'
import { useHistory } from '../engine/useHistory'
import { useZoom } from '../engine/useZoom'
import { textColorFor } from '../engine/colors'

const TOOLS = [
  { id: 'pen', label: 'editor.tools.pen', icon: 'pencil-outline', title: 'editor.tools.penTitle' },
  { id: 'line', label: 'editor.tools.line', icon: 'remove-outline', title: 'editor.tools.lineTitle' },
  { id: 'rect', label: 'editor.tools.rect', icon: 'square-outline', title: 'editor.tools.rectTitle' },
  { id: 'fill', label: 'editor.tools.fill', icon: 'color-fill-outline', title: 'editor.tools.fillTitle' }
]
const MAX_FILLS = 8
const DRAFT_KEY = 'logivilia:nonogram-draft'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const { t } = useI18n()
const editId = computed(() => (route.params.id ? Number(route.params.id) : null))

const zoom = useZoom({ base: 25, min: 10, step: 3 })
const cell = zoom.cellSize
const history = useHistory()

const name = ref('')
const difficulty = ref(2)
const fills = ref(['#000000'])
const background = ref('#ffffff')
const grid = ref(blankGrid(15, 15))
const sizeInput = ref({ width: 15, height: 15 })
const tool = ref('pen')
const selected = ref(1)
const hover = ref(null)
const loadError = ref('')

const width = computed(() => grid.value[0]?.length || 0)
const height = computed(() => grid.value.length)
const textOn = colour => textColorFor(colour || '#000000')

// ---------------------------------------------------------------------------
// Analysis in a Web Worker
// ---------------------------------------------------------------------------

const analysis = ref({ status: 'checking' })
const showOther = ref(false)
const fixes = ref([])
const fixState = ref('idle')
const previewFix = ref(null)
let worker = null
let requestId = 0
let analyzeTimer = null
const pending = new Map()

function ask (message) {
  return new Promise((resolve, reject) => {
    const id = ++requestId
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, ...message })
  })
}

function scheduleAnalysis () {
  fixes.value = []
  fixState.value = 'idle'
  previewFix.value = null
  analysis.value = { status: 'checking' }
  clearTimeout(analyzeTimer)
  analyzeTimer = setTimeout(async () => {
    const snapshot = JSON.stringify(grid.value)
    try {
      const result = await ask({ kind: 'analyze', grid: grid.value.map(r => [...r]), colourCount: fills.value.length })
      // Ignore answers for a drawing that has changed since.
      if (JSON.stringify(grid.value) === snapshot) {
        analysis.value = result
        if (result.status === 'unique' && !difficultyTouched) difficulty.value = result.difficulty
      }
    } catch {
      analysis.value = { status: 'too-complex' }
    }
  }, 350)
}

async function findFixes () {
  fixState.value = 'searching'
  const snapshot = JSON.stringify(grid.value)
  try {
    const result = await ask({
      kind: 'fixes',
      grid: grid.value.map(r => [...r]),
      colourCount: fills.value.length,
      // Plain copies: a reactive proxy cannot be sent to a worker.
      cells: analysis.value.cells.map(({ x, y }) => ({ x, y }))
    })
    if (JSON.stringify(grid.value) !== snapshot) return
    fixes.value = result
    fixState.value = result.length ? 'done' : 'none'
  } catch {
    fixState.value = 'none'
  }
}

function applyFix (fix) {
  commit(paint(grid.value, [fix], fix.value))
}

const suggested = computed(() => (analysis.value.status === 'unique' ? analysis.value.difficulty : null))
let difficultyTouched = false
watch(difficulty, (value) => { if (value !== suggested.value) difficultyTouched = true })

const showAmbiguous = computed(() => analysis.value.status === 'ambiguous' && !showOther.value)
const shown = computed(() => (analysis.value.status === 'ambiguous' && showOther.value ? analysis.value.other : grid.value))

const statusText = computed(() => {
  const a = analysis.value
  switch (a.status) {
    case 'checking': return t('editor.status.checking')
    case 'empty': return t('editor.status.empty')
    case 'unique': return a.technique === 'line'
      ? t('editor.status.uniqueLine')
      : t('editor.status.uniqueHard')
    case 'ambiguous': return t('editor.status.ambiguous', { n: a.cells.length })
    default: return t('editor.status.tooComplex')
  }
})
const statusClass = computed(() => ({
  ok: analysis.value.status === 'unique',
  bad: analysis.value.status === 'ambiguous' || analysis.value.status === 'too-complex'
}))
const statusIcon = computed(() => ({
  checking: 'hourglass-outline', empty: 'brush-outline', unique: 'checkmark-circle', ambiguous: 'alert-circle'
}[analysis.value.status] || 'alert-circle'))

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const clueSet = computed(() => cluesOf(grid.value))
const left = computed(() => Math.max(1, ...clueSet.value.rowClues.map(c => c.length)) * cell.value + 4)
const top = computed(() => Math.max(1, ...clueSet.value.columnClues.map(c => c.length)) * cell.value + 4)

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

function commit (next, { force = false } = {}) {
  if (!force && JSON.stringify(next) === JSON.stringify(grid.value)) return
  grid.value = next
  history.push(next)
  saveDraft()
  scheduleAnalysis()
}

const transform = fn => commit(fn(grid.value))
const clearAll = () => commit(blankGrid(width.value, height.value))

const undo = () => {
  const previous = history.undo()
  if (previous) { grid.value = previous; syncSizeInput(); saveDraft(); scheduleAnalysis() }
}
const redo = () => {
  const next = history.redo()
  if (next) { grid.value = next; syncSizeInput(); saveDraft(); scheduleAnalysis() }
}

let before = null
let start = null
let last = null
let value = 0

const pointer = useGridPointer({
  cellSize: cell,
  width,
  height,
  enabled: () => !playing.value,
  onStart (pos, event) {
    before = grid.value
    start = pos
    last = pos
    value = event.button === 2 ? 0 : selected.value
    if (tool.value === 'fill') {
      grid.value = floodFill(before, pos.x, pos.y, value)
    } else {
      grid.value = paint(before, [pos], value)
    }
  },
  onMove (pos) {
    hover.value = pos
    if (tool.value === 'pen') {
      grid.value = paint(grid.value, lineCells(last, pos), value)
    } else if (tool.value === 'line') {
      grid.value = paint(before, lineCells(start, pos), value)
    } else if (tool.value === 'rect') {
      grid.value = paint(before, rectCells(start, pos), value)
    }
    last = pos
  },
  onEnd () {
    const next = grid.value
    grid.value = before
    if (JSON.stringify(next) !== JSON.stringify(before)) commit(next)
  }
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
    if (!pointer.active.value && event.pointerType === 'mouse') hover.value = cellAt(event)
    pointer.handlers.pointermove(event)
  },
  pointerleave () { if (!pointer.active.value) hover.value = null }
}

// ---------------------------------------------------------------------------
// Size and colours
// ---------------------------------------------------------------------------

const clampSize = n => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(Number(n) || MIN_SIZE)))
const syncSizeInput = () => { sizeInput.value = { width: width.value, height: height.value } }

function applySize () {
  const w = clampSize(sizeInput.value.width)
  const h = clampSize(sizeInput.value.height)
  sizeInput.value = { width: w, height: h }
  if (w !== width.value || h !== height.value) {
    commit(resize(grid.value, w, h))
    nextTick(fitToScreen)
  }
}

function setFill (i, colour) { fills.value = fills.value.map((c, j) => (j === i ? colour : c)); saveDraft() }
function setBackground (colour) { background.value = colour; saveDraft() }
function addFill () {
  const defaults = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#fdd835', '#6d4c41', '#00acc1']
  fills.value = [...fills.value, defaults.find(c => !fills.value.includes(c)) || '#888888']
  selected.value = fills.value.length
  saveDraft()
  scheduleAnalysis()
}
function removeFill (i) {
  fills.value = fills.value.filter((_, j) => j !== i)
  if (selected.value > fills.value.length) selected.value = fills.value.length
  commit(removeColour(grid.value, i + 1), { force: true })
}

// ---------------------------------------------------------------------------
// Image import
// ---------------------------------------------------------------------------

const fileInput = ref(null)
const importOptions = ref({ width: 20, colours: 1 })
const importError = ref('')

function importImage (event) {
  importError.value = ''
  const file = event.target.files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(url)
    const w = clampSize(importOptions.value.width)
    const h = clampSize(Math.round(w * image.naturalHeight / image.naturalWidth))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, w, h)
    const { grid: imported, colors } = quantizeImage(context.getImageData(0, 0, w, h).data, w, h, importOptions.value.colours)
    fills.value = colors.slice(0, -1).length ? colors.slice(0, -1) : ['#000000']
    background.value = colors[colors.length - 1]
    selected.value = 1
    commit(imported, { force: true })
    syncSizeInput()
    nextTick(fitToScreen)
    if (fileInput.value) fileInput.value.value = ''
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    importError.value = t('editor.importFailed')
  }
  image.src = url
}

// ---------------------------------------------------------------------------
// Test play
// ---------------------------------------------------------------------------

const playing = ref(false)
const playSolved = ref(false)
const PLAY_ID = 'editor-preview'
const playPuzzle = ref(null)
const playCard = ref(null)
const noSubmit = async () => true

function togglePlay () {
  if (playing.value) { playing.value = false; return }
  try { localStorage.removeItem(`logivilia:nonogram:${PLAY_ID}`) } catch { /* ignore */ }
  playPuzzle.value = {
    id: PLAY_ID, name: name.value, width: width.value, height: height.value,
    colors: [...fills.value, background.value], ...cluesOf(grid.value)
  }
  playSolved.value = false
  playing.value = true
  nextTick(() => playCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// ---------------------------------------------------------------------------
// Draft and saving
// ---------------------------------------------------------------------------

function saveDraft () {
  if (editId.value) return
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      name: name.value, fills: fills.value, background: background.value, grid: grid.value
    }))
  } catch { /* storage unavailable */ }
}
watch(name, saveDraft)

function loadDraft () {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    if (draft && Array.isArray(draft.grid) && draft.grid.length && Array.isArray(draft.fills)) return draft
  } catch { /* ignore */ }
  return null
}

const saving = ref(false)
const saveError = ref('')
const saveBlocker = computed(() => {
  if (!name.value) return t('editor.needName')
  if (analysis.value.status !== 'unique') return t('editor.needUnique')
  return ''
})
const canSave = computed(() => store.isUserLoggedIn && store.user?.emailVerified !== false && !saveBlocker.value)

async function save () {
  saving.value = true
  saveError.value = ''
  const puzzle = {
    type: 'nonogram',
    name: name.value,
    difficulty: difficulty.value,
    width: width.value,
    height: height.value,
    numColor: fills.value.length,
    colors: [...fills.value, background.value],
    solution: grid.value
  }
  try {
    const { data } = editId.value
      ? await PuzzleService.put({ ...puzzle, id: editId.value })
      : await PuzzleService.post({ ...puzzle, date: new Date().toISOString().slice(0, 10), author: store.user?.username })
    if (!editId.value) {
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    }
    router.push(`/puzzle/${data.id}`)
  } catch (err) {
    saveError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const gridArea = ref(null)
function fitToScreen () {
  const available = (gridArea.value?.clientWidth || 600) - 8
  const columns = width.value + Math.max(2, ...clueSet.value.rowClues.map(c => c.length))
  zoom.setCellSize(Math.min(Math.max(Math.floor(available / columns), 12), 30))
}

function onKey (event) {
  if (event.target.closest?.('input, textarea, select, [contenteditable]')) return
  const ctrl = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()
  if (ctrl && key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo() } else if (ctrl && key === 'y') { event.preventDefault(); redo() } else if (!ctrl && /^[0-9]$/.test(key) && Number(key) <= fills.value.length) selected.value = Number(key)
  else if (!ctrl && { p: 1, l: 1, r: 1, f: 1 }[key]) tool.value = { p: 'pen', l: 'line', r: 'rect', f: 'fill' }[key]
}

async function load () {
  if (editId.value) {
    try {
      const { data } = await PuzzleService.source(editId.value)
      if (data.type !== 'nonogram') throw new Error('not a nonogram')
      name.value = data.name || ''
      difficulty.value = Number(data.difficulty) || 2
      difficultyTouched = true
      fills.value = data.colors.slice(0, -1)
      background.value = data.colors[data.colors.length - 1]
      grid.value = data.solution.slice(0, Number(data.height)).map(row => row.slice(0, Number(data.width)).map(Number))
    } catch (err) {
      loadError.value = err.response ? apiErrorMessage(err) : t('editor.cannotEdit')
      return
    }
  } else {
    const draft = loadDraft()
    if (draft) {
      name.value = draft.name || ''
      fills.value = draft.fills.length ? draft.fills : ['#000000']
      background.value = draft.background || '#ffffff'
      grid.value = draft.grid
    }
  }
  syncSizeInput()
  history.reset(grid.value)
  scheduleAnalysis()
  await nextTick()
  fitToScreen()
}

onMounted(() => {
  worker = new Worker(new URL('./solverWorker.js', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }) => {
    const entry = pending.get(data.id)
    if (!entry) return
    pending.delete(data.id)
    data.error ? entry.reject(new Error(data.error)) : entry.resolve(data.result)
  }
  window.addEventListener('keydown', onKey)
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(analyzeTimer)
  worker?.terminate()
})
</script>

<style lang="scss" scoped>
.editor-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
  --accent: #2563eb;
}

.page-title {
  font-size: 1.6rem;
  margin-bottom: 14px;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 16px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.card {
  background: #fff;
  border: 1px solid #e3e6ea;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  h2 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 8px;
  }
}

.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin-bottom: 10px;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid #e3e6ea;
  border-radius: 10px;
}

.palette {
  gap: 6px;
  padding: 4px 7px;
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  min-width: 30px;
  padding: 0 6px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #374151;
  font-size: 13px;
  cursor: pointer;

  &:hover:not(:disabled) { background: #f0f2f5; }
  &.active { background: #dbe7fe; color: #1e40af; }
  &:disabled { opacity: 0.35; cursor: default; }
  &.small { height: 24px; min-width: 24px; }

  ion-icon { font-size: 18px; }
}

.swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.25);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &.active { outline: 3px solid var(--accent); outline-offset: 2px; }
  &.eraser ion-icon { color: #9ca3af; font-size: 16px; }
}

.grid-area {
  overflow: auto;
  user-select: none;
  -webkit-user-select: none;
}

.editor-svg {
  display: block;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.clue-bg { fill: #f6f7f9; }

.clue text {
  font-size: calc(var(--cell) * 0.56);
  font-weight: 600;
  fill: #111827;
  text-anchor: middle;
  dominant-baseline: middle;
}

.main-grid {
  overflow: visible;
  cursor: crosshair;
  touch-action: none;
}

.grid-thin { stroke: rgba(120, 128, 140, 0.45); stroke-width: 1; fill: none; shape-rendering: crispEdges; pointer-events: none; }
.grid-thick { stroke: #1f2937; stroke-width: 2; fill: none; shape-rendering: crispEdges; pointer-events: none; }

.ambiguous {
  fill: rgba(220, 38, 38, 0.15);
  stroke: #dc2626;
  stroke-width: 2;
  pointer-events: none;
}

.fix-preview {
  fill: rgba(245, 158, 11, 0.35);
  stroke: #f59e0b;
  stroke-width: 3;
  pointer-events: none;
}

.hover-label {
  pointer-events: none;

  rect { fill: rgba(31, 41, 55, 0.8); }
  text { fill: #fff; font-size: 11px; text-anchor: middle; dominant-baseline: central; }
}

.help, .muted {
  font-size: 13px;
  color: #6b7280;
}

.help { margin-top: 8px; }

.status-line {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 8px;

  ion-icon { font-size: 20px; flex-shrink: 0; }
}

.ok .status-line ion-icon { color: #16a34a; }
.bad .status-line ion-icon { color: #dc2626; }

.checkbox-line {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 14px;
  margin-bottom: 8px;
}

.fix-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    padding: 3px 6px;
    border-radius: 6px;

    &:hover { background: #fff7e6; }
  }

  .fix-text { flex: 1; }
  .apply { background: #e8f0fe; color: #1e40af; font-weight: 600; }
}

.fix-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.3);
}

.field-label {
  display: block;
  text-align: left;
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 8px;

  .input { margin-top: 3px; }
}

.size-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.colour-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.colour-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;

  input[type='color'] {
    width: 34px;
    height: 26px;
    padding: 0;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: none;
    cursor: pointer;
  }
}

.file-input { font-size: 13px; }

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-text { color: #b91c1c; font-size: 13px; }
.success-text { color: #166534; font-weight: 600; margin-top: 8px; }

.play-card { margin-top: 16px; }
</style>
