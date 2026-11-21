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
                    <select v-model="category.ordered" class="input order-select" :data-order="c"
                            :class="{ invalid: orderInvalid(c) }"
                            :title="orderInvalid(c) ? $t('logicalEditor.orderInvalid') : $t('logicalEditor.orderHelp')">
                      <option value="">{{ $t('logicalEditor.order.none') }}</option>
                      <option value="list" :disabled="listTaken(c)">{{ $t('logicalEditor.order.list') }}</option>
                      <option value="numeric">{{ $t('logicalEditor.order.numeric') }}</option>
                      <option value="alpha">{{ $t('logicalEditor.order.alpha') }}</option>
                    </select>
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
          <p class="muted">{{ $t('logicalEditor.cluesHelp') }} {{ $t('logicalEditor.rulesHelp') }}</p>
          <draggable v-model="clues" item-key="id" handle=".drag" tag="ol" class="clue-list" :animation="150">
            <template #item="{ element, index }">
              <li class="clue-row">
                <span class="drag" :title="$t('logicalEditor.dragClue')"><ion-icon name="reorder-two-outline"></ion-icon></span>
                <span class="clue-num">{{ index + 1 }}.</span>
                <div class="clue-body">
                  <textarea v-model="element.text" class="input clue-text" rows="1" maxlength="400"
                            :data-clue="element.id" :class="{ invalid: editingClue !== element.id && clueTooShort(element) }"
                            :placeholder="index === 0 ? $t('logicalEditor.cluePlaceholder') : ''"
                            @focus="lastClue = editingClue = element.id" @blur="editingClue = null"
                            @keydown.enter.exact.prevent="addClue(index + 1)"
                            @keydown.backspace="removeIfEmpty($event, index)"></textarea>
                  <div v-for="rule in element.rules" :key="rule.id" class="rule-row" :data-rule="rule.id"
                       :class="formal.states[rule.id]"
                       :title="formal.states[rule.id] === 'broken' ? $t('logicalEditor.ruleBroken')
                         : formal.states[rule.id] === 'incomplete' ? $t('logicalEditor.ruleIncomplete') : null">
                    <!-- Groups and sums come from stored data; shown as text. -->
                    <span v-if="rule.stored" class="rule-text" :title="$t('logicalEditor.groupRule')">
                      {{ describeRule(rule.stored, formal.attributes, t) }}
                    </span>
                    <template v-else>
                    <select v-if="rule.rel !== 'note'" v-model="rule.a" class="input rule-value" :aria-label="$t('logicalEditor.pickValue')">
                      <option value="">{{ $t('logicalEditor.pickValue') }}</option>
                      <optgroup v-for="group in valueChips" :key="group.id" :label="group.name">
                        <option v-for="value in group.values" :key="value" :value="`${group.id}|${value}`">{{ value }}</option>
                      </optgroup>
                    </select>
                    <select v-model="rule.rel" class="input rule-rel" :aria-label="$t('logicalEditor.relation')">
                      <option v-for="r in relationOptions" :key="r.key" :value="r.key">{{ r.label }}</option>
                    </select>
                    <template v-if="rule.rel.startsWith('differsBy') || rule.rel.startsWith('times')">
                      <input v-model.number="rule.offset" type="number" step="any" class="input rule-offset"
                             :aria-label="rule.rel.startsWith('times') ? $t('logicalEditor.factor') : $t('logicalEditor.offset')">
                      <label v-if="rule.rel.startsWith('differsBy')" class="rule-abs" :title="$t('logicalEditor.absHelp')">
                        <input v-model="rule.abs" type="checkbox"> ±
                      </label>
                    </template>
                    <select v-if="rule.rel !== 'note'" v-model="rule.b" class="input rule-value" :aria-label="$t('logicalEditor.pickValue')">
                      <option value="">{{ $t('logicalEditor.pickValue') }}</option>
                      <optgroup v-for="group in valueChips" :key="group.id" :label="group.name">
                        <option v-for="value in group.values" :key="value" :value="`${group.id}|${value}`">{{ value }}</option>
                      </optgroup>
                    </select>
                    <template v-if="rule.rel === 'eitherOr' || rule.rel.startsWith('sum')">
                      <span class="rule-or">{{ rule.rel === 'eitherOr' ? $t('logicalEditor.or') : '=' }}</span>
                      <select v-model="rule.c" class="input rule-value" :aria-label="$t('logicalEditor.pickValue')">
                        <option value="">{{ $t('logicalEditor.pickValue') }}</option>
                        <optgroup v-for="group in valueChips" :key="group.id" :label="group.name">
                          <option v-for="value in group.values" :key="value" :value="`${group.id}|${value}`">{{ value }}</option>
                        </optgroup>
                      </select>
                    </template>
                    </template>
                    <button class="tool small" :title="$t('logicalEditor.removeRule')" @click="removeRule(element, rule)">
                      <ion-icon name="close-outline"></ion-icon>
                    </button>
                  </div>
                  <button class="add-rule" @click="addRule(element)">+ {{ $t('logicalEditor.addRule') }}</button>
                </div>
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
          <div class="analysis" :data-analysis="analysis.status">
            <p v-if="analysis.status === 'none'" class="muted">{{ $t('logicalEditor.uniqueNote') }}</p>
            <p v-else-if="analysis.status === 'partial'" class="muted">
              {{ $t('logicalEditor.analysis.partial', { done: formal.coveredClues, total: formal.clueCount }) }}
            </p>
            <p v-else-if="analysis.status === 'blocked'" class="muted">{{ $t('logicalEditor.analysis.blocked') }}</p>
            <template v-else>
              <p class="status-line" :class="analysis.status === 'unique' ? 'ok' : analysis.status === 'checking' ? '' : 'bad'">
                <ion-icon :name="analysis.status === 'unique' ? 'checkmark-circle' : analysis.status === 'checking' ? 'hourglass-outline' : 'alert-circle'"></ion-icon>
                <span>{{ $t(`logicalEditor.analysis.${analysis.status}`) }}</span>
              </p>
              <p v-if="analysis.status === 'unique'" class="muted">{{ $t(`logicalEditor.analysis.technique.${analysis.technique}`) }}</p>
              <div v-if="analysis.status === 'ambiguous'" class="table-scroll">
                <table class="other-solution">
                  <thead>
                    <tr><th v-for="(cat, c) in formal.attributes" :key="c">{{ cat.name }}</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, r) in analysis.other" :key="r">
                      <td v-for="(cell, c) in row" :key="c" :class="{ differs: cell !== formal.solution[r][c] }">{{ cell }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
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

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import { useMainStore } from '@/store/store'
import { apiErrorMessage } from '@/i18n'
import PuzzleService from '@/services/PuzzleService'
import logicalPlugin from '@shared/puzzles/logical.js'
import { ruleProblem, brokenRules, orderKeys, orderMode, ORDER_TYPES } from '@shared/puzzles/logicalSolver.js'
import { describeRule } from './describeRule'
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
const newCategory = (name = '', ordered = '') => ({ id: nextId++, name, ordered })
const newClue = (text = '') => ({ id: nextId++, text, rules: [] })
// A clue's formal rule as edited: values as "categoryId|value", rel as
// "same" | "notSame" | "eitherOr" | "<orderType>:<categoryId>".
// A group rule (anyOf, exists, ...) or a sum loaded from stored data keeps
// its stored form in `stored` and is shown as text.
const newRule = (fields = {}) => ({ id: nextId++, a: '', rel: 'same', b: '', c: '', offset: 1, abs: false, stored: null, ...fields })
const KEPT_AS_STORED = ['anyOf', 'allOf', 'exists', 'not']

const name = ref('')
const difficulty = ref(2)
const description = ref('')
const question = ref('')
const image = ref('')
const categories = ref([newCategory(), newCategory(), newCategory()])
const rows = ref(Array.from({ length: 3 }, () => ['', '', '']))
const clues = ref([newClue()])
const loadError = ref('')

// ---------------------------------------------------------------------------
// Categories and values
// ---------------------------------------------------------------------------

const norm = s => String(s ?? '').trim().toLowerCase()
const byText = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

function duplicateCategory (c) {
  const own = norm(categories.value[c].name)
  return own !== '' && categories.value.some((cat, i) => i !== c && norm(cat.name) === own)
}

function duplicateValue (r, c) {
  const own = norm(rows.value[r][c])
  return own !== '' && rows.value.some((row, i) => i !== r && norm(row[c]) === own)
}

// Only one category may follow the row order: two would show their values
// in matching order and give the pairing away.
const listTaken = c => categories.value.some((cat, i) => i !== c && cat.ordered === 'list')

function orderInvalid (c) {
  const cat = categories.value[c]
  if (!cat.ordered) return false
  const values = rows.value.map(row => row[c].trim())
  return values.every(Boolean) && !orderKeys({ values, ordered: cat.ordered })
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
// Rules (formal clues)
// ---------------------------------------------------------------------------

function addRule (clue) {
  const previous = clue.rules[clue.rules.length - 1]
  clue.rules.push(newRule(previous ? { a: previous.a } : {}))
}

function removeRule (clue, rule) {
  clue.rules.splice(clue.rules.indexOf(rule), 1)
}

// Relations: same / not / either-or / no condition, plus the ordered ones
// for every ordered category.
const relationOptions = computed(() => [
  ...['same', 'notSame', 'eitherOr', 'note'].map(key => ({ key, label: t(`logicalEditor.rel.${key}`) })),
  ...categories.value
    .filter(cat => cat.ordered)
    .flatMap((cat, i) => ORDER_TYPES.map(type => ({
      key: `${type}:${cat.id}`,
      label: t(`logicalEditor.rel.${type}`, { cat: cat.name.trim() || t('logicalEditor.category', { n: i + 1 }) })
    })))
])

const catIndex = id => categories.value.findIndex(cat => cat.id === id)

function refOf (key) {
  const bar = String(key || '').indexOf('|')
  if (bar < 0) return null
  const attr = catIndex(Number(key.slice(0, bar)))
  return attr < 0 ? null : { attr, value: key.slice(bar + 1) }
}

const keyOf = ref => (ref && categories.value[ref.attr] ? `${categories.value[ref.attr].id}|${ref.value}` : '')

// Editor rule -> stored rule (shared/puzzles/logicalSolver.js).
function toStored (rule, clue) {
  if (rule.stored) return { clue, ...rule.stored }
  const [type, byId] = rule.rel.split(':')
  if (type === 'note') return { clue, type }
  const out = { clue, type, a: refOf(rule.a), b: refOf(rule.b) }
  if (type === 'eitherOr' || type === 'sum') out.c = refOf(rule.c)
  if (byId) out.by = catIndex(Number(byId))
  const number = rule.offset === '' ? NaN : Number(rule.offset)
  if (type === 'differsBy') {
    out.offset = number
    if (rule.abs) out.abs = true
  }
  if (type === 'times') out.factor = number
  return out
}

function fromStored (rule) {
  if (KEPT_AS_STORED.includes(rule.type)) {
    const stored = { ...rule }
    delete stored.clue
    return newRule({ stored })
  }
  const by = Number.isInteger(rule.by) && categories.value[rule.by] ? `:${categories.value[rule.by].id}` : ''
  return newRule({
    a: keyOf(rule.a),
    rel: rule.type + by,
    b: keyOf(rule.b),
    c: keyOf(rule.c),
    offset: typeof rule.offset === 'number' ? rule.offset : typeof rule.factor === 'number' ? rule.factor : 1,
    abs: rule.abs === true
  })
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const tableOk = computed(() =>
  categories.value.every((cat, c) => cat.name.trim() !== '' && !duplicateCategory(c)) &&
  rows.value.every((row, r) => row.every((v, c) => v.trim() !== '' && !duplicateValue(r, c))))

// The puzzle as stored, plus the state of every rule: 'ok', 'incomplete'
// (missing parts, or a value that no longer exists) or 'broken' (does not
// fit the solution table).
const formal = computed(() => {
  const data = buildData()
  const states = {}
  const ruleIds = []
  const valid = []
  const kept = clues.value.filter(c => c.text.trim())
  kept.forEach((clue, i) => clue.rules.forEach(rule => {
    const stored = toStored(rule, i)
    if (ruleProblem(stored, data.attributes)) {
      states[rule.id] = 'incomplete'
    } else {
      valid.push(stored)
      ruleIds.push(rule.id)
    }
  }))
  clues.value.filter(c => !c.text.trim()).forEach(c => c.rules.forEach(r => { states[r.id] = 'incomplete' }))
  const broken = tableOk.value ? brokenRules({ ...data, rules: valid }) : null
  valid.forEach((rule, k) => { states[ruleIds[k]] = broken && broken.includes(k) ? 'broken' : 'ok' })
  const ruleCount = clues.value.reduce((n, c) => n + c.rules.length, 0)
  return {
    ...data,
    rules: valid,
    states,
    ruleCount,
    rulesOk: Object.values(states).every(s => s === 'ok'),
    clueCount: kept.length,
    coveredClues: kept.filter(c => c.rules.length).length
  }
})

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
  },
  ...(categories.value.some(cat => cat.ordered)
    ? [{ key: 'ordered', ok: !categories.value.some((cat, c) => orderInvalid(c)) }]
    : []),
  ...(formal.value.ruleCount ? [{ key: 'rules', ok: formal.value.rulesOk }] : []),
  ...(analysis.value.status !== 'none' && analysis.value.status !== 'partial'
    ? [{ key: 'unique', ok: analysis.value.status === 'unique' }]
    : [])
])

