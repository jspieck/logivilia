<template>
  <div class="clue-pad" :class="{ disabled }">
    <!-- Sources: clues and values to pull onto the pad -->
    <div class="sources" data-palette="1" @click="paletteClick">
      <div v-if="clueCount" class="source-row">
        <span class="source-title">{{ t('logical.clues') }}</span>
        <div class="source-items">
          <button
            v-for="i in clueCount"
            :key="`c${i}`"
            type="button"
            class="clue-token"
            :class="{ on: modelValue.clues.includes(i - 1), [`state-${clueStates[i - 1] || 'open'}`]: modelValue.clues.includes(i - 1) }"
            :title="clues[i - 1]"
            :aria-pressed="modelValue.clues.includes(i - 1)"
            :disabled="disabled || !relationsOf(i - 1).length"
            @pointerdown="startDrag($event, { type: 'clue', index: i - 1, label: String(i) })"
            @click.stop="toggleClue(i - 1)"
          >{{ i }}</button>
        </div>
      </div>
      <div v-for="(attr, a) in attributes" :key="`a${a}`" class="source-row">
        <span class="source-title" :style="{ color: categoryColor(a).fg }">{{ attr.name }}</span>
        <div class="source-items">
          <button
            v-for="value in attr.values"
            :key="`v${a}:${value}`"
            type="button"
            class="value-token"
            :class="{ placed: placedKeys.has(`${a}:${value}`), selected: selectedKey === `${a}:${value}` }"
            :style="chipStyle(a)"
            :disabled="disabled"
            @pointerdown="startDrag($event, { type: 'value', ref: { attr: a, value: String(value) } })"
            @click.stop="clickValue({ attr: a, value: String(value) })"
          >{{ value }}</button>
        </div>
      </div>
    </div>

    <!-- The pad -->
    <div
      ref="padEl"
      class="pad"
      data-pad="1"
      :class="{ target: !!selectedKey }"
      :style="{ height: `${padHeight}px` }"
      @click="padClick"
    >
      <svg class="links" :width="padWidth" :height="padHeight" aria-hidden="true">
        <g v-for="link in drawnLinks" :key="link.id" :class="['link', link.kind, link.state, { maybe: link.maybe }]" :style="{ '--link': link.color }">
          <path :d="link.path" />
          <polyline v-if="link.head" :points="link.head" />
        </g>
      </svg>
      <span
        v-for="link in drawnLinks"
        :key="`l${link.id}`"
        class="link-label"
        :class="link.state"
        :style="{ left: `${link.labelX}px`, top: `${link.labelY}px`, '--link': link.color }"
      >{{ link.label }}</span>

      <div
        v-for="card in shownCards"
        :key="card.id"
        :ref="el => setCardEl(card.id, el)"
        class="card"
        :class="{ dragging: drag?.type === 'card' && drag.id === card.id && drag.moved }"
        :data-card="card.id"
        :style="{ left: `${card.left}px`, top: `${card.top}px` }"
        @pointerdown="startDrag($event, { type: 'card', id: card.id })"
        @click.stop="clickCard(card)"
      >
        <span
          v-for="entry in card.entries"
          :key="entry.key"
          class="value-token in-card"
          :class="{ selected: selectedKey === entry.key, hot: hot.has(entry.key) }"
          :style="chipStyle(entry.ref.attr)"
          :title="attributes[entry.ref.attr].name"
          @pointerdown.stop="startDrag($event, { type: 'value', ref: entry.ref })"
          @click.stop="clickValue(entry.ref, card)"
        >{{ entry.label }}</span>
        <button
          v-if="!disabled"
          type="button"
          class="card-remove"
          :aria-label="t('logical.padRemoveCard')"
          :title="t('logical.padRemoveCard')"
          @pointerdown.stop
          @click.stop="emitPad(removeCard(modelValue, card.id))"
        >×</button>
      </div>

      <p v-if="!modelValue.cards.length" class="pad-empty">{{ t('logical.padEmpty') }}</p>
    </div>

    <!-- Clues on the pad -->
    <ul v-if="modelValue.clues.length" class="pad-clues">
      <li v-for="i in sortedClues" :key="i" :class="clueStates[i]">
        <span class="clue-no">{{ i + 1 }}</span>
        <div class="pad-clue-body">
          <RelationChips v-for="(relation, k) in relationsOf(i)" :key="k" :relation="relation" :attributes="attributes" />
        </div>
        <span class="state-badge">{{ t(`logical.padState.${clueStates[i]}`) }}</span>
        <button v-if="!disabled" type="button" class="clue-remove" :aria-label="t('logical.padRemoveClue')" :title="t('logical.padRemoveClue')" @click="emitPad(removeClue(modelValue, i))">×</button>
      </li>
    </ul>

    <span
      v-if="drag && drag.moved && drag.type !== 'card'"
      class="ghost"
      :class="drag.type === 'clue' ? 'clue-token' : 'value-token'"
      :style="{ ...(drag.ref ? chipStyle(drag.ref.attr) : {}), left: `${drag.x}px`, top: `${drag.y}px` }"
    >{{ drag.label }}</span>
  </div>
