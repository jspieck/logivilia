<script setup>
// Logic grid puzzle page body: story (LogicalIntro), clues and categories
// (LogicalCluesPanel), the helper grid (LogicGrid), the notepad (CluePad)
// and the answer table (LogicalSolutionTable).
//
// This component holds the player's state, so it can be saved and restored
// as one (saveState / restoreState, used by LogicalBoard): the grid and its
// undo history, the answers, the crossed-off clues and the notepad. The
// grid geometry and painting rules are in shared/puzzles/logicalGrid.js.

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import Toggle from '@/components/Toggle.vue'
import { useHistory } from '../engine/useHistory'
import LogicalIntro from './LogicalIntro.vue'
import LogicalCluesPanel from './LogicalCluesPanel.vue'
import LogicGrid from './LogicGrid.vue'
import LogicalSolutionTable from './LogicalSolutionTable.vue'
import CluePad from './CluePad.vue'
import { emptyPad } from './cluePad'
import { gridGeometry, emptyGrid, emptyInputs, syncTable, isGrid } from '@shared/puzzles/logicalGrid.js'

const { t } = useI18n()
const props = defineProps({
  logical: { type: Object, required: true },
  solved: { type: Boolean, default: false },
  // Seconds played, shown next to the title (null: no timer, e.g. preview).
  elapsed: { type: Number, default: null }
})

// 'progress': the player changed something worth saving (see saveState).
const emit = defineEmits(['solution-check', 'solution-update', 'progress'])

const tableVisible = ref(true)
const attrInputs = ref({})
const doneClues = ref(new Set())
const grid = ref([])
const history = useHistory()

const attributes = computed(() => props.logical.attributes || [])
const n = computed(() => attributes.value.length)
const m = computed(() => attributes.value[0]?.values.length || 0)
const geo = computed(() => gridGeometry(n.value, m.value))

// --- Relation chips and the clue under the mouse -------------------------
// Relation chips under the clues (logical.relations, the plain formal rules
// the server shares, see shared/puzzles/logical.js publicRelations). Hidden
// until the player turns them on; the choice is remembered.
const RELATIONS_KEY = 'logivilia.logical.relationsOn'
const readShowRelations = () => {
  try { return window.localStorage.getItem(RELATIONS_KEY) === '1' } catch { return false }
}
const showRelations = ref(readShowRelations())
watch(showRelations, (on) => {
  try { window.localStorage.setItem(RELATIONS_KEY, on ? '1' : '0') } catch { /* private mode */ }
})
const focusClue = ref(null)

const relationsByClue = computed(() => {
  const map = new Map()
  for (const relation of props.logical.relations || []) {
    if (!map.has(relation.clue)) map.set(relation.clue, [])
    map.get(relation.clue).push(relation)
  }
  return map
})
const hasRelations = computed(() => relationsByClue.value.size > 0)

// Values of the clue under the mouse, as "attr:value" keys (highlighted in
// the grid and the notepad).
const hotValues = computed(() => {
  const keys = new Set()
  const add = (relation) => {
    if (relation.type === 'anyOf') return relation.rules.forEach(add)
    for (const ref of [relation.a, relation.b, relation.c]) {
      if (ref && Number.isInteger(ref.attr)) keys.add(`${ref.attr}:${ref.value}`)
    }
  }
  if (showRelations.value && focusClue.value !== null) {
    (relationsByClue.value.get(focusClue.value) || []).forEach(add)
  }
  return keys
})

const toggleClue = (i) => {
  const next = new Set(doneClues.value)
  next.has(i) ? next.delete(i) : next.add(i)
  doneClues.value = next
}

// --- Notepad (CluePad): value cards and clues on one free board ----------
const padVisible = ref(true)
const pad = ref(emptyPad())
const clearPad = () => {
  if (!window.confirm(t('logical.padClearConfirm'))) return
  pad.value = emptyPad()
}
const padHelpItems = computed(() => (hasRelations.value
  ? ['values', 'join', 'clues', 'colors', 'notes', 'scratch']
  : ['values', 'join', 'notes', 'scratch']))

