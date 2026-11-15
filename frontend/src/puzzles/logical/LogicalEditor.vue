<template>
  <div class="editor-page">
    <h1 class="page-title">{{ editId ? $t('logicalEditor.titleEdit') : $t('logicalEditor.titleCreate') }}</h1>
    <div v-if="loadError" class="notification is-danger">{{ loadError }}</div>

    <div v-else class="editor-layout">
      <div class="main">
        <!-- Story -->
        <section class="card">
          <h2>{{ $t('logicalEditor.story') }}</h2>
          <label class="field-label">{{ $t('logicalEditor.description') }}
            <textarea v-model="description" class="input text" rows="4" maxlength="3000"
                      :placeholder="$t('logicalEditor.descriptionPlaceholder')"></textarea>
          </label>
          <label class="field-label">{{ $t('logicalEditor.question') }}
            <textarea v-model="question" class="input text" rows="2" maxlength="500"
                      :placeholder="$t('logicalEditor.questionPlaceholder')"></textarea>
          </label>
        </section>

        <!-- Categories and solution -->
        <section class="card">
          <h2>{{ $t('logicalEditor.grid') }}</h2>
          <p class="muted">{{ $t('logicalEditor.gridHelp') }}</p>
          <div class="table-scroll">
            <table class="solution-grid">
              <thead>
                <tr>
                  <th class="row-num"></th>
                  <th v-for="(category, c) in categories" :key="category.id">
                    <div class="cat-head">
                      <input v-model="category.name" class="input cat-input" maxlength="40"
                             :class="{ invalid: duplicateCategory(c) }"
                             :placeholder="$t('logicalEditor.category', { n: c + 1 })"
                             :aria-label="$t('logicalEditor.category', { n: c + 1 })">
                      <button v-if="categories.length > MIN_CATEGORIES" class="tool small"
                              :title="$t('logicalEditor.removeCategory')" @click="removeCategory(c)">
                        <ion-icon name="close-outline"></ion-icon>
                      </button>
                    </div>
                  </th>
                  <th class="add-col">
                    <button v-if="categories.length < MAX_CATEGORIES" class="tool"
                            :title="$t('logicalEditor.addCategory')" @click="addCategory">
                      <ion-icon name="add-outline"></ion-icon>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, r) in rows" :key="r">
                  <td class="row-num">{{ r + 1 }}</td>
                  <td v-for="(category, c) in categories" :key="category.id">
                    <input v-model="row[c]" class="input" maxlength="40" :data-cell="`${r}-${c}`"
                           :class="{ invalid: duplicateValue(r, c) }"
                           :title="duplicateValue(r, c) ? $t('logicalEditor.duplicate') : null"
                           :placeholder="$t('logicalEditor.valuePlaceholder')"
                           @keydown.enter.prevent="nextCell(r, c)">
                  </td>
                  <td class="add-col">
                    <button v-if="rows.length > MIN_ROWS" class="tool small" :title="$t('logicalEditor.removeRow')"
                            @click="removeRow(r)">
                      <ion-icon name="close-outline"></ion-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button v-if="rows.length < MAX_ROWS" class="button is-small" @click="addRow">+ {{ $t('logicalEditor.addRow') }}</button>
        </section>

        <!-- Clues -->
        <section class="card">
          <h2>{{ $t('logicalEditor.clues') }}</h2>
          <p class="muted">{{ $t('logicalEditor.cluesHelp') }}</p>
          <draggable v-model="clues" item-key="id" handle=".drag" tag="ol" class="clue-list" :animation="150">
            <template #item="{ element, index }">
              <li class="clue-row">
                <span class="drag" :title="$t('logicalEditor.dragClue')"><ion-icon name="reorder-two-outline"></ion-icon></span>
                <span class="clue-num">{{ index + 1 }}.</span>
                <textarea v-model="element.text" class="input clue-text" rows="1" maxlength="400"
                          :data-clue="element.id" :class="{ invalid: editingClue !== element.id && clueTooShort(element) }"
                          :placeholder="index === 0 ? $t('logicalEditor.cluePlaceholder') : ''"
                          @focus="lastClue = editingClue = element.id" @blur="editingClue = null"
                          @keydown.enter.exact.prevent="addClue(index + 1)"
                          @keydown.backspace="removeIfEmpty($event, index)"></textarea>
                <button class="tool small" :title="$t('logicalEditor.removeClue')" @click="removeClue(index)">
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </li>
            </template>
          </draggable>
          <button class="button is-small" @click="addClue(clues.length)">+ {{ $t('logicalEditor.addClue') }}</button>

          <div v-if="valueChips.length" class="chips">
            <span class="muted">{{ $t('logicalEditor.insertValue') }}</span>
            <div v-for="group in valueChips" :key="group.id" class="chip-group">
              <span class="chip-label">{{ group.name }}</span>
              <button v-for="value in group.values" :key="value" class="chip" @mousedown.prevent="insertValue(value)">{{ value }}</button>
            </div>
          </div>
        </section>
      </div>

      <!-- Side panel -->
      <aside class="side">
        <section class="card status-card" :class="{ ok: !saveBlocker, bad: !!saveBlocker }">
          <h2>{{ $t('editor.check') }}</h2>
          <ul class="checklist">
            <li v-for="item in checks" :key="item.key" :class="{ done: item.ok }">
              <ion-icon :name="item.ok ? 'checkmark-circle' : 'ellipse-outline'"></ion-icon>
              <span>{{ $t(`logicalEditor.checks.${item.key}`) }}</span>
            </li>
          </ul>
          <p class="muted">{{ $t('logicalEditor.uniqueNote') }}</p>
        </section>

        <section class="card">
          <h2>{{ $t('editor.puzzle') }}</h2>
          <label class="field-label">{{ $t('overview.name') }}
            <input v-model="name" class="input" maxlength="80" :placeholder="$t('logicalEditor.namePlaceholder')">
          </label>
          <label class="field-label">{{ $t('overview.difficulty') }}
            <select v-model.number="difficulty" class="input">
              <option v-for="d in 5" :key="d" :value="d">{{ d }}</option>
            </select>
          </label>
        </section>

        <section class="card actions">
          <button class="button" :disabled="!playable" @click="togglePlay">{{ playing ? $t('editor.stopTest') : $t('editor.test') }}</button>
          <button class="button is-primary" :disabled="!canSave || saving" @click="save">
            {{ saving ? $t('editor.saving') : editId ? $t('editor.saveChanges') : $t('editor.publish') }}
          </button>
          <p v-if="!store.isUserLoggedIn" class="muted">{{ $t('editor.loginToPublish') }}</p>
          <p v-else-if="store.user && store.user.emailVerified === false" class="muted">{{ $t('editor.verifyToPublish') }}</p>
          <p v-else-if="saveBlocker" class="muted">{{ $t('logicalEditor.needFix') }}</p>
          <p v-if="saveError" class="error-text">{{ saveError }}</p>
        </section>
      </aside>
    </div>

    <section v-if="playing" ref="playCard" class="card play-card">
      <h2>{{ $t('editor.testTitle') }}</h2>
      <p class="muted">{{ $t('logicalEditor.testText') }}</p>
      <LogicalBoard :puzzle="playPuzzle" :submit="testSubmit" @solved="playSolved = true" />
      <p v-if="playSolved" class="success-text">{{ $t('editor.testSolved') }}</p>
    </section>
  </div>
