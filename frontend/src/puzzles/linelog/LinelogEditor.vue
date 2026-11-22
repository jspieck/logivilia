<template>
  <div class="editor-page">
    <h1 class="page-title">{{ editId ? $t('linelogEditor.titleEdit') : $t('linelogEditor.titleCreate') }}</h1>
    <div v-if="loadError" class="notification is-danger">{{ loadError }}</div>

    <div v-else class="editor-layout">
      <!-- Drawing -->
      <section class="card canvas-card">
        <div class="toolbar">
          <div class="tool-group" role="radiogroup" :aria-label="$t('editor.tool')">
            <button v-for="item in TOOLS" :key="item.id" class="tool" :class="{ active: tool === item.id }"
                    :title="$t(item.title)" role="radio" :aria-checked="tool === item.id" @click="tool = item.id">
              <ion-icon :name="item.icon"></ion-icon><span>{{ $t(item.label) }}</span>
            </button>
          </div>

          <div v-if="tool !== 'path'" class="tool-group palette" role="radiogroup" :aria-label="$t('nonogram.colour')">
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
            <button class="tool" :title="$t('editor.shiftLeft')" @click="moveBy(-1, 0)"><ion-icon name="arrow-back-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.shiftUp')" @click="moveBy(0, -1)"><ion-icon name="arrow-up-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.shiftDown')" @click="moveBy(0, 1)"><ion-icon name="arrow-down-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.shiftRight')" @click="moveBy(1, 0)"><ion-icon name="arrow-forward-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.flipH')" @click="flip('h')"><ion-icon name="swap-horizontal-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.flipV')" @click="flip('v')"><ion-icon name="swap-vertical-outline"></ion-icon></button>
            <button class="tool" :title="$t('editor.clear')" @click="clearAll"><ion-icon name="trash-outline"></ion-icon></button>
          </div>

          <div class="tool-group">
            <button class="tool" :title="$t('nonogram.zoomOut')" @click="zoom.zoomOut"><ion-icon name="remove-outline"></ion-icon></button>
            <button class="tool" :title="$t('nonogram.zoomIn')" @click="zoom.zoomIn"><ion-icon name="add-outline"></ion-icon></button>
          </div>
        </div>

        <div ref="gridArea" class="grid-area">
          <svg class="editor-svg main-grid" :width="width * cell + 2" :height="height * cell + 2" v-on="gridHandlers">
            <rect :width="width * cell" :height="height * cell" fill="#ffffff" />

            <!-- The picture, pale, so paths and numbers stand out -->
            <g class="picture">
              <template v-for="(row, y) in shownPicture" :key="`r${y}`">
                <template v-for="(value, x) in row" :key="`c${x}`">
                  <rect v-if="value > 0" :x="x * cell" :y="y * cell" :width="cell" :height="cell" :fill="fills[value - 1]" />
                </template>
              </template>
            </g>

            <path :d="gridLines.thin" class="grid-thin" />
            <path :d="gridLines.thick" class="grid-thick" />

            <!-- Where another solution colours differently -->
            <g v-if="showAmbiguous">
              <rect v-for="c in analysis.cells" :key="`a${c.x}-${c.y}`" :x="c.x * cell + 1.5" :y="c.y * cell + 1.5"
                    :width="cell - 3" :height="cell - 3" class="ambiguous" />
            </g>

            <!-- Paths -->
            <g v-for="(path, k) in displayPaths" :key="`p${k}`" class="path" :class="{ conflict: showAmbiguous && conflictSet.has(k) }">
              <path :d="pathD(path)" class="path-outline" :stroke-width="strokeWidth + 2" />
              <path :d="pathD(path)" :stroke="fills[colourAt(path[0]) - 1]" :stroke-width="strokeWidth" />
            </g>

            <!-- Numbers -->
            <template v-for="(row, y) in shownNumbers" :key="`nr${y}`">
              <template v-for="(n, x) in row" :key="`nc${x}`">
                <g v-if="n > 0" class="number" :transform="`translate(${x * cell}, ${y * cell})`">
                  <circle :cx="cell / 2" :cy="cell / 2" :r="cell * 0.4" :fill="fills[shownPicture[y][x] - 1]" />
                  <text :x="cell / 2" :y="cell / 2 + 1" :fill="textOn(fills[shownPicture[y][x] - 1])"
                        :style="{ fontSize: `${n > 9 ? cell * 0.42 : cell * 0.52}px` }">{{ n }}</text>
                </g>
              </template>
            </template>

            <g v-if="drawing" class="hover-label" :transform="labelAt(drawing[drawing.length - 1])">
              <rect x="-20" y="-11" width="40" height="22" rx="11" />
              <text>{{ drawing.length }}</text>
            </g>
            <g v-else-if="hover" class="hover-label" :transform="labelAt([hover.x, hover.y])">
              <rect x="-26" y="-11" width="52" height="22" rx="11" />
              <text>{{ hover.x + 1 }}, {{ hover.y + 1 }}</text>
            </g>
          </svg>
        </div>
        <p class="help">{{ tool === 'path' ? $t('linelogEditor.helpPath') : $t('linelogEditor.helpPaint') }}</p>
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
            <button v-if="analysis.conflicts.length" class="button is-small" @click="dissolveConflicts">
              {{ $t('linelogEditor.dissolve', { n: analysis.conflicts.length }, analysis.conflicts.length) }}
            </button>
          </template>
          <p class="muted stats">{{ $t('linelogEditor.stats', { paths: paths.length, ones: onesCount, max: maxNumber }) }}</p>
        </section>

        <section class="card">
          <h2>{{ $t('linelogEditor.generateTitle') }}</h2>
          <p class="muted">{{ $t('linelogEditor.generateText') }}</p>
          <label class="field-label">{{ $t('linelogEditor.maxNumber') }}
            <input v-model.number="maxNumberInput" class="input" type="number" min="2" max="40">
          </label>
          <div class="button-row">
            <button class="button is-small is-primary" :disabled="generating || !hasPicture" @click="runGenerate(false)">
              {{ generating ? $t('linelogEditor.generating') : $t('linelogEditor.generate') }}
            </button>
            <button class="button is-small" :disabled="generating || !hasPicture" :title="$t('linelogEditor.regenerateTitle')"
                    @click="runGenerate(true)">{{ $t('linelogEditor.regenerate') }}</button>
            <button class="button is-small" :disabled="generating || !paths.length" @click="clearPaths">
              {{ $t('linelogEditor.clearPaths') }}
            </button>
          </div>
          <p v-if="generateNote" class="muted">{{ generateNote }}</p>
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
          <button class="button" :disabled="!hasPicture" @click="togglePlay">{{ playing ? $t('editor.stopTest') : $t('editor.test') }}</button>
          <button class="button is-primary" :disabled="!canSave || saving" @click="save">
            {{ saving ? $t('editor.saving') : editId ? $t('editor.saveChanges') : isAdmin ? $t('editor.publish') : $t('editor.submit') }}
          </button>
          <p v-if="!editId && !isAdmin" class="muted">{{ $t('editor.reviewNotice') }}</p>
          <p v-if="draftStatus" class="muted draft-status">{{ $t(`editor.draft.${draftStatus}`) }}</p>
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
      <LinelogBoard :puzzle="playPuzzle" :submit="checkTestAnswer" @solved="playSolved = true" />
      <p v-if="playSolved" class="success-text">{{ $t('editor.testSolved') }}</p>
    </section>
  </div>