// Large view: the notepad fills the window, the clue texts beside it.
const padFull = ref(false)
watch(padFull, (on) => {
  document.body.style.overflow = on ? 'hidden' : ''
  if (on) padVisible.value = true
})
const onPadKey = (event) => {
  if (event.key === 'Escape' && padFull.value) padFull.value = false
}
onMounted(() => window.addEventListener('keydown', onPadKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onPadKey)
  document.body.style.overflow = ''
})

// --- State ---------------------------------------------------------------
const reset = () => {
  grid.value = emptyGrid(geo.value)
  history.reset(grid.value)
  attrInputs.value = emptyInputs(geo.value)
  doneClues.value = new Set()
  pad.value = emptyPad()
}

watch(() => props.logical, (value) => {
  if (value?.attributes?.length) reset()
}, { immediate: true })

watch([grid, attrInputs], () => {
  emit('solution-update', { gridState: grid.value, attrInputs: attrInputs.value })
}, { deep: true })

// A finished stroke in the grid: one undo step, and "yes" marks in the top
// block row fill the answer table.
const onStroke = ({ before, after }) => {
  attrInputs.value = syncTable(before, after, geo.value, attributes.value, attrInputs.value)
  history.push(after)
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
  grid.value = emptyGrid(geo.value)
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
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// --- Saved game ----------------------------------------------------------
// Everything the player built: grid, answer table, crossed-off clues and the
// notepad. LogicalBoard stores it (../engine/progress.js).
const saveState = () => ({
  n: n.value,
  m: m.value,
  grid: [...grid.value],
  attrInputs: { ...attrInputs.value },
  doneClues: [...doneClues.value],
  pad: JSON.parse(JSON.stringify(pad.value))
})

// Restores a saveState() result; false (and nothing changed) if it does not
// fit this puzzle any more, e.g. after the author edited it.
let restoring = false
const restoreState = (saved) => {
  if (!saved || saved.n !== n.value || saved.m !== m.value) return false
  if (!isGrid(saved.grid, geo.value)) return false
  const inputs = {}
  for (const k of Object.keys(attrInputs.value)) {
    const j = Number(k.split('_')[1])
    const value = saved.attrInputs?.[k]
    inputs[k] = value != null && attributes.value[j + 1].values.map(String).includes(String(value)) ? value : null
  }
  const clueCount = (props.logical.clues || []).length
  const done = (Array.isArray(saved.doneClues) ? saved.doneClues : []).filter(i => Number.isInteger(i) && i >= 0 && i < clueCount)
  const savedPad = saved.pad
  const padOk = savedPad && Array.isArray(savedPad.cards) && Array.isArray(savedPad.clues) && Number.isInteger(savedPad.nextId)
  restoring = true
  grid.value = [...saved.grid]
  history.reset(grid.value)
  attrInputs.value = inputs
  doneClues.value = new Set(done)
  pad.value = padOk ? savedPad : emptyPad()
  return true
}

watch([grid, attrInputs, doneClues, pad], () => {
  if (restoring) {
    restoring = false
    return
  }
  emit('progress')
}, { deep: true })

// --- Answer --------------------------------------------------------------
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

defineExpose({ checkSolution, tableVisible, attrInputs, saveState, restoreState })
</script>

<template>
  <div class="logical" v-if="logical">
    <LogicalIntro :logical="logical" :elapsed="elapsed" />

    <LogicalCluesPanel
      v-model:show-relations="showRelations"
      :clues="logical.clues || []"
      :attributes="attributes"
      :done-clues="doneClues"
      :relations-by-clue="relationsByClue"
      @toggle-clue="toggleClue"
      @focus-clue="focusClue = $event"
    />

    <section class="grid-section">
      <div class="section-head">
        <h3>{{ t('logical.grid') }}</h3>
        <label class="toggle-container">
          <span>{{ t('logical.showTable') }}</span>
          <Toggle v-model="tableVisible" />
        </label>
      </div>
      <!-- Kept alive while hidden: tool and auto-cross choice stay. -->
      <KeepAlive>
        <LogicGrid
          v-if="tableVisible"
          v-model:grid="grid"
          :attributes="attributes"
          :solved="solved"
          :hot-values="hotValues"
          :coloured="hasRelations"
          :can-undo="history.canUndo.value"
          :can-redo="history.canRedo.value"
          @stroke="onStroke"
          @undo="undo"
          @redo="redo"
          @restart="restart"
        />
      </KeepAlive>
    </section>

    <section class="pad-section" :class="{ full: padFull }" :role="padFull ? 'dialog' : null" :aria-modal="padFull ? 'true' : null" :aria-label="padFull ? t('logical.pad') : null">
      <div class="section-head">
        <h3>{{ t('logical.pad') }}</h3>
        <div class="pad-head-tools">
          <button v-if="padVisible && !solved && (pad.cards.length || pad.clues.length)" class="tool" :title="t('logical.padClear')" :aria-label="t('logical.padClear')" @click="clearPad">
            <ion-icon name="refresh-outline"></ion-icon>
          </button>
          <button
            class="tool"
            :title="t(padFull ? 'logical.padFullscreenClose' : 'logical.padFullscreen')"
            :aria-label="t(padFull ? 'logical.padFullscreenClose' : 'logical.padFullscreen')"
            :aria-pressed="padFull"
            @click="padFull = !padFull"
          >
            <ion-icon :name="padFull ? 'contract-outline' : 'expand-outline'"></ion-icon>
          </button>
          <label v-if="!padFull" class="toggle-container">
            <span>{{ t('logical.padShow') }}</span>
            <Toggle v-model="padVisible" />
          </label>
        </div>
      </div>
      <template v-if="padVisible">
        <details v-if="!solved" class="pad-help">
          <summary>{{ t('logical.padHelpTitle') }}</summary>
          <ul>
            <li v-for="item in padHelpItems" :key="item">{{ t(`logical.padHelpList.${item}`) }}</li>
          </ul>
        </details>
        <CluePad
          v-model="pad"
          :attributes="attributes"
          :relations="logical.relations || []"
          :clues="logical.clues || []"
          :hot="hotValues"
          :disabled="solved"
          :wide="padFull"
        />
      </template>
    </section>

    <LogicalSolutionTable v-model="attrInputs" :attributes="attributes" :solved="solved" />
  </div>
</template>

<style lang="scss" scoped>
@import '../engine/board.scss';
@import './logical.scss';

.logical {
  --accent: #2563eb;
  padding-top: 4px;
}

.grid-section {
  margin-bottom: 28px;
}

.pad-section {
  margin-bottom: 28px;

  .pad-head-tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pad-help {
    margin: 0 0 12px;
    font-size: 13.5px;
    color: #55526a;

    summary {
      cursor: pointer;
      font-weight: 700;
      color: #4f46e5;
      width: fit-content;
    }

    ul {
      margin: 8px 0 0;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      line-height: 1.45;
    }
  }

  // Large view: over the whole page.
  &.full {
    position: fixed;
    inset: 0;
    z-index: 1000;
    margin: 0;
    padding: 14px 20px 24px;
    overflow-y: auto;
    background: #fff;

    .section-head {
      position: sticky;
      top: 0;
      z-index: 6;
      margin: -14px -20px 10px;
      padding: 12px 20px 8px;
      background: #fff;
      border-bottom: 1px solid #eeebf5;
    }
  }
}

@media (max-width: 600px) {
  .pad-section.full { padding: 10px 12px 20px; }
  .pad-section.full .section-head { margin: -10px -12px 10px; padding: 10px 12px 8px; }
}
</style>