</template>

<script setup>
// Logical (logic grid) editor: story, categories with the solution as a
// table (one row = values that belong together), and free-text clues. New
// puzzles are drafted in localStorage until published.
//
// Players see every category's values sorted, not in the author's row order,
// so the published value lists do not give the solution away.

import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import { useMainStore } from '@/store/store'
import { apiErrorMessage } from '@/i18n'
import PuzzleService from '@/services/PuzzleService'
import logicalPlugin from '@shared/puzzles/logical.js'
import LogicalBoard from './LogicalBoard.vue'

const MIN_CATEGORIES = 2
const MAX_CATEGORIES = 6
const MIN_ROWS = 2
const MAX_ROWS = 10
const MIN_TEXT = 20
const MIN_CLUE = 10
const DRAFT_KEY = 'logivilia:logical-draft'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const { t } = useI18n()
const editId = computed(() => (route.params.id ? Number(route.params.id) : null))

let nextId = 1
const newCategory = (name = '') => ({ id: nextId++, name })
const newClue = (text = '') => ({ id: nextId++, text })

const name = ref('')
const difficulty = ref(2)
const description = ref('')
const question = ref('')
const categories = ref([newCategory(), newCategory(), newCategory()])
const rows = ref(Array.from({ length: 3 }, () => ['', '', '']))
const clues = ref([newClue()])
const loadError = ref('')