</template>

<script setup>
// The Logikrätsel notepad: one free board instead of a scale per category.
// Players drop values on it as cards (values on one card belong together),
// drag cards onto each other to join them, and pull clues in: a clue adds
// cards for its values and draws its relations as links between the cards,
// smaller value -> bigger value, green when the cards satisfy it and red when
// they cannot (cluePad.js). Mouse: drag and drop. Touch: tap a value or clue,
// then tap the pad or a card; swiping over the lists still scrolls the page.

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import RelationChips from './RelationChips.vue'
import { categoryColor } from './categoryColors'
import { valueLabel } from './describeRule'
import { orientRelation, orientDetail, unitOf } from './orientRelation'
import {
  valueKey, cardOf, relationLinks, clueState, addToCard, newCard, removeValue,
  removeCard, moveCard, mergeCards, removeClue, addClue
} from './cluePad'

const props = defineProps({
  attributes: { type: Array, required: true },
  relations: { type: Array, default: () => [] },
  clues: { type: Array, default: () => [] },
  modelValue: { type: Object, required: true },
  hot: { type: Object, default: () => new Set() },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const emitPad = pad => emit('update:modelValue', pad)

const chipStyle = (attr) => {
  const c = categoryColor(attr)
  return { background: c.bg, color: c.fg, '--dot': c.dot }
}

// --- Clues -------------------------------------------------------------------
const relationsByClue = computed(() => {
  const map = new Map()
  for (const relation of props.relations) {
    if (!map.has(relation.clue)) map.set(relation.clue, [])
    map.get(relation.clue).push(relation)
  }
  return map
})
const relationsOf = i => relationsByClue.value.get(i) || []
const clueCount = computed(() => (relationsByClue.value.size ? props.clues.length : 0))
const sortedClues = computed(() => [...props.modelValue.clues].sort((a, b) => a - b))
const clueStates = computed(() => {
  const states = {}
  for (const i of props.modelValue.clues) states[i] = clueState(relationsOf(i), props.modelValue, props.attributes)
  return states
})

// --- Pad size and card sizes ---------------------------------------------------
const padEl = ref(null)
const padWidth = ref(600)
const sizes = ref({})
const cardEls = new Map()
let padObserver = null
let cardObserver = null

const DEFAULT_W = 110
const sizeOf = (card) => sizes.value[card.id] || { w: DEFAULT_W, h: 14 + 30 * Object.keys(card.values).length }

const setCardEl = (id, el) => {
  const old = cardEls.get(id)
  if (old === el) return
  if (old) cardObserver?.unobserve(old)
  if (el) {
    cardEls.set(id, el)
    cardObserver?.observe(el)
  } else {
    cardEls.delete(id)
  }
}

onMounted(() => {
  padWidth.value = padEl.value.clientWidth || padWidth.value
  padObserver = new ResizeObserver(([entry]) => { padWidth.value = entry.contentRect.width })
  padObserver.observe(padEl.value)
  cardObserver = new ResizeObserver((entries) => {
    const next = { ...sizes.value }
    for (const entry of entries) {
      const id = Number(entry.target.dataset.card)
      next[id] = { w: entry.target.offsetWidth, h: entry.target.offsetHeight }
    }
    sizes.value = next
  })
  cardEls.forEach(el => cardObserver.observe(el))
})
onBeforeUnmount(() => {
  padObserver?.disconnect()
  cardObserver?.disconnect()
  endDrag()
})

const MARGIN = 6
const clampX = (x, w) => Math.max(MARGIN, Math.min(x, padWidth.value - w - MARGIN))
const clampY = y => Math.max(MARGIN, y)

// Cards as drawn: kept inside the pad, and following the pointer while dragged.
const shownCards = computed(() => props.modelValue.cards.map((card) => {
  const { w, h } = sizeOf(card)
  let { x, y } = card
  if (drag.value?.type === 'card' && drag.value.id === card.id && drag.value.moved) {
    x = drag.value.cardX
    y = drag.value.cardY
  }
  const entries = Object.entries(card.values)
    .map(([attr, value]) => ({ ref: { attr: Number(attr), value }, key: `${attr}:${value}` }))
    .sort((p, q) => p.ref.attr - q.ref.attr)
    .map(e => ({ ...e, label: valueLabel(e.ref, props.attributes) }))
  return { ...card, w, h, left: clampX(x, w), top: clampY(y), entries }
}))

const BASE_HEIGHT = 300
const padHeight = computed(() => Math.max(BASE_HEIGHT, ...shownCards.value.map(c => c.top + c.h + 60)))

// Room for a new card near (x, y): tries spots around it until none overlaps.
const freeSpot = (pad, x, y) => {
  const w = DEFAULT_W
  const h = 60
  const boxes = pad.cards.map((c) => {
    const s = sizeOf(c)
    return { x: clampX(c.x, s.w), y: c.y, w: s.w, h: s.h }
  })
  const fits = (px, py) => boxes.every(b => px + w + 12 < b.x || px > b.x + b.w + 12 || py + h + 12 < b.y || py > b.y + b.h + 12)
  for (let ring = 0; ring < 12; ring++) {
    for (const [dx, dy] of [[0, 0], [0, 1], [1, 0], [-1, 0], [1, 1], [-1, 1], [0, -1]]) {
      const px = clampX(x + dx * ring * 90, w)
      const py = clampY(y + dy * ring * 80)
      if (fits(px, py)) return { x: px, y: py }
    }
  }
  return { x: clampX(x, w), y: clampY(y + 80) }
}
// Where a clue tapped in (not dropped) starts looking for room.
const autoSpot = () => ({ x: padWidth.value / 2 - DEFAULT_W / 2 - 75, y: 14 })

// --- Links -------------------------------------------------------------------
const COLORS = { ok: '#1f9d6b', bad: '#d14343', same: '#8b879e', not: '#c2410c' }

// Point where the line from the centre of box b towards (tx, ty) leaves it.
const edgePoint = (b, tx, ty) => {
  const cx = b.left + b.w / 2
  const cy = b.top + b.h / 2
  const dx = tx - cx
  const dy = ty - cy
  if (!dx && !dy) return { x: cx, y: cy }
  const hw = b.w / 2 + 5
  const hh = b.h / 2 + 5
  const s = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity)
  return { x: cx + dx * s, y: cy + dy * s }
}

const linkLabel = (link, clue) => {
  const r = link.relation
  if (link.kind === 'same') return `${clue + 1} =${link.maybe ? '?' : ''}`
  if (link.kind === 'not') return `${clue + 1} ≠`
  const o = orientRelation(r)
  const detail = o ? orientDetail(o, unitOf(props.attributes[r.by]), t) : ''
  return `${clue + 1}${detail ? ` · ${detail}` : ''}${link.maybe ? ' ?' : ''}`
}

const drawnLinks = computed(() => {
  const byId = new Map(shownCards.value.map(c => [c.id, c]))
  const all = []
  for (const clue of props.modelValue.clues) {
    for (const relation of relationsOf(clue)) {
      for (const link of relationLinks(relation, props.modelValue)) {
        all.push({ ...link, clue, state: clueState([link.relation], props.modelValue, props.attributes) })
      }
    }
  }
  // Several links between the same two cards bend apart.
  const pairCount = new Map()
  return all.map((link, id) => {
    const a = byId.get(link.from)
    const b = byId.get(link.to)
    if (!a || !b) return null
    const pair = [link.from, link.to].sort().join('-')
    const k = pairCount.get(pair) || 0
    pairCount.set(pair, k + 1)
    const ac = { x: a.left + a.w / 2, y: a.top + a.h / 2 }
    const bc = { x: b.left + b.w / 2, y: b.top + b.h / 2 }
    const len = Math.hypot(bc.x - ac.x, bc.y - ac.y) || 1
    const bend = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 34
    const nx = -(bc.y - ac.y) / len
    const ny = (bc.x - ac.x) / len
    const mid = { x: (ac.x + bc.x) / 2 + nx * bend, y: (ac.y + bc.y) / 2 + ny * bend }
    const p1 = edgePoint(a, mid.x, mid.y)
    const p2 = edgePoint(b, mid.x, mid.y)
    const ctrl = { x: 2 * mid.x - (p1.x + p2.x) / 2, y: 2 * mid.y - (p1.y + p2.y) / 2 }
    let head = ''
    if (link.kind === 'order') {
      const ux = p2.x - ctrl.x
      const uy = p2.y - ctrl.y
      const ul = Math.hypot(ux, uy) || 1
      const bx = p2.x - (ux / ul) * 9
      const by = p2.y - (uy / ul) * 9
      const px = (-uy / ul) * 5
      const py = (ux / ul) * 5
      head = `${bx + px},${by + py} ${p2.x},${p2.y} ${bx - px},${by - py}`
    }
    const r = link.relation
    const base = link.kind === 'same' ? COLORS.same : link.kind === 'not' ? COLORS.not : categoryColor(r.by).dot
    return {
      ...link,
      id,
      path: `M${p1.x} ${p1.y}Q${ctrl.x} ${ctrl.y} ${p2.x} ${p2.y}`,
      head,
      color: link.state === 'open' ? base : COLORS[link.state],
      label: linkLabel(link, link.clue),
      labelX: mid.x,
      labelY: mid.y
    }
  }).filter(Boolean)
})

// --- Selection (tap, then tap a target) ------------------------------------------
const selected = ref(null)
const selectedKey = computed(() => (selected.value ? valueKey(selected.value) : null))
const placedKeys = computed(() => new Set(props.modelValue.cards.flatMap(c => Object.entries(c.values).map(([a, v]) => `${a}:${v}`))))

let justDragged = false

const clickValue = (ref) => {
  if (props.disabled || justDragged) return
  selected.value = selectedKey.value === valueKey(ref) ? null : ref
}

const padPoint = (clientX, clientY) => {
  const rect = padEl.value.getBoundingClientRect()
  return { x: clientX - rect.left, y: clientY - rect.top }
}

const padClick = (event) => {
  if (props.disabled || justDragged || !selected.value) return
  const p = padPoint(event.clientX, event.clientY)
  emitPad(newCard(props.modelValue, selected.value, p.x - DEFAULT_W / 2, p.y - 16))
  selected.value = null
}

const clickCard = (card) => {
  if (props.disabled || justDragged || !selected.value) return
  emitPad(addToCard(props.modelValue, selected.value, card.id))
  selected.value = null
}

// Tapping the lists while a value on the pad is selected takes it off the pad.
const paletteClick = () => {
  if (props.disabled || !selected.value || !cardOf(props.modelValue, selected.value)) return
  emitPad(removeValue(props.modelValue, selected.value))
  selected.value = null
}

const addClueAt = (index, spot) => {
  emitPad(addClue(props.modelValue, index, relationsOf(index), spot.x, spot.y, freeSpot))
}

const toggleClue = (index) => {
  if (props.disabled || justDragged) return
  if (props.modelValue.clues.includes(index)) emitPad(removeClue(props.modelValue, index))
  else addClueAt(index, autoSpot())
}

// --- Dragging ------------------------------------------------------------------
const drag = ref(null)

const startDrag = (event, item) => {
  if (props.disabled || event.button !== 0) return
  // Lists stay scrollable on touch screens: there a value or clue is tapped
  // and then placed with a second tap. Cards on the pad can be dragged.
  if (item.type !== 'card' && event.pointerType === 'touch' && !event.target.closest('[data-card]')) return
  let label = item.label
  if (item.type === 'value') label = valueLabel(item.ref, props.attributes)
  let cardX = 0
  let cardY = 0
  if (item.type === 'card') {
    const card = shownCards.value.find(c => c.id === item.id)
    cardX = card.left
    cardY = card.top
  }
  drag.value = { ...item, label, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false, cardX, cardY, baseX: cardX, baseY: cardY }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', endDrag)
}

const onMove = (event) => {
  const d = drag.value
  if (!d) return
  if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < 5) return
  if (!d.moved) selected.value = null
  const next = { ...d, moved: true, x: event.clientX, y: event.clientY }
  if (d.type === 'card') {
    next.cardX = d.baseX + event.clientX - d.startX
    next.cardY = Math.max(MARGIN, d.baseY + event.clientY - d.startY)
  }
  drag.value = next
}