</template>

<script setup>
// Linelog editor: paint a picture (or import one), then let the generator
// turn it into numbers, or draw paths yourself. A worker checks that the
// numbers lead to exactly one picture; for an ambiguous draft it marks the
// cells that could differ and offers to split the paths involved.
// New puzzles are drafted on the server (logged in) or in localStorage until
// published (engine/useDraft.js).
//
// Draft: `picture` (rows, 0 = background, k = colour k) and `paths` (lists of
// [x, y], all on one colour). Coloured cells on no path become 1s.

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from '@/store/store'
import { apiErrorMessage } from '@/i18n'
import PuzzleService from '@/services/PuzzleService'
import {
  MIN_SIZE, MAX_SIZE, blankGrid, lineCells, rectCells, paint, floodFill, resize, shift,
  flipHorizontal, flipVertical, removeColour, quantizeImage
} from '@shared/puzzles/nonogramEditor.js'
import {
  DEFAULT_MAX_NUMBER, cleanPaths, informationOf, mapPaths, pathTransforms
} from '@shared/puzzles/linelogEditor.js'
import LinelogBoard from './LinelogBoard.vue'
import { useGridPointer } from '../engine/useGridPointer'
import { useHistory } from '../engine/useHistory'
import { useZoom } from '../engine/useZoom'
import { useDraft } from '../engine/useDraft'
import { textColorFor } from '../engine/colors'