const saveBlocker = computed(() => checks.value.some(item => !item.ok))
// Test play only needs a usable table.
const playable = computed(() => checks.value.filter(i => i.key === 'categories' || i.key === 'values').every(i => i.ok))

// ---------------------------------------------------------------------------
// Uniqueness check (solver in a Web Worker)
// ---------------------------------------------------------------------------

// status: 'none' (no rules), 'partial' (some clues without a rule),
// 'blocked' (table or rules need fixing first), 'checking', 'unique',
// 'ambiguous' (+ other: a second solution), 'contradiction', 'tooComplex'.
const result = ref(null)
let worker = null
let requestId = 0
let analyzeTimer = null

// What the solver needs, or null when there is nothing to check yet.
const request = computed(() => {
  const f = formal.value
  if (!f.ruleCount || f.coveredClues < f.clueCount || !tableOk.value || !f.rulesOk ||
      categories.value.some((cat, c) => orderInvalid(c))) return null
  return JSON.stringify({ attributes: f.attributes, rules: f.rules })
})

const analysis = computed(() => {
  const f = formal.value
  if (!f.ruleCount) return { status: 'none' }
  if (f.coveredClues < f.clueCount) return { status: 'partial' }
  if (!request.value) return { status: 'blocked' }
  if (!result.value || result.value.request !== request.value) return { status: 'checking' }
  const { solutions, complete, technique, error } = result.value
  if (error || (!complete && solutions.length < 2)) return { status: 'tooComplex' }
  if (!solutions.length) return { status: 'contradiction' }
  if (solutions.length > 1) {
    const own = JSON.stringify(f.solution)
    return { status: 'ambiguous', other: solutions.find(s => JSON.stringify(s) !== own) || solutions[1] }
  }
  return { status: 'unique', technique }
})