// What is under the pointer, ignoring the card being dragged.
const dropTarget = (x, y, ignoreCard) => {
  for (const el of document.elementsFromPoint(x, y)) {
    const card = el.closest('[data-card]')
    if (card && Number(card.dataset.card) !== ignoreCard) return { card: Number(card.dataset.card) }
    if (el.closest('[data-pad]') && !card) return { pad: true }
    if (el.closest('[data-palette]')) return { palette: true }
  }
  return {}
}

const onUp = (event) => {
  const d = drag.value
  endDrag()
  if (!d || !d.moved) return
  justDragged = true
  setTimeout(() => { justDragged = false }, 0)
  const target = dropTarget(event.clientX, event.clientY, d.type === 'card' ? d.id : null)
  const pad = props.modelValue
  if (d.type === 'card') {
    if (target.card !== undefined) {
      const merged = mergeCards(pad, d.id, target.card)
      if (merged) return emitPad(merged)
    }
    if (target.palette) return emitPad(removeCard(pad, d.id))
    return emitPad(moveCard(pad, d.id, d.cardX, d.cardY))
  }
  if (d.type === 'value') {
    if (target.card !== undefined) return emitPad(addToCard(pad, d.ref, target.card))
    if (target.pad) {
      const p = padPoint(event.clientX, event.clientY)
      return emitPad(newCard(pad, d.ref, p.x - DEFAULT_W / 2, p.y - 16))
    }
    if (target.palette) return emitPad(removeValue(pad, d.ref))
    return
  }
  if (d.type === 'clue' && (target.pad || target.card !== undefined) && !pad.clues.includes(d.index)) {
    const p = padPoint(event.clientX, event.clientY)
    addClueAt(d.index, { x: p.x - DEFAULT_W / 2, y: p.y - 16 })
  }
}