// ---------------------------------------------------------------------------
// Categories and values
// ---------------------------------------------------------------------------

const norm = s => String(s ?? '').trim().toLowerCase()

function duplicateCategory (c) {
  const own = norm(categories.value[c].name)
  return own !== '' && categories.value.some((cat, i) => i !== c && norm(cat.name) === own)
}

function duplicateValue (r, c) {
  const own = norm(rows.value[r][c])
  return own !== '' && rows.value.some((row, i) => i !== r && norm(row[c]) === own)
}

function addCategory () {
  categories.value.push(newCategory())
  rows.value.forEach(row => row.push(''))
  nextTick(() => focusCell(0, categories.value.length - 1, true))
}

function removeCategory (c) {
  const used = categories.value[c].name.trim() || rows.value.some(row => row[c].trim())
  const label = categories.value[c].name.trim() || t('logicalEditor.category', { n: c + 1 })
  if (used && !window.confirm(t('logicalEditor.confirmRemoveCategory', { name: label }))) return
  categories.value.splice(c, 1)
  rows.value.forEach(row => row.splice(c, 1))
}

function addRow () {
  rows.value.push(categories.value.map(() => ''))
  nextTick(() => focusCell(rows.value.length - 1, 0))
}

function removeRow (r) {
  rows.value.splice(r, 1)
}

function focusCell (r, c, header = false) {
  const el = header
    ? document.querySelectorAll('.cat-input')[c]
    : document.querySelector(`[data-cell="${r}-${c}"]`)
  el?.focus()
}

// Enter moves down the column, like a spreadsheet; past the last row it adds one.
function nextCell (r, c) {
  if (r + 1 < rows.value.length) focusCell(r + 1, c)
  else if (rows.value.length < MAX_ROWS) {
    rows.value.push(categories.value.map(() => ''))
    nextTick(() => focusCell(r + 1, c))
  } else if (c + 1 < categories.value.length) focusCell(0, c + 1)
}

// ---------------------------------------------------------------------------
// Clues
// ---------------------------------------------------------------------------

const lastClue = ref(null)
const editingClue = ref(null)
const clueTooShort = clue => clue.text.trim().length > 0 && clue.text.trim().length < MIN_CLUE

function clueEl (id) {
  return document.querySelector(`[data-clue="${id}"]`)
}

function addClue (index) {
  const clue = newClue()
  clues.value.splice(index, 0, clue)
  nextTick(() => clueEl(clue.id)?.focus())
}

function removeClue (index) {
  clues.value.splice(index, 1)
  if (!clues.value.length) clues.value.push(newClue())
}

// Backspace in an empty clue removes it and jumps to the one above.
function removeIfEmpty (event, index) {
  if (clues.value[index].text !== '' || clues.value.length === 1) return
  event.preventDefault()
  const above = clues.value[Math.max(0, index - 1)]
  clues.value.splice(index, 1)
  nextTick(() => {
    const el = clueEl(above.id)
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
  })
}