watch(request, value => {
  clearTimeout(analyzeTimer)
  if (!value || !worker) return
  analyzeTimer = setTimeout(() => {
    worker.postMessage({ id: ++requestId, request: value, puzzle: JSON.parse(value) })
  }, 300)
})

onMounted(() => {
  worker = new Worker(new URL('./solverWorker.js', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }) => {
    if (data.id !== requestId) return // an answer for an older state
    result.value = { request: data.request, ...(data.result || { solutions: [], complete: false, error: data.error }) }
  }
  if (request.value) worker.postMessage({ id: ++requestId, request: request.value, puzzle: JSON.parse(request.value) })
})
onBeforeUnmount(() => {
  clearTimeout(analyzeTimer)
  worker?.terminate()
})

// ---------------------------------------------------------------------------
// Puzzle data as stored
// ---------------------------------------------------------------------------


// attributes: every category's values sorted, except a category ordered by
// rows, which keeps the author's row order. solution: rows in the order of
// the first category's values, as the player's table expects. rules: the
// complete rules, `clue` counted among the non-empty clues.
function buildData () {
  const table = rows.value.map(row => row.map(v => v.trim()))
  const attributes = categories.value.map((cat, c) => {
    const values = table.map(row => row[c])
    return {
      name: cat.name.trim(),
      values: cat.ordered === 'list' ? values : [...values].sort(byText),
      ...(cat.ordered ? { ordered: cat.ordered } : {})
    }
  })
  const first = attributes[0].values
  const solution = [...table].sort((a, b) => first.indexOf(a[0]) - first.indexOf(b[0]))
  const kept = clues.value.filter(c => c.text.trim())
  const rules = kept.flatMap((clue, i) => clue.rules
    .map(rule => toStored(rule, i))
    .filter(rule => !ruleProblem(rule, attributes)))
  return {
    description: description.value.trim(),
    question: question.value.trim(),
    clues: kept.map(c => c.text.trim()),
    attributes,
    solution,
    // No image field in the editor yet; keep the one the puzzle already has.
    image: image.value,
    rules
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
  delete data.rules // players never get them
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
    categories: categories.value.map(c => ({ name: c.name, ordered: c.ordered })),
    rows: rows.value,
    clues: clues.value.map(c => c.text),
    // Rules of every clue (empty ones too), in stored form.
    rules: clues.value.flatMap((clue, i) => clue.rules.map(rule => toStored(rule, i)))
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
  image.value = typeof source.image === 'string' ? source.image : ''
  // Categories as names (older drafts) or { name, ordered }.
  categories.value = source.categories.map(cat => (typeof cat === 'string'
    ? newCategory(cat)
    : newCategory(cat.name || '', orderMode(cat) || '')))
  rows.value = source.rows.map(row => categories.value.map((_, c) => String(row[c] ?? '')))
  clues.value = source.clues.length ? source.clues.map(text => newClue(text)) : [newClue()]
  for (const rule of Array.isArray(source.rules) ? source.rules : []) {
    clues.value[rule.clue]?.rules.push(fromStored(rule))
  }
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
      // A category ordered by rows stores its values in the author's row
      // order; restore that order for the rows.
      const listed = data.attributes.findIndex(a => orderMode(a) === 'list')
      const rowsInOrder = listed < 0
        ? data.solution
        : [...data.solution].sort((a, b) =>
            data.attributes[listed].values.indexOf(a[listed]) - data.attributes[listed].values.indexOf(b[listed]))
      apply({
        ...data,
        categories: data.attributes,
        rows: rowsInOrder,
        clues: data.clues || [],
        rules: data.rules || []
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

  .clue-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .clue-text {
    min-height: 34px;
    field-sizing: content;
  }

  > .tool { margin-top: 5px; }
}

// Rule builder under a clue

.rule-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 8px;
  border-left: 3px solid #93b4f5;
  background: #f6f8fc;
  border-radius: 4px;

  &.incomplete { border-left-color: #d1d5db; background: #f9fafb; }
  &.broken { border-left-color: #dc2626; background: #fef2f2; }

  .input { width: auto; height: 28px; font-size: 13px; padding: 2px 6px; }
  .rule-value { max-width: 170px; }
  .rule-rel { max-width: 200px; }
  .rule-offset { width: 64px; }
  .rule-text { font-size: 13px; color: #1d4ed8; padding: 2px 0; flex: 1; min-width: 0; }
  .rule-abs, .rule-or { font-size: 13px; color: #4b5563; display: flex; align-items: center; gap: 3px; }
}

.add-rule {
  align-self: flex-start;
  border: none;
  background: none;
  padding: 0 2px;
  font-size: 12px;
  color: #2563eb;
  cursor: pointer;

  &:hover { text-decoration: underline; }
}

.solution-grid .order-select {
  margin-top: 3px;
  height: 26px;
  font-size: 12px;
  padding: 1px 4px;
  color: #4b5563;
}

// Second solution of an ambiguous puzzle

.other-solution {
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 4px;

  th, td { border: 1px solid #e5e7eb; padding: 2px 5px; text-align: left; }
  th { background: #f6f7f9; font-weight: 600; }
  td.differs { background: #fee2e2; color: #991b1b; font-weight: 600; }
}

.analysis .status-line {
  &.ok ion-icon { color: #16a34a; }
  &.bad ion-icon { color: #dc2626; }
  ion-icon { color: #9ca3af; }
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
