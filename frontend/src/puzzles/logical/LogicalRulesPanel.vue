<template>
  <section class="rules-panel">
    <button class="panel-toggle" :aria-expanded="open" @click="toggle">
      <ion-icon :name="open ? 'chevron-down-outline' : 'chevron-forward-outline'"></ion-icon>
      {{ t('rulesPanel.title') }}
    </button>

    <div v-if="open" class="panel-body">
      <p v-if="state === 'loading'" class="muted">{{ t('rulesPanel.loading') }}</p>
      <p v-else-if="state === 'failed'" class="muted">{{ t('rulesPanel.failed') }}</p>
      <p v-else-if="!rules.length" class="muted">{{ t('rulesPanel.none') }}</p>
      <template v-else>
        <p v-if="orderedList" class="muted">{{ t('rulesPanel.ordered', { list: orderedList }) }}</p>

        <p v-if="covered < data.clues.length" class="muted">
          {{ t('rulesPanel.partial', { done: covered, total: data.clues.length }) }}
        </p>
        <p v-else class="status-line" :class="statusClass" :data-analysis="analysis.status">
          <ion-icon :name="statusIcon"></ion-icon>
          <span>
            {{ t(`logicalEditor.analysis.${analysis.status}`) }}
            <template v-if="analysis.status === 'unique'">{{ t(`logicalEditor.analysis.technique.${analysis.technique}`) }}</template>
          </span>
        </p>
        <table v-if="analysis.status === 'ambiguous'" class="other-solution">
          <tbody>
            <tr v-for="(row, r) in analysis.other" :key="r">
              <td v-for="(cell, c) in row" :key="c" :class="{ differs: cell !== data.solution[r]?.[c] }">{{ cell }}</td>
            </tr>
          </tbody>
        </table>

        <ol class="clues">
          <li v-for="(clue, i) in data.clues" :key="i">
            <p class="clue">{{ clue }}</p>
            <ul v-if="rulesOf(i).length" class="rules">
              <li v-for="(rule, k) in rulesOf(i)" :key="k">{{ describeRule(rule, data.attributes, t) }}</li>
            </ul>
            <p v-else class="no-rule">{{ t('rulesPanel.noRule') }}</p>
          </li>
        </ol>
      </template>
    </div>
  </section>
</template>

<script setup>
// Admin view of a Logikrätsel's formal rules (data.rules, not sent to
// players): every clue with its rules as sentences, and whether they lead to
// exactly one solution (solver in a Web Worker, as in the editor). Loads the
// puzzle's source only when opened.

import { ref, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import PuzzleService from '@/services/PuzzleService'
import { describeRule } from './describeRule'

const props = defineProps({
  puzzleId: { type: [Number, String], required: true }
})

const { t } = useI18n()
const open = ref(false)
const state = ref('idle')
const data = ref(null)
const result = ref(null)
let worker = null

const rules = computed(() => (Array.isArray(data.value?.rules) ? data.value.rules : []))
const rulesOf = i => rules.value.filter(rule => rule.clue === i)
const covered = computed(() => data.value.clues.filter((_, i) => rulesOf(i).length).length)
const orderedList = computed(() => data.value.attributes.filter(a => a.ordered).map(a => a.name.trim()).join(', '))

const analysis = computed(() => {
  if (!result.value) return { status: 'checking' }
  const { solutions, complete, technique, error } = result.value
  if (error || (!complete && solutions.length < 2)) return { status: 'tooComplex' }
  if (!solutions.length) return { status: 'contradiction' }
  if (solutions.length > 1) {
    const own = JSON.stringify(data.value.solution)
    return { status: 'ambiguous', other: solutions.find(s => JSON.stringify(s) !== own) || solutions[1] }
  }
  return { status: 'unique', technique }
})
const statusClass = computed(() => (analysis.value.status === 'unique' ? 'ok' : analysis.value.status === 'checking' ? '' : 'bad'))
const statusIcon = computed(() => (analysis.value.status === 'unique'
  ? 'checkmark-circle'
  : analysis.value.status === 'checking' ? 'hourglass-outline' : 'alert-circle'))

async function toggle () {
  open.value = !open.value
  if (!open.value || state.value !== 'idle') return
  state.value = 'loading'
  try {
    data.value = (await PuzzleService.source(props.puzzleId)).data
    state.value = 'ready'
  } catch {
    state.value = 'failed'
    return
  }
  if (rules.value.length && covered.value === data.value.clues.length) {
    worker = new Worker(new URL('./solverWorker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data: message }) => {
      result.value = message.result || { solutions: [], complete: false, error: message.error }
    }
    worker.postMessage({ id: 1, puzzle: JSON.parse(JSON.stringify({ attributes: data.value.attributes, rules: rules.value })) })
  }
}

onBeforeUnmount(() => worker?.terminate())
</script>

<style lang="scss" scoped>
.rules-panel {
  margin: 16px 0;
  padding: 10px 14px;
  border: 1px dashed #c7cdd6;
  border-radius: 8px;
  background: #fafbfc;
  text-align: left;
}

.panel-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: auto;
  height: auto;
  text-align: left;
  border: none;
  background: none;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  padding: 0;
}

.panel-body { margin-top: 10px; }

.muted { font-size: 13px; color: #6b7280; margin: 0 0 8px; }

.status-line {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 14px;
  margin: 0 0 8px;

  ion-icon { font-size: 20px; flex-shrink: 0; color: #9ca3af; }
  &.ok ion-icon { color: #16a34a; }
  &.bad ion-icon { color: #dc2626; }
}

.clues {
  margin: 8px 0 0;
  padding-left: 22px;
  font-size: 14px;

  > li { margin-bottom: 10px; }
}

.clue { margin: 0 0 3px; color: #111827; width: auto; max-width: 100%; }

.rules-panel, .clues, .clues li, .rules li { box-sizing: border-box; max-width: 100%; overflow-wrap: anywhere; }

.rules {
  margin: 0;
  padding-left: 16px;
  list-style: '→ ';
  color: #1d4ed8;
  font-size: 13px;
}

.no-rule { margin: 0; font-size: 13px; color: #b45309; }

.other-solution {
  border-collapse: collapse;
  font-size: 12px;
  margin-bottom: 8px;

  td { border: 1px solid #e5e7eb; padding: 2px 5px; }
  td.differs { background: #fee2e2; color: #991b1b; font-weight: 600; }
}
</style>
