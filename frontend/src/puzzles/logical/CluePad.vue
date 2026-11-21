<template>
  <div class="clue-pad" :class="{ disabled, wide, dragging: !!drag?.moved }">
    <!-- Wide (full-screen) layout: the clue texts next to the pad -->
    <aside v-if="wide && clueCount" class="clue-list" data-palette="1">
      <div class="clue-list-head">
        <span class="source-title">{{ t('logical.clues') }}</span>
        <span class="head-buttons">
          <button v-if="!disabled && missingClues.length" type="button" class="text-button" @click="addAllClues">{{ t('logical.padAllClues') }}</button>
          <button v-if="!disabled && modelValue.cards.length > 1" type="button" class="text-button" :title="t('logical.padArrangeTitle')" @click="arrange">{{ t('logical.padArrange') }}</button>
        </span>
      </div>
      <ol>
        <li v-for="i in clueCount" :key="`t${i}`" :class="{ on: modelValue.clues.includes(i - 1) }">
          <button
            type="button"
            class="clue-token"
            :class="clueTokenClass(i - 1)"
            :aria-pressed="modelValue.clues.includes(i - 1)"
            :disabled="disabled || !relationsOf(i - 1).length"
            @pointerdown="startDrag($event, { type: 'clue', index: i - 1, label: String(i) })"
            @click.stop="toggleClue(i - 1)"
          >{{ i }}</button>
          <span class="clue-text">{{ clues[i - 1] }}</span>
        </li>
      </ol>
    </aside>

    <div class="pad-main">
      <!-- Sources: clues and values to pull onto the pad -->
      <div class="sources" data-palette="1" :class="{ 'drop-remove': dropRemove }" @click="paletteClick">
        <div v-if="clueCount && !wide" class="source-row">
          <span class="source-title">{{ t('logical.clues') }}</span>
          <div class="source-items">
            <button
              v-for="i in clueCount"
              :key="`c${i}`"
              type="button"
              class="clue-token"
              :class="clueTokenClass(i - 1)"
              :title="clues[i - 1]"
              :aria-pressed="modelValue.clues.includes(i - 1)"
              :disabled="disabled || !relationsOf(i - 1).length"
              @pointerdown="startDrag($event, { type: 'clue', index: i - 1, label: String(i) })"
              @click.stop="toggleClue(i - 1)"
            >{{ i }}</button>
            <button v-if="!disabled && missingClues.length" type="button" class="text-button" @click.stop="addAllClues">{{ t('logical.padAllClues') }}</button>
            <button v-if="!disabled && modelValue.cards.length > 1" type="button" class="text-button" :title="t('logical.padArrangeTitle')" @click.stop="arrange">{{ t('logical.padArrange') }}</button>
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
              :class="{ placed: placedKeys.has(`${a}:${value}`), selected: selectedKey === `${a}:${value}`, lifting: liftingKeys.has(`${a}:${value}`) }"
              :style="chipStyle(a)"
              :disabled="disabled"
              @pointerdown="startDrag($event, { type: 'value', ref: { attr: a, value: String(value) } })"
              @click.stop="clickValue({ attr: a, value: String(value) })"
            >{{ value }}</button>
          </div>
        </div>
        <span v-if="dropRemove" class="drop-remove-note">{{ t('logical.padDropRemove') }}</span>
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
            <polygon v-for="(head, h) in link.heads" :key="h" :points="head" />
          </g>
        </svg>
        <span
          v-for="link in drawnLinks"
          v-show="link.label"
          :key="`l${link.id}`"
          class="link-label"
          :class="[link.kind, link.state]"
          :style="{ left: `${link.labelX}px`, top: `${link.labelY}px`, '--link': link.color }"
        >{{ link.label }}</span>

        <!-- Where a dragged card came from, and where a dragged value will land -->
        <div v-if="origin" class="card-origin" :style="origin" />
        <div v-if="landing" class="landing" :style="landing" />

        <div
          v-for="card in shownCards"
          :key="card.id"
          :ref="el => setCardEl(card.id, el)"
          class="card"
          :class="cardClass(card)"
          :data-card="card.id"
          :style="{ left: `${card.left}px`, top: `${card.top}px` }"
          @pointerdown="startDrag($event, { type: 'card', id: card.id })"
          @click.stop="clickCard(card)"
        >
          <div class="card-body">
          <template v-for="(part, p) in card.parts" :key="`p${p}`">
            <div v-if="p > 0" class="part-join">
              <span class="join-line" />
              <button
                v-if="!disabled"
                type="button"
                class="split"
                :title="t('logical.padSplit')"
                :aria-label="t('logical.padSplit')"
                @pointerdown.stop
                @click.stop="split(card, p)"
              >✂</button>
              <span class="join-line" />
            </div>
            <span
              v-for="entry in part"
              :key="entry.key"
              class="value-token in-card"
              :class="{ selected: selectedKey === entry.key, hot: hot.has(entry.key), bound: entry.bound, lifting: liftingKeys.has(entry.key) }"
              :style="chipStyle(entry.ref.attr)"
              :title="entry.bound ? `${attributes[entry.ref.attr].name} · ${t('logical.padBound')}` : attributes[entry.ref.attr].name"
              @pointerdown.stop="startDrag($event, { type: 'value', ref: entry.ref })"
              @click.stop="clickValue(entry.ref, card)"
            ><span v-if="entry.bound" class="bond" aria-hidden="true">=</span>{{ entry.label }}</span>
          </template>

          <!-- Candidates: the values of the other categories, to cross off.
               👁 decides whether a row also shows on the closed card. -->
          <div v-if="card.notes && card.candidates.length" class="notes" @pointerdown.stop>
            <div v-for="row in card.candidates" :key="row.attr" class="note-row">
              <button
                type="button"
                class="eye"
                :class="{ on: row.shown }"
                :style="{ '--dot': categoryColor(row.attr).dot }"
                :title="`${attributes[row.attr].name}: ${t(row.shown ? 'logical.padHideRow' : 'logical.padShowRow')}`"
                :aria-label="`${attributes[row.attr].name}: ${t(row.shown ? 'logical.padHideRow' : 'logical.padShowRow')}`"
                :aria-pressed="row.shown"
                :disabled="disabled"
                @click.stop="emitPad(toggleShown(modelValue, card.id, row.attr))"
              ><ion-icon :name="row.shown ? 'eye-outline' : 'eye-off-outline'"></ion-icon></button>
              <button
                v-for="c in row.values"
                :key="c.value"
                type="button"
                class="cand"
                :class="{ crossed: c.crossed, last: row.left === 1 && !c.crossed }"
                :disabled="disabled"
                @click.stop="emitPad(toggleCrossed(modelValue, card.id, { attr: row.attr, value: c.value }))"
              >{{ c.value }}</button>
            </div>
          </div>
          <!-- Closed card: what is still possible in the rows marked 👁 -->
          <div v-else-if="card.summary.length" class="summary">
            <div v-for="row in card.summary" :key="row.attr" class="summary-row" :class="{ last: row.left === 1 }" :title="attributes[row.attr].name">
              <span class="note-dot" :style="{ background: categoryColor(row.attr).dot }" />
              <span class="summary-values">{{ row.values.filter(c => !c.crossed).map(c => c.value).join(' · ') || '–' }}</span>
            </div>
          </div>
          </div>

          <div v-if="!disabled" class="card-tools">
            <button
              type="button"
              class="card-tool"
              :class="{ on: card.notes }"
              :aria-label="t('logical.padNotes')"
              :title="t('logical.padNotes')"
              @pointerdown.stop
              @click.stop="emitPad(toggleNotes(modelValue, card.id))"
            >✎</button>
            <button
              type="button"
              class="card-tool"
              :aria-label="t('logical.padRemoveCard')"
              :title="t('logical.padRemoveCard')"
              @pointerdown.stop
              @click.stop="emitPad(removeCard(modelValue, card.id))"
            >×</button>
          </div>
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
          <span class="state-badge" :title="t(`logical.padStateHelp.${clueStates[i]}`)">{{ t(`logical.padState.${clueStates[i]}`) }}</span>
          <button v-if="!disabled" type="button" class="clue-remove" :aria-label="t('logical.padRemoveClue')" :title="t('logical.padRemoveClue')" @click="emitPad(removeClue(modelValue, i))">×</button>
        </li>
      </ul>
    </div>

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
// drag cards onto each other to join them (the seam stays visible and ✂
// splits it again), and pull clues in: a clue adds cards for its values, puts
// "=" values straight onto one card (they then move together), and draws
// comparisons as arrows between the cards, smaller value -> bigger, with the
// gap on the arrow; green when the cards satisfy it, red when they cannot
// (cluePad.js). ✎ on a card lists the values still possible for it, to cross
// off. Mouse: drag and drop, with a preview of where things land. Touch: tap
// a value or clue, then tap the pad or a card; swiping over the lists still
// scrolls the page.

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import RelationChips from './RelationChips.vue'
import { categoryColor } from './categoryColors'
import { valueLabel } from './describeRule'
import { orientRelation, orientText } from './orientRelation'
import {
  valueKey, cardOf, relationLinks, clueState, addToCard, newCard, removeValue,
  removeCard, moveCard, mergeCards, cardsClash, removeClue, addClue, sameBonds,
  boundRefs, partsOf, splitPart, toggleCrossed, toggleNotes, layoutPad, rowShown, toggleShown
} from './cluePad'