function endDrag () {
  drag.value = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', endDrag)
}
</script>

<style lang="scss" scoped>
.clue-pad {
  position: relative;
}

.sources {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.source-row {
  display: flex;
  align-items: baseline;
  gap: 4px 10px;

  .source-title {
    flex: none;
    width: 92px;
    font-size: 13px;
    font-weight: 700;
    color: #55526a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-items {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    min-width: 0;
  }
}

.value-token,
.clue-token {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 11px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: grab;
  user-select: none;
  // Lists scroll with a swipe; on touch a value is tapped, then placed.
  touch-action: manipulation;

  &.placed { opacity: 0.38; }
  &.selected { outline: 2px solid #7957d5; outline-offset: 2px; }
  &:disabled { cursor: default; }
}

.clue-token {
  min-width: 30px;
  justify-content: center;
  padding: 0 8px;
  background: #e0e7ff;
  color: #3730a3;

  &.on { background: #4f46e5; color: #fff; }
  &.on.state-ok { background: #1f9d6b; }
  &.on.state-bad { background: #d14343; }
  &:disabled { opacity: 0.4; }
}

.pad {
  position: relative;
  border: 1.5px dashed #d4cfe4;
  border-radius: 12px;
  background-color: #fbfaff;
  background-image: radial-gradient(#e2ddf0 1px, transparent 1px);
  background-size: 18px 18px;
  overflow: hidden;
  // Swiping over the empty pad scrolls the page.
  touch-action: pan-x pan-y;
  transition: border-color 0.15s;

  &.target { border-color: #7957d5; cursor: copy; }
}

.pad-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: #8b879e;
  pointer-events: none;
}

.links {
  position: absolute;
  inset: 0;
  pointer-events: none;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;

  .link {
    stroke: var(--link);
    stroke-width: 2;

    &.not path,
    &.maybe path { stroke-dasharray: 5 5; }
    &.same path { stroke-dasharray: 2 4; }
  }
}

.link-label {
  position: absolute;
  z-index: 1;
  transform: translate(-50%, -50%);
  padding: 1px 7px;
  border-radius: 999px;
  border: 1.5px solid var(--link);
  background: #fff;
  color: #3d3a52;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  pointer-events: none;

  &.ok { background: #e3f5ec; color: #146c4a; }
  &.bad { background: #fdecec; color: #a12a2a; }
}

.card {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 90px;
  padding: 6px 22px 6px 6px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #ddd8ea;
  box-shadow: 0 1px 3px rgba(31, 29, 43, 0.12);
  cursor: grab;
  touch-action: none;
  user-select: none;

  &.dragging {
    z-index: 5;
    cursor: grabbing;
    box-shadow: 0 10px 24px rgba(91, 63, 196, 0.22);
  }

  .in-card {
    height: 24px;
    padding: 0 9px;
    font-size: 12px;
    touch-action: none;

    &.hot { box-shadow: 0 0 0 2px #7957d5; }
  }
}

.card-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #9c98b0;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;

  &:hover { background: #f1eff7; color: #3d3a52; }
}

.disabled .card,
.disabled .value-token { cursor: default; }

.ghost {
  position: fixed;
  z-index: 50;
  transform: translate(-50%, -50%) rotate(-3deg);
  box-shadow: 0 10px 24px rgba(91, 63, 196, 0.18);
  pointer-events: none;
}

.pad-clues {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  li {
    display: flex;
    align-items: center;
    gap: 8px 12px;
  }

  .clue-no {
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

  .pad-clue-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .state-badge {
    margin-left: auto;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: #f1eff7;
    color: #55526a;
    white-space: nowrap;
  }

  .ok .state-badge { background: #e3f5ec; color: #146c4a; }
  .bad .state-badge { background: #fdecec; color: #a12a2a; }

  .clue-remove {
    flex: none;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #9c98b0;
    font-size: 17px;
    cursor: pointer;

    &:hover { background: #f1eff7; color: #3d3a52; }
  }
}

@media (max-width: 600px) {
  .pad-clues li {
    flex-wrap: wrap;
    align-items: flex-start;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1eff7;

    .pad-clue-body { order: 3; flex-basis: 100%; }
    .state-badge { margin-left: 0; }
    .clue-remove { margin-left: auto; }
  }

  .source-row {
    flex-direction: column;
    gap: 3px;

    .source-title { width: auto; }
  }
}
</style>