// Values to click into the clue being written.
const valueChips = computed(() => categories.value
  .map((cat, c) => ({
    id: cat.id,
    name: cat.name.trim() || t('logicalEditor.category', { n: c + 1 }),
    values: [...new Set(rows.value.map(row => row[c].trim()).filter(Boolean))]
  }))
  .filter(group => group.values.length))

function insertValue (value) {
  let clue = clues.value.find(c => c.id === lastClue.value) || clues.value[clues.value.length - 1]
  const el = clueEl(clue.id)
  const text = clue.text
  const start = el && document.activeElement === el ? el.selectionStart : text.length
  const end = el && document.activeElement === el ? el.selectionEnd : text.length
  const before = text.slice(0, start)
  const pad = before && !/\s$/.test(before) ? ' ' : ''
  clue.text = before + pad + value + text.slice(end)
  const caret = start + pad.length + value.length
  nextTick(() => {
    if (!el) return
    el.focus()
    el.setSelectionRange(caret, caret)
  })
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const checks = computed(() => [
  { key: 'name', ok: name.value.trim() !== '' },
  { key: 'description', ok: description.value.trim().length >= MIN_TEXT },
  { key: 'question', ok: question.value.trim().length >= MIN_TEXT },
  {
    key: 'categories',
    ok: categories.value.every((cat, c) => cat.name.trim() !== '' && !duplicateCategory(c))
  },
  {
    key: 'values',
    ok: rows.value.every((row, r) => row.every((v, c) => v.trim() !== '' && !duplicateValue(r, c)))
  },
  {
    key: 'clues',
    ok: clues.value.some(c => c.text.trim()) &&
      !clues.value.some(clueTooShort)
  }
])

const saveBlocker = computed(() => checks.value.some(item => !item.ok))
// Test play only needs a usable table.
const playable = computed(() => checks.value.filter(i => i.key === 'categories' || i.key === 'values').every(i => i.ok))

// ---------------------------------------------------------------------------
// Puzzle data as stored
// ---------------------------------------------------------------------------

const byText = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

// solution: rows sorted by their first value; attributes: every category's
// values sorted (the first one in the same order as the rows, as the player's
// table expects).
function buildData () {
  const solution = rows.value
    .map(row => row.map(v => v.trim()))
    .sort((a, b) => byText(a[0], b[0]))
  const attributes = categories.value.map((cat, c) => ({
    name: cat.name.trim(),
    values: c === 0 ? solution.map(row => row[0]) : solution.map(row => row[c]).sort(byText)
  }))
  return {
    description: description.value.trim(),
    question: question.value.trim(),
    clues: clues.value.map(c => c.text.trim()).filter(Boolean),
    attributes,
    solution,
    image: ''
  }
}

// ---------------------------------------------------------------------------
// Test play
// ---------------------------------------------------------------------------

const playing = ref(false)
const playSolved = ref(false)
const playPuzzle = ref(null)
const playCard = ref(null)
let playSolution = null

const testSubmit = async answer => logicalPlugin.validate({ solution: playSolution }, answer)

function togglePlay () {
  if (playing.value) { playing.value = false; return }
  const { solution, ...data } = buildData()
  playSolution = solution
  playPuzzle.value = { id: 'editor-preview', name: name.value.trim(), difficulty: difficulty.value, ...data }
  playSolved.value = false
  playing.value = true
  nextTick(() => playCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// ---------------------------------------------------------------------------
// Draft and saving
// ---------------------------------------------------------------------------

function snapshot () {
  return {
    name: name.value,
    difficulty: difficulty.value,
    description: description.value,
    question: question.value,
    categories: categories.value.map(c => c.name),
    rows: rows.value,
    clues: clues.value.map(c => c.text)
  }
}

function saveDraft () {
  if (editId.value) return
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot())) } catch { /* storage unavailable */ }
}
watch([name, difficulty, description, question, categories, rows, clues], saveDraft, { deep: true })