const props = defineProps({
  attributes: { type: Array, required: true },
  relations: { type: Array, default: () => [] },
  clues: { type: Array, default: () => [] },
  modelValue: { type: Object, required: true },
  hot: { type: Object, default: () => new Set() },
  disabled: { type: Boolean, default: false },
  // Full-screen layout: clue texts beside the pad, a taller pad.
  wide: { type: Boolean, default: false }
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
const clueTokenClass = (i) => {
  const on = props.modelValue.clues.includes(i)
  return { on, [`state-${clueStates.value[i] || 'open'}`]: on }
}
const missingClues = computed(() =>
  Array.from({ length: clueCount.value }, (_, i) => i).filter(i => relationsOf(i).length && !props.modelValue.clues.includes(i)))

// "=" of the clues on the pad: those values stay together.
const bonds = computed(() => props.modelValue.clues.flatMap(i => sameBonds(relationsOf(i))))
const boundKeys = computed(() => {
  const keys = new Set()
  for (const [a, b] of bonds.value) {
    const ca = cardOf(props.modelValue, a)
    if (ca && ca === cardOf(props.modelValue, b)) {
      keys.add(valueKey({ attr: a.attr, value: String(a.value) }))
      keys.add(valueKey({ attr: b.attr, value: String(b.value) }))
    }
  }
  return keys
})

// --- Pad size and card sizes ---------------------------------------------------
const padEl = ref(null)
const padWidth = ref(600)
const sizes = ref({})
const cardEls = new Map()
let padObserver = null
let cardObserver = null

const DEFAULT_W = 110
// Measured size, or a guess from the labels for a card not drawn yet.
const sizeOf = (card) => {
  if (sizes.value[card.id]) return sizes.value[card.id]
  const labels = Object.entries(card.values).map(([attr, value]) => valueLabel({ attr: Number(attr), value }, props.attributes))
  return { w: Math.max(DEFAULT_W, ...labels.map(l => 48 + 7.5 * l.length)), h: 14 + 30 * labels.length }
}

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
// Card ids start again at 1 after clearing: forget sizes of cards that are gone.
watch(() => props.modelValue.cards.map(c => c.id).join(','), () => {
  const ids = new Set(props.modelValue.cards.map(c => String(c.id)))
  const kept = Object.fromEntries(Object.entries(sizes.value).filter(([id]) => ids.has(id)))
  if (Object.keys(kept).length !== Object.keys(sizes.value).length) sizes.value = kept
})

onBeforeUnmount(() => {
  padObserver?.disconnect()
  cardObserver?.disconnect()
  endDrag()
})

const MARGIN = 6
const clampX = (x, w) => Math.max(MARGIN, Math.min(x, padWidth.value - w - MARGIN))
const clampY = y => Math.max(MARGIN, y)

const placedKeys = computed(() => new Set(props.modelValue.cards.flatMap(c => Object.entries(c.values).map(([a, v]) => `${a}:${v}`))))

// Per category the card has no value of yet: its values, the ones the player
// crossed off (nothing is crossed automatically: that is the player's
// thinking), and whether the row shows on the closed card (rowShown).
const candidatesOf = card => props.attributes.map((attr, a) => {
  if (card.values[a] !== undefined) return null
  const crossed = new Set(card.crossed?.[a] || [])
  const values = attr.values.map(String).map(value => ({ value, crossed: crossed.has(value) }))
  return { attr: a, values, left: values.filter(v => !v.crossed).length, shown: rowShown(card, a) }
}).filter(Boolean)

// Cards as drawn: kept inside the pad, and following the pointer while dragged.
const shownCards = computed(() => props.modelValue.cards.map((card) => {
  const { w, h } = sizeOf(card)
  let { x, y } = card
  if (drag.value?.type === 'card' && drag.value.id === card.id && drag.value.moved) {
    x = drag.value.cardX
    y = drag.value.cardY
  }
  const entry = (attr) => {
    const r = { attr: Number(attr), value: card.values[attr] }
    const key = `${attr}:${r.value}`
    return { ref: r, key, label: valueLabel(r, props.attributes), bound: boundKeys.value.has(key) }
  }
  const parts = partsOf(card).map(part => [...part].sort((p, q) => p - q).map(entry))
  const candidates = candidatesOf(card)
  return { ...card, w, h, left: clampX(x, w), top: clampY(y), parts, candidates, summary: candidates.filter(row => row.shown) }
}))

const BASE_HEIGHT = 300
const padHeight = computed(() => Math.max(props.wide ? 480 : BASE_HEIGHT, ...shownCards.value.map(c => c.top + c.h + 60)))

// Room for a new card near (x, y): tries spots around it until none overlaps.
const freeSpot = (pad, x, y) => {
  const w = DEFAULT_W
  const h = 60
  const boxes = pad.cards.map((c) => {
    const s = sizeOf(c)
    return { x: clampX(c.x, s.w), y: c.y, w: s.w, h: s.h }
  })
  // Keeps room between cards for the labels on the links.
  const fits = (px, py) => boxes.every(b => px + w + 30 < b.x || px > b.x + b.w + 30 || py + h + 24 < b.y || py > b.y + b.h + 24)
  for (let ring = 0; ring < 16; ring++) {
    for (const [dx, dy] of [[0, 0], [0, 1], [1, 0], [-1, 0], [1, 1], [-1, 1], [0, -1]]) {
      const px = clampX(x + dx * ring * 110, w)
      const py = clampY(y + dy * ring * 90)
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

// Arrow head at `tip`, pointing away from `from`.
const arrowHead = (tip, from) => {
  const ux = tip.x - from.x
  const uy = tip.y - from.y
  const ul = Math.hypot(ux, uy) || 1
  const bx = tip.x - (ux / ul) * 14
  const by = tip.y - (uy / ul) * 14
  const px = (-uy / ul) * 7.5
  const py = (ux / ul) * 7.5
  return `${bx + px},${by + py} ${tip.x},${tip.y} ${bx - px},${by - py}`
}

// The text on a link: the gap of a comparison ("+5 Seiten"), = or ≠.
const linkLabel = (link) => {
  if (link.kind === 'same') return link.maybe ? '=?' : '='
  if (link.kind === 'not') return '≠'
  const r = link.relation
  const text = orientText(orientRelation(r), props.attributes[r.by], t)
  return `${text}${link.maybe ? ' ?' : ''}`
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
  // Several links between the same two cards bend apart, and a link bends
  // around cards in its way (the first bend whose curve and label miss them).
  const pairCount = new Map()
  const curve = (a, b, ac, bc, bend) => {
    const len = Math.hypot(bc.x - ac.x, bc.y - ac.y) || 1
    const nx = -(bc.y - ac.y) / len
    const ny = (bc.x - ac.x) / len
    const mid = { x: (ac.x + bc.x) / 2 + nx * bend, y: (ac.y + bc.y) / 2 + ny * bend }
    const p1 = edgePoint(a, mid.x, mid.y)
    const p2 = edgePoint(b, mid.x, mid.y)
    const ctrl = { x: 2 * mid.x - (p1.x + p2.x) / 2, y: 2 * mid.y - (p1.y + p2.y) / 2 }
    return { mid, p1, p2, ctrl }
  }
  // Labels already placed: later links keep clear of them too.
  const labels = []
  // How badly a curve collides: crossing a card counts most, then running
  // over a label; its own label inside a card is worst. 0 = clear.
  const hits = (c, a, b) => {
    const others = shownCards.value.filter(o => o.id !== a.id && o.id !== b.id)
    const inCard = (p, pad) => others.some(o => p.x > o.left - pad && p.x < o.left + o.w + pad && p.y > o.top - pad && p.y < o.top + o.h + pad)
    const onLabel = (p, pad) => labels.some(l => Math.abs(p.x - l.x) < 42 + pad && Math.abs(p.y - l.y) < 12 + pad)
    let score = (inCard(c.mid, 22) ? 20 : 0) + (onLabel(c.mid, 22) ? 6 : 0)
    for (let i = 1; i < 20; i++) {
      const s = i / 20
      const u = 1 - s
      const p = {
        x: u * u * c.p1.x + 2 * u * s * c.ctrl.x + s * s * c.p2.x,
        y: u * u * c.p1.y + 2 * u * s * c.ctrl.y + s * s * c.p2.y
      }
      if (inCard(p, 8)) score += 3
      else if (onLabel(p, 2)) score += 1
    }
    return score
  }
  // Arrows first, so the "=" / "≠" links bend around their labels.
  const rank = link => (link.kind === 'order' || link.kind === 'sym' ? 0 : 1)
  all.sort((p, q) => rank(p) - rank(q))
  return all.map((link, id) => {
    const a = byId.get(link.from)
    const b = byId.get(link.to)
    if (!a || !b) return null
    const pair = [link.from, link.to].sort().join('-')
    const k = pairCount.get(pair) || 0
    pairCount.set(pair, k + 1)
    const ac = { x: a.left + a.w / 2, y: a.top + a.h / 2 }
    const bc = { x: b.left + b.w / 2, y: b.top + b.h / 2 }
    const base = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 40
    let shape = null
    let best = Infinity
    for (const extra of [0, 45, -45, 70, -70, 100, -100, 140, -140, 200, -200]) {
      const c = curve(a, b, ac, bc, base + extra)
      const score = hits(c, a, b)
      if (score < best) {
        best = score
        shape = c
      }
      if (!score) break
    }
    const { mid, p1, p2, ctrl } = shape
    labels.push(mid)
    const heads = []
    if (link.kind === 'order' || link.kind === 'sym') heads.push(arrowHead(p2, ctrl))
    if (link.kind === 'sym') heads.push(arrowHead(p1, ctrl))
    const r = link.relation
    const tone = link.kind === 'same' ? COLORS.same : link.kind === 'not' ? COLORS.not : categoryColor(r.by).dot
    return {
      ...link,
      id,
      path: `M${p1.x} ${p1.y}Q${ctrl.x} ${ctrl.y} ${p2.x} ${p2.y}`,
      heads,
      color: link.state === 'open' ? tone : COLORS[link.state],
      label: linkLabel(link),
      labelX: mid.x,
      labelY: mid.y
    }
  }).filter(Boolean)
})

// --- Selection (tap, then tap a target) ------------------------------------------
const selected = ref(null)
const selectedKey = computed(() => (selected.value ? valueKey(selected.value) : null))

let justDragged = false

// A value on the pad moves with the values an "=" bonds to it.
const movingRefs = ref => boundRefs(props.modelValue, ref, bonds.value)

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
  emitPad(newCard(props.modelValue, movingRefs(selected.value), p.x - DEFAULT_W / 2, p.y - 16))
  selected.value = null
}

const clickCard = (card) => {
  if (props.disabled || justDragged || !selected.value) return
  emitPad(addToCard(props.modelValue, movingRefs(selected.value), card.id))
  selected.value = null
}

// Tapping the lists while a value on the pad is selected takes it off the pad.
const paletteClick = () => {
  if (props.disabled || !selected.value || !cardOf(props.modelValue, selected.value)) return
  emitPad(removeValue(props.modelValue, movingRefs(selected.value)))
  selected.value = null
}

const split = (card, index) => {
  emitPad(splitPart(props.modelValue, card.id, index, card.left + card.w + 24, card.top))
}

const addClueAt = (index, spot) => {
  emitPad(addClue(props.modelValue, index, relationsOf(index), spot.x, spot.y, freeSpot))
}

const toggleClue = (index) => {
  if (props.disabled || justDragged) return
  if (props.modelValue.clues.includes(index)) emitPad(removeClue(props.modelValue, index))
  else addClueAt(index, autoSpot())
}

// Tidy layout (cluePad.js layoutPad): arrows left to right, groups one below the other.
const linksOf = pad => pad.clues.flatMap(i => relationsOf(i).flatMap(r => relationLinks(r, pad)))
const tidy = pad => layoutPad(pad, linksOf(pad), sizeOf, padWidth.value)
const arrange = () => {
  if (!props.disabled) emitPad(tidy(props.modelValue))
}

// Every clue onto the pad at once, then tidied up.
const addAllClues = () => {
  if (props.disabled) return
  let pad = props.modelValue
  for (const i of missingClues.value) pad = addClue(pad, i, relationsOf(i), autoSpot().x, autoSpot().y, freeSpot)
  emitPad(tidy(pad))
}

// --- Dragging ------------------------------------------------------------------
const drag = ref(null)

const startDrag = (event, item) => {
  if (props.disabled || event.button !== 0) return
  // Lists stay scrollable on touch screens: there a value or clue is tapped
  // and then placed with a second tap. Cards on the pad can be dragged.
  if (item.type !== 'card' && event.pointerType === 'touch' && !event.target.closest('[data-card]')) return
  let label = item.label
  let refs = []
  if (item.type === 'value') {
    refs = movingRefs(item.ref)
    label = refs.map(r => valueLabel(r, props.attributes)).join(' = ')
  }
  let cardX = 0
  let cardY = 0
  let w = DEFAULT_W
  let h = 40
  if (item.type === 'card') {
    const card = shownCards.value.find(c => c.id === item.id)
    cardX = card.left
    cardY = card.top
    w = card.w
    h = card.h
  }
  drag.value = {
    ...item, refs, label, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
    moved: false, cardX, cardY, baseX: cardX, baseY: cardY, w, h, target: {}
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', endDrag)
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
  next.target = dropTarget(event.clientX, event.clientY, d.type === 'card' ? d.id : null)
  drag.value = next
}

// --- Drag preview ------------------------------------------------------------
// The dragged values stay in place, faded, until dropped.
const liftingKeys = computed(() => {
  const d = drag.value
  return d?.moved && d.type === 'value' ? new Set(d.refs.map(valueKey)) : new Set()
})
const dropRemove = computed(() => {
  const d = drag.value
  if (!d?.moved || !d.target.palette) return false
  return d.type === 'card' || (d.type === 'value' && d.refs.some(r => cardOf(props.modelValue, r)))
})
// Card under a dragged card or value: green when it joins, red when it cannot.
const cardClass = (card) => {
  const d = drag.value
  const classes = { dragging: d?.type === 'card' && d.id === card.id && d.moved, open: !!card.notes }
  if (d?.moved && d.target.card === card.id) {
    if (d.type === 'card') classes[cardsClash(props.modelValue, d.id, card.id) ? 'drop-bad' : 'drop-ok'] = true
    else if (d.type === 'value') classes['drop-ok'] = true
    else if (d.type === 'clue') classes['drop-clue'] = true
  }
  return classes
}
const origin = computed(() => {
  const d = drag.value
  if (!d?.moved || d.type !== 'card') return null
  return { left: `${d.baseX}px`, top: `${d.baseY}px`, width: `${d.w}px`, height: `${d.h}px` }
})
// Outline of the new card a value would make when dropped on the empty pad.
const landing = computed(() => {
  const d = drag.value
  if (!d?.moved || d.type !== 'value' || !d.target.pad || !padEl.value) return null
  const p = padPoint(d.x, d.y)
  const w = DEFAULT_W
  return { left: `${clampX(p.x - w / 2, w)}px`, top: `${clampY(p.y - 16)}px`, width: `${w}px`, height: `${12 + 30 * d.refs.length}px` }
})

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
      // Cards that cannot be joined: the dragged one goes back where it was.
      const merged = mergeCards(pad, d.id, target.card)
      return merged ? emitPad(merged) : undefined
    }
    if (target.palette) return emitPad(removeCard(pad, d.id))
    return emitPad(moveCard(pad, d.id, d.cardX, d.cardY))
  }
  if (d.type === 'value') {
    if (target.card !== undefined) return emitPad(addToCard(pad, d.refs, target.card))
    if (target.pad) {
      const p = padPoint(event.clientX, event.clientY)
      return emitPad(newCard(pad, d.refs, p.x - DEFAULT_W / 2, p.y - 16))
    }
    if (target.palette) return emitPad(removeValue(pad, d.refs))
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

  &.dragging { cursor: grabbing; }
}

.sources {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  padding: 4px;
  margin-left: -4px;
  margin-right: -4px;
  border-radius: 10px;
  transition: background-color 0.15s;

  &.drop-remove { background: #fdecec; }
}

.drop-remove-note {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #a12a2a;
  pointer-events: none;
}

.source-row {
  display: flex;
  align-items: baseline;
  gap: 4px 10px;

  .source-items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }
}

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

.text-button {
  height: 28px;
  padding: 0 10px;
  border: 1.5px solid #c7d2fe;
  border-radius: 999px;
  background: #fff;
  color: #3730a3;
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover { background: #eef2ff; }
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
  transition: opacity 0.12s;

  &.placed { opacity: 0.38; }
  &.selected { outline: 2px solid #7957d5; outline-offset: 2px; }
  &.lifting { opacity: 0.25; outline: 1.5px dashed #7957d5; outline-offset: 1px; }
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
    stroke-width: 3;

    polygon { fill: var(--link); stroke-width: 1.5; }

    &.not path,
    &.maybe path { stroke-dasharray: 6 6; }
    &.same path { stroke-width: 2; stroke-dasharray: 2 5; }
  }
}

.link-label {
  position: absolute;
  z-index: 1;
  transform: translate(-50%, -50%);
  padding: 2px 9px;
  border-radius: 999px;
  border: 2px solid var(--link);
  background: #fff;
  color: #3d3a52;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  pointer-events: none;
  font-variant-numeric: tabular-nums;

  &.same,
  &.not { padding: 0 7px; font-size: 14px; }
  &.ok { background: #e3f5ec; color: #146c4a; }
  &.bad { background: #fdecec; color: #a12a2a; }
}

.card-origin,
.landing {
  position: absolute;
  z-index: 1;
  border: 2px dashed #b9b2d3;
  border-radius: 10px;
  background: rgba(121, 87, 213, 0.05);
  pointer-events: none;
}

.landing { border-color: #7957d5; background: rgba(121, 87, 213, 0.1); }

.card {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: stretch;
  gap: 4px;
  min-width: 90px;
  max-width: 280px;
  padding: 6px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #ddd8ea;
  box-shadow: 0 1px 3px rgba(31, 29, 43, 0.12);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: box-shadow 0.12s, border-color 0.12s;

  &.dragging {
    z-index: 5;
    cursor: grabbing;
    opacity: 0.92;
    box-shadow: 0 12px 28px rgba(91, 63, 196, 0.25);
  }

  // An open candidate list lies over the cards around it.
  &.open { z-index: 4; box-shadow: 0 8px 22px rgba(31, 29, 43, 0.18); }
  &.drop-ok { border-color: #1f9d6b; box-shadow: 0 0 0 3px rgba(31, 157, 107, 0.35); }
  &.drop-bad { border-color: #d14343; box-shadow: 0 0 0 3px rgba(209, 67, 67, 0.3); }
  &.drop-clue { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.25); }

  .in-card {
    height: 24px;
    padding: 0 9px;
    font-size: 12px;
    touch-action: none;

    &.hot { box-shadow: 0 0 0 2px #7957d5; }
    &.bound { box-shadow: inset 0 0 0 1.5px var(--dot); }
    &.bound.hot { box-shadow: 0 0 0 2px #7957d5, inset 0 0 0 1.5px var(--dot); }

    .bond {
      margin-right: 5px;
      font-weight: 800;
      opacity: 0.6;
    }
  }
}

// The seam between two joined cards, with ✂ to split them again.
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 0;
}

.part-join {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 18px;

  .join-line {
    flex: 1;
    border-top: 1.5px dashed #cfc9e1;
  }

  .split {
    flex: none;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: #fff;
    color: #8b879e;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;

    &:hover { background: #f1eff7; color: #3d3a52; }
  }
}

// Edit and remove, in a column of their own at the right of the card.
.card-tools {
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2px;
  margin: -2px -2px -2px 0;
  padding-left: 4px;
  border-left: 1px solid #f1eff7;
}

.card-tool {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #9c98b0;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;

  &:hover { background: #f1eff7; color: #3d3a52; }
  &.on { background: #ede9fe; color: #5b3fc4; }
}

// Closed card: the values still possible in the rows marked 👁.
.summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 1px;
  padding-top: 4px;
  border-top: 1px solid #eeebf5;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: #55526a;
  font-variant-numeric: tabular-nums;

  .note-dot {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .summary-values { overflow-wrap: anywhere; }

  &.last { color: #146c4a; }
}

.eye {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 20px;
  margin-right: 2px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #b4b0c4;
  font-size: 14px;
  cursor: pointer;

  &.on { color: var(--dot); background: #f5f3ff; }
  &:hover { background: #f1eff7; }
  &:disabled { cursor: default; }
}

// Candidates of a card: tap to cross off.
.notes {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 3px;
  padding-top: 5px;
  border-top: 1px solid #eeebf5;
  cursor: default;
}

.note-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;

  .note-dot {
    flex: none;
    width: 8px;
    height: 8px;
    margin-right: 2px;
    border-radius: 50%;
  }
}

.cand {
  min-width: 22px;
  height: 20px;
  padding: 0 5px;
  border: 1px solid #e1ddec;
  border-radius: 6px;
  background: #fff;
  color: #3d3a52;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;

  &:hover { border-color: #b9b2d3; }
  &.crossed { color: #c2bfd0; text-decoration: line-through; text-decoration-color: #d14343; text-decoration-thickness: 2px; }
  &.last { background: #e3f5ec; border-color: #1f9d6b; color: #146c4a; }
  &:disabled { cursor: default; }
}

.disabled .card,
.disabled .value-token { cursor: default; }

.ghost {
  position: fixed;
  z-index: 1100;
  transform: translate(-50%, -50%) rotate(-3deg);
  box-shadow: 0 10px 24px rgba(91, 63, 196, 0.25);
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
    cursor: help;
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

// --- Full-screen layout --------------------------------------------------------
.clue-pad.wide {
  display: grid;
  grid-template-columns: minmax(240px, 330px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.clue-list {
  position: sticky;
  top: 0;
  max-height: calc(100vh - 90px);
  overflow-y: auto;
  padding-right: 4px;

  .clue-list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;

    .source-title { width: auto; }
  }

  .head-buttons {
    display: flex;
    gap: 6px;
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    font-size: 13.5px;
    line-height: 1.4;
    color: #3d3a52;

    &.on { background: #f5f3ff; }
  }

  .clue-token { flex: none; }
}

@media (max-width: 768px) {
  .clue-pad.wide { grid-template-columns: 1fr; }

  .clue-list {
    position: static;
    max-height: 32vh;
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