const TOOLS = [
  { id: 'path', label: 'linelogEditor.tools.path', icon: 'git-commit-outline', title: 'linelogEditor.tools.pathTitle' },
  { id: 'pen', label: 'editor.tools.pen', icon: 'pencil-outline', title: 'editor.tools.penTitle' },
  { id: 'line', label: 'editor.tools.line', icon: 'remove-outline', title: 'editor.tools.lineTitle' },
  { id: 'rect', label: 'editor.tools.rect', icon: 'square-outline', title: 'editor.tools.rectTitle' },
  { id: 'fill', label: 'editor.tools.fill', icon: 'color-fill-outline', title: 'editor.tools.fillTitle' }
]
const MAX_FILLS = 8
const DRAFT_KEY = 'logivilia:linelog-draft'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const { t } = useI18n()
const editId = computed(() => (route.params.id ? Number(route.params.id) : null))
// Admins publish directly; everyone else submits for review.
const isAdmin = computed(() => store.user?.role === 'Admin')

const zoom = useZoom({ base: 25, min: 12, step: 3 })
const cell = zoom.cellSize
const history = useHistory()

const name = ref('')
const difficulty = ref(2)
const fills = ref(['#000000'])
const background = ref('#ffffff')
const picture = ref(blankGrid(15, 15))
const paths = ref([])
const sizeInput = ref({ width: 15, height: 15 })
const tool = ref('pen')
const selected = ref(1)
const hover = ref(null)
const loadError = ref('')

const width = computed(() => picture.value[0]?.length || 0)
const height = computed(() => picture.value.length)
const textOn = colour => textColorFor(colour || '#000000')
const colourAt = ([x, y]) => picture.value[y]?.[x] || 0
const hasPicture = computed(() => picture.value.some(row => row.some(Boolean)))
const strokeWidth = computed(() => Math.max(cell.value * 0.3, 3))

// ---------------------------------------------------------------------------
// Analysis and generator in a Web Worker
// ---------------------------------------------------------------------------

const analysis = ref({ status: 'checking' })
const showOther = ref(false)
const generating = ref(false)
const generateNote = ref('')
const maxNumberInput = ref(DEFAULT_MAX_NUMBER)
let generateSeed = 1
let worker = null
let requestId = 0
let analyzeTimer = null
const pending = new Map()

// Plain copies: a reactive proxy cannot be sent to a worker.
const plain = value => JSON.parse(JSON.stringify(value))

function ask (message) {
  return new Promise((resolve, reject) => {
    const id = ++requestId
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, ...plain(message) })
  })
}

const snapshot = () => JSON.stringify({ picture: picture.value, paths: paths.value })