function apply (source) {
  name.value = source.name || ''
  difficulty.value = Number(source.difficulty) || 2
  description.value = source.description || ''
  question.value = source.question || ''
  categories.value = source.categories.map(n => newCategory(n))
  rows.value = source.rows.map(row => categories.value.map((_, c) => String(row[c] ?? '')))
  clues.value = source.clues.length ? source.clues.map(text => newClue(text)) : [newClue()]
}

function loadDraft () {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    if (draft && Array.isArray(draft.categories) && draft.categories.length >= MIN_CATEGORIES &&
        Array.isArray(draft.rows) && draft.rows.length >= MIN_ROWS && Array.isArray(draft.clues)) return draft
  } catch { /* ignore */ }
  return null
}

const saving = ref(false)
const saveError = ref('')
const canSave = computed(() => store.isUserLoggedIn && store.user?.emailVerified !== false && !saveBlocker.value)

async function save () {
  saving.value = true
  saveError.value = ''
  const puzzle = { type: 'logical', name: name.value.trim(), difficulty: difficulty.value, ...buildData() }
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

async function load () {
  if (editId.value) {
    try {
      const { data } = await PuzzleService.source(editId.value)
      if (data.type !== 'logical') throw new Error('not a logical')
      apply({
        ...data,
        categories: data.attributes.map(a => a.name),
        rows: data.solution,
        clues: data.clues || []
      })
    } catch (err) {
      loadError.value = err.response ? apiErrorMessage(err) : t('editor.cannotEdit')
    }
  } else {
    const draft = loadDraft()
    if (draft) apply(draft)
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
@import '../engine/editor.scss';

.main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.input {
  width: 100%;
  box-sizing: border-box;
}

textarea.input {
  height: auto;
  font: inherit;
  line-height: 1.4;
  padding: 6px 9px;
  resize: vertical;
}

.input.invalid {
  border-color: #dc2626;
  background: #fef2f2;
}

.card > .muted { margin-bottom: 10px; }

// Categories table

.table-scroll {
  overflow-x: auto;
  margin-bottom: 8px;
}

.solution-grid {
  border-collapse: separate;
  border-spacing: 6px 4px;
  margin: 0 -6px;
  border: none;

  th, td {
    padding: 0;
    background: none;
    vertical-align: middle;
  }

  th { min-width: 110px; font-weight: normal; }

  .row-num {
    min-width: 0;
    width: 22px;
    text-align: right;
    font-size: 12px;
    color: #9ca3af;
  }

  .add-col { min-width: 0; width: 1%; white-space: nowrap; text-align: left; }

  .input { height: 32px; font-size: 14px; }

  .cat-input {
    font-weight: 600;
    background: #f6f7f9;
  }
}

.cat-head {
  display: flex;
  align-items: center;
  gap: 2px;
}

// Clues

.clue-list {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.clue-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: #fff;

  .drag {
    cursor: grab;
    color: #9ca3af;
    padding-top: 7px;
    font-size: 18px;
    line-height: 1;
  }

  .clue-num {
    min-width: 22px;
    padding-top: 7px;
    font-size: 14px;
    color: #6b7280;
    text-align: right;
  }

  .clue-text {
    flex: 1;
    min-height: 34px;
    field-sizing: content;
  }

  .tool { margin-top: 5px; }
}

.sortable-ghost { opacity: 0.4; }

.chips {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #eef0f3;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.chip-label {
  font-size: 12px;
  color: #6b7280;
  min-width: 90px;
}

.chip {
  border: 1px solid #d6dbe1;
  background: #f6f7f9;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 13px;
  cursor: pointer;

  &:hover { background: #dbe7fe; border-color: #93b4f5; }
}

// Status

.checklist {
  list-style: none;
  padding: 0;
  margin: 0 0 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;

  li {
    display: flex;
    gap: 7px;
    align-items: flex-start;
    font-size: 14px;
    color: #4b5563;
  }

  ion-icon { font-size: 18px; flex-shrink: 0; color: #9ca3af; }
  .done ion-icon { color: #16a34a; }
}
</style>