function scheduleAnalysis () {
  analysis.value = { status: 'checking' }
  clearTimeout(analyzeTimer)
  analyzeTimer = setTimeout(async () => {
    const before = snapshot()
    try {
      const result = await ask({ kind: 'analyze', picture: picture.value, paths: paths.value })
      // Ignore answers for a draft that has changed since.
      if (snapshot() === before) {
        analysis.value = result
        if (result.status === 'unique' && !difficultyTouched) difficulty.value = result.difficulty
      }
    } catch {
      analysis.value = { status: 'too-complex' }
    }
  }, 350)
}

async function runGenerate (fresh) {
  const max = Math.min(40, Math.max(2, Math.round(Number(maxNumberInput.value) || DEFAULT_MAX_NUMBER)))
  maxNumberInput.value = max
  generating.value = true
  generateNote.value = ''
  if (fresh) generateSeed += 1
  const before = snapshot()
  try {
    const result = await ask({
      kind: 'generate', picture: picture.value, paths: fresh ? [] : paths.value, maxNumber: max, seed: generateSeed
    })
    if (snapshot() !== before) return
    commit(picture.value, result.paths)
    if (!result.complete) generateNote.value = t('linelogEditor.generatePartial')
  } catch {
    generateNote.value = t('linelogEditor.generateFailed')
  } finally {
    generating.value = false
  }
}

const suggested = computed(() => (analysis.value.status === 'unique' ? analysis.value.difficulty : null))
let difficultyTouched = false
watch(difficulty, (value) => { if (value !== suggested.value) difficultyTouched = true })

const showAmbiguous = computed(() => analysis.value.status === 'ambiguous' && !showOther.value)
const conflictSet = computed(() => new Set(analysis.value.conflicts || []))

const statusText = computed(() => {
  const a = analysis.value
  switch (a.status) {
    case 'checking': return t('editor.status.checking')
    case 'empty': return t('linelogEditor.status.empty')
    case 'unique': return t('linelogEditor.status.unique')
    case 'ambiguous': return t('linelogEditor.status.ambiguous', { n: a.cells.length })
    default: return t('linelogEditor.status.tooComplex')
  }
})
const statusClass = computed(() => ({
  ok: analysis.value.status === 'unique',
  bad: analysis.value.status === 'ambiguous' || analysis.value.status === 'too-complex'
}))
const statusIcon = computed(() => ({
  checking: 'hourglass-outline', empty: 'brush-outline', unique: 'checkmark-circle', ambiguous: 'alert-circle'
}[analysis.value.status] || 'alert-circle'))

function dissolveConflicts () {
  const drop = conflictSet.value
  commit(picture.value, paths.value.filter((_, i) => !drop.has(i)))
}

// ---------------------------------------------------------------------------
// What is shown
// ---------------------------------------------------------------------------

const drawing = ref(null)
// While painting, paths broken by the new picture disappear at once.
const livePaths = computed(() => {
  const list = cleanPaths(picture.value, paths.value)
  return drawing.value && drawing.value.length > 1 ? [...list, drawing.value] : list
})
const otherShown = computed(() => analysis.value.status === 'ambiguous' && showOther.value)
const shownPicture = computed(() => (otherShown.value ? analysis.value.other : picture.value))
const displayPaths = computed(() => (otherShown.value ? analysis.value.otherPaths.filter(p => p.length > 1) : livePaths.value))
// The numbers are the same for every solution, so they come from the draft.
const shownNumbers = computed(() => informationOf(picture.value, livePaths.value).information)

const onesCount = computed(() => informationOf(picture.value, paths.value).information.flat().filter(n => n === 1).length)
const maxNumber = computed(() => Math.max(hasPicture.value ? 1 : 0, ...paths.value.map(p => p.length)))

const pathD = cells => cells.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + 0.5) * cell.value} ${(y + 0.5) * cell.value}`).join(' ')
const labelAt = ([x, y]) => `translate(${x * cell.value + cell.value / 2}, ${Math.max(y * cell.value - 12, 12)})`

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

// ---------------------------------------------------------------------------
// Changes and history
// ---------------------------------------------------------------------------

// Paths run from their top-left end, so the same path always compares equal.
const orient = path => {
  const [a, b] = [path[0], path[path.length - 1]]
  return a[1] * MAX_SIZE + a[0] <= b[1] * MAX_SIZE + b[0] ? path : [...path].reverse()
}

function commit (nextPicture, nextPaths, { force = false } = {}) {
  const cleaned = cleanPaths(nextPicture, nextPaths).map(orient)
  const next = JSON.stringify({ picture: nextPicture, paths: cleaned })
  if (!force && next === snapshot()) return
  picture.value = nextPicture
  paths.value = cleaned
  history.push(next)
  saveDraft()
  scheduleAnalysis()
}

function restore (json) {
  const state = JSON.parse(json)
  picture.value = state.picture
  paths.value = state.paths
  syncSizeInput()
  saveDraft()
  scheduleAnalysis()
}
const undo = () => { const previous = history.undo(); if (previous) restore(previous) }
const redo = () => { const next = history.redo(); if (next) restore(next) }

const moveBy = (dx, dy) => commit(shift(picture.value, dx, dy),
  mapPaths(paths.value, pathTransforms.shift(width.value, height.value, dx, dy)))
const flip = axis => commit(
  axis === 'h' ? flipHorizontal(picture.value) : flipVertical(picture.value),
  mapPaths(paths.value, axis === 'h' ? pathTransforms.flipHorizontal(width.value) : pathTransforms.flipVertical(width.value, height.value)))
const clearAll = () => commit(blankGrid(width.value, height.value), [])
const clearPaths = () => commit(picture.value, [])

// ---------------------------------------------------------------------------
// Pointer input: painting the picture, or drawing paths
// ---------------------------------------------------------------------------

let beforePicture = null
let beforePaths = null
let start = null
let last = null
let value = 0

const same = (a, b) => a[0] === b[0] && a[1] === b[1]
const pathIndexAt = cellXY => paths.value.findIndex(path => path.some(c => same(c, cellXY)))

// Removes one cell from path k; pieces of two or more cells stay paths.
function cutOut (k, cellXY) {
  const path = paths.value[k]
  const at = path.findIndex(c => same(c, cellXY))
  const pieces = [path.slice(0, at), path.slice(at + 1)].filter(p => p.length > 1)
  paths.value = [...paths.value.filter((_, i) => i !== k), ...pieces]
}

function startPath (pos, event) {
  const here = [pos.x, pos.y]
  if (!colourAt(here)) return
  const k = pathIndexAt(here)
  if (event.button === 2) {
    if (k !== -1) paths.value = paths.value.filter((_, i) => i !== k)
    return
  }
  if (k === -1) {
    drawing.value = [here]
    return
  }
  // A path's end continues it; a cell in the middle cuts it there.
  const path = paths.value[k]
  const at = path.findIndex(c => same(c, here))
  const rest = path.slice(at + 1)
  const cells = at === 0 ? [...path].reverse() : path.slice(0, at + 1)
  paths.value = [...paths.value.filter((_, i) => i !== k), ...(at > 0 && rest.length > 1 ? [rest] : [])]
  drawing.value = cells.map(c => [...c])
}

function extendPath (pos) {
  const cells = drawing.value
  if (!cells) return
  const target = [pos.x, pos.y]
  const back = cells.findIndex(c => same(c, target))
  if (back !== -1) {
    drawing.value = cells.slice(0, back + 1)
    return
  }
  const colour = colourAt(cells[0])
  // Fast moves skip cells: walk there one neighbour at a time.
  for (let guard = 0; guard < width.value + height.value; guard++) {
    const [lx, ly] = cells[cells.length - 1]
    if (lx === pos.x && ly === pos.y) break
    const dx = pos.x - lx
    const dy = pos.y - ly
    const next = Math.abs(dx) >= Math.abs(dy) ? [lx + Math.sign(dx), ly] : [lx, ly + Math.sign(dy)]
    if (colourAt(next) !== colour || cells.some(c => same(c, next))) break
    // Drawing over another path cuts that path there.
    const k = pathIndexAt(next)
    if (k !== -1) cutOut(k, next)
    cells.push(next)
  }
  drawing.value = [...cells]
}

const pointer = useGridPointer({
  cellSize: cell,
  width,
  height,
  enabled: () => !playing.value,
  onStart (pos, event) {
    beforePicture = picture.value
    beforePaths = paths.value
    start = pos
    last = pos
    if (tool.value === 'path') {
      startPath(pos, event)
      return
    }
    value = event.button === 2 ? 0 : selected.value
    picture.value = tool.value === 'fill'
      ? floodFill(beforePicture, pos.x, pos.y, value)
      : paint(beforePicture, [pos], value)
  },
  onMove (pos) {
    hover.value = pos
    if (tool.value === 'path') {
      extendPath(pos)
    } else if (tool.value === 'pen') {
      picture.value = paint(picture.value, lineCells(last, pos), value)
    } else if (tool.value === 'line') {
      picture.value = paint(beforePicture, lineCells(start, pos), value)
    } else if (tool.value === 'rect') {
      picture.value = paint(beforePicture, rectCells(start, pos), value)
    }
    last = pos
  },
  onEnd () {
    const nextPicture = picture.value
    let nextPaths = paths.value
    if (drawing.value && drawing.value.length > 1) nextPaths = [...nextPaths, drawing.value]
    drawing.value = null
    picture.value = beforePicture
    paths.value = beforePaths
    commit(nextPicture, nextPaths)
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
    commit(resize(picture.value, w, h), mapPaths(paths.value, pathTransforms.resize(width.value, height.value, w, h)))
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
}
function removeFill (i) {
  fills.value = fills.value.filter((_, j) => j !== i)
  if (selected.value > fills.value.length) selected.value = fills.value.length
  commit(removeColour(picture.value, i + 1), paths.value, { force: true })
}

// ---------------------------------------------------------------------------
// Image import
// ---------------------------------------------------------------------------

const fileInput = ref(null)
const importOptions = ref({ width: 20, colours: 2 })
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
    commit(imported, [], { force: true })
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
let playPicture = null
// The board sends the coloured grid; here it must equal the picture.
const checkTestAnswer = async answer => JSON.stringify(answer) === playPicture

function togglePlay () {
  if (playing.value) { playing.value = false; return }
  try { localStorage.removeItem(`logivilia:linelog:${PLAY_ID}`) } catch { /* ignore */ }
  playPicture = JSON.stringify(picture.value)
  playPuzzle.value = {
    id: PLAY_ID, name: name.value, width: width.value, height: height.value,
    colors: [...fills.value, background.value], ...informationOf(picture.value, paths.value)
  }
  playSolved.value = false
  playing.value = true
  nextTick(() => playCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// ---------------------------------------------------------------------------
// Draft and saving
// ---------------------------------------------------------------------------

// On the server for logged-in creators, else in localStorage (engine/useDraft.js).
const draft = useDraft({
  type: 'linelog',
  storageKey: DRAFT_KEY,
  editId,
  content: () => ({
    name: name.value, fills: fills.value, background: background.value, picture: picture.value, paths: paths.value
  }),
  isValid: d => !!d && Array.isArray(d.picture) && d.picture.length > 0 && Array.isArray(d.fills)
})
const draftStatus = draft.status
const saveDraft = draft.save
watch(name, saveDraft)

const saving = ref(false)
const saveError = ref('')
const saveBlocker = computed(() => {
  if (!name.value) return t('editor.needName')
  if (!paths.value.length) return t('linelogEditor.needPaths')
  if (analysis.value.status !== 'unique') return t('editor.needUnique')
  return ''
})
const canSave = computed(() => store.isUserLoggedIn && store.user?.emailVerified !== false && !saveBlocker.value)

async function save () {
  saving.value = true
  saveError.value = ''
  const puzzle = {
    type: 'linelog',
    name: name.value,
    difficulty: difficulty.value,
    width: width.value,
    height: height.value,
    numColor: fills.value.length,
    colors: [...fills.value, background.value],
    information: informationOf(picture.value, paths.value).information,
    solution: picture.value
  }
  try {
    const { data } = editId.value
      ? await PuzzleService.put({ ...puzzle, id: editId.value })
      : await PuzzleService.post({
        ...puzzle, ...draft.publishFields(), date: new Date().toISOString().slice(0, 10), author: store.user?.username
      })
    if (!editId.value) await draft.published()
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
  zoom.setCellSize(Math.min(Math.max(Math.floor(available / width.value), 14), 36))
}

function onKey (event) {
  if (event.target.closest?.('input, textarea, select, [contenteditable]')) return
  const ctrl = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()
  if (ctrl && key === 'z') {
    event.preventDefault()
    event.shiftKey ? redo() : undo()
  } else if (ctrl && key === 'y') {
    event.preventDefault()
    redo()
  } else if (!ctrl && /^[0-9]$/.test(key) && Number(key) <= fills.value.length) {
    selected.value = Number(key)
    if (tool.value === 'path') tool.value = 'pen'
  } else if (!ctrl && { w: 1, p: 1, l: 1, r: 1, f: 1 }[key]) {
    tool.value = { w: 'path', p: 'pen', l: 'line', r: 'rect', f: 'fill' }[key]
  }
}

async function load () {
  if (editId.value) {
    try {
      const { data } = await PuzzleService.source(editId.value)
      if (data.type !== 'linelog') throw new Error('not a linelog')
      // Published puzzles are locked for their author (only Admins edit them).
      if (data.status === 'published' && !isAdmin.value) { loadError.value = t('editor.locked'); return }
      const w = Number(data.width)
      const h = Number(data.height)
      name.value = data.name || ''
      difficulty.value = Number(data.difficulty) || 2
      difficultyTouched = true
      fills.value = data.colors.slice(0, -1)
      background.value = data.colors[data.colors.length - 1]
      picture.value = data.solution.slice(0, h).map(row => row.slice(0, w).map(Number))
      const information = data.information.slice(0, h).map(row => row.slice(0, w).map(Number))
      // The paths are not stored; find the ones that draw this picture.
      const layout = await ask({ kind: 'layout', picture: picture.value, information })
      paths.value = layout || []
      if (!layout) generateNote.value = t('linelogEditor.layoutNotFound')
    } catch (err) {
      loadError.value = err.response ? apiErrorMessage(err) : t('editor.cannotEdit')
      return
    }
  } else {
    const saved = await draft.load()
    if (saved) {
      name.value = saved.name || ''
      fills.value = saved.fills.length ? saved.fills : ['#000000']
      background.value = saved.background || '#ffffff'
      picture.value = saved.picture
      paths.value = cleanPaths(saved.picture, Array.isArray(saved.paths) ? saved.paths : [])
    }
    draft.ready()
  }
  syncSizeInput()
  history.reset(snapshot())
  scheduleAnalysis()
  await nextTick()
  fitToScreen()
}

onMounted(() => {
  worker = new Worker(new URL('./editorWorker.js', import.meta.url), { type: 'module' })
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
@import '../engine/editor.scss';

.picture { opacity: 0.4; pointer-events: none; }

.path {
  pointer-events: none;

  path {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .path-outline { stroke: rgba(0, 0, 0, 0.3); }
  &.conflict .path-outline { stroke: #dc2626; stroke-dasharray: 5 3; }
}

.number {
  pointer-events: none;

  circle { stroke: #111827; stroke-width: 1.5; }

  text {
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: middle;
  }
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.stats { margin-top: 6px; }
</style>
