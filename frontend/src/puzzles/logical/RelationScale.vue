<template>
  <div class="relation-scale" :class="{ disabled }">
    <div ref="trackBox" class="track-box">
      <div class="track" :style="{ width: `${trackWidth}px`, height: `${height}px` }">
        <svg class="arcs" :width="trackWidth" :height="height" aria-hidden="true">
          <line class="axis" :x1="PAD" :x2="trackWidth - PAD" :y1="axisY" :y2="axisY" />
          <g v-for="arc in arcs" :key="arc.id" :class="['arc', arc.state, { hot: arc.hot }]">
            <path :d="arc.path" />
            <polyline :points="arc.head" />
            <polyline v-if="arc.tail" :points="arc.tail" />
          </g>
        </svg>

        <span
          v-for="arc in arcs"
          :key="`l${arc.id}`"
          class="arc-label"
          :class="arc.state"
          :style="{ left: `${arc.labelX}px`, top: `${arc.labelY}px` }"
        >{{ arc.label }}<template v-if="arc.state === 'ok'"> ✓</template><template v-else-if="arc.state === 'bad'"> ✗</template></span>

        <button
          v-for="slot in slots"
          :key="`s${slot.index}`"
          type="button"
          class="slot"
          :class="{ possible: slot.possible, impossible: slot.impossible }"
          :style="{ left: `${slot.x}px`, top: `${axisY}px` }"
          :data-slot="slot.index"
          :disabled="disabled"
          :aria-label="t('logical.scalePlaceOn', { value: slot.label })"
          @click="placeSelected(slot.index)"
        >
          <span class="slot-dot" />
          <span class="slot-label">{{ slot.label }}</span>
        </button>

        <button
          v-for="token in placedTokens"
          :key="token.key"
          type="button"
          class="token placed"
          :class="{ selected: selected === token.key, hot: token.hot, dragging: drag?.key === token.key && drag.moved }"
          :style="{ ...token.style, left: `${token.x}px`, top: `${token.y}px`, maxWidth: `${slotWidth - 6}px` }"
          :title="token.label"
          :disabled="disabled"
          @pointerdown="startDrag($event, token)"
          @click="clickToken(token)"
        >{{ token.label }}</button>
      </div>
    </div>

    <p v-if="attribute.ordered === 'numeric' && !layout.toScale" class="scale-note">{{ t('logical.scaleNotToScale') }}</p>

    <div class="tray" data-tray="1" :class="{ target: !!activeKey && isPlaced(activeKey) }" @click="trayClick">
      <span class="tray-title">{{ t('logical.scaleUnplaced') }}</span>
      <template v-for="group in trayGroups" :key="group.attr">
        <button
          v-for="token in group.tokens"
          :key="token.key"
          type="button"
          class="token"
          :class="{ selected: selected === token.key, hot: token.hot, dragging: drag?.key === token.key && drag.moved }"
          :style="token.style"
          :disabled="disabled"
          @pointerdown="startDrag($event, token)"
          @click.stop="clickToken(token)"
        >{{ token.label }}</button>
      </template>
      <span v-if="!trayGroups.length" class="tray-empty">{{ t('logical.scaleAllPlaced') }}</span>
    </div>

    <span
      v-if="drag && drag.moved"
      class="token ghost"
      :style="{ ...drag.style, left: `${drag.x}px`, top: `${drag.y}px` }"
    >{{ drag.label }}</span>

    <ul v-if="listed.length" class="scale-relations">
      <li v-for="item in listed" :key="item.id" :class="item.state">
        <RelationChips :relation="item.relation" :attributes="attributes" />
        <span class="state-badge">{{ t(`logical.scaleState.${item.state}`) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
// The Skala scratch pad for one ordered category (see
// shared/puzzles/logicalScale.js). Values of the other categories are
// dragged (or tapped, then a slot tapped) onto the slots; arcs show the
// relations of the clues along this category, green when they hold and red
// when not. While a value is picked up, the slots it cannot go to are dimmed.
// Only a scratch pad: it does not touch the grid or the answer table.

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import RelationChips from './RelationChips.vue'
import { categoryColor } from './categoryColors'
import { valueLabel } from './describeRule'
import {
  tokenKey, scaleRelations, relationRefs, slotOf, relationState, possibleSlots, slotPositions
} from '@shared/puzzles/logicalScale.js'

const props = defineProps({
  attributes: { type: Array, required: true },
  relations: { type: Array, default: () => [] },
  cat: { type: Number, required: true },
  placement: { type: Object, required: true },
  hot: { type: Object, default: () => new Set() },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:placement'])
const { t } = useI18n()

const PAD = 48
const SLOT_MIN = 84
const TOKEN_H = 26
const ARC_SPACE = 78

// --- Layout ----------------------------------------------------------------
const trackBox = ref(null)
const boxWidth = ref(600)
let observer = null
onMounted(() => {
  observer = new ResizeObserver(([entry]) => { boxWidth.value = entry.contentRect.width })
  observer.observe(trackBox.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  endDrag()
})

const attribute = computed(() => props.attributes[props.cat])
const count = computed(() => attribute.value.values.length)
const trackWidth = computed(() => Math.max(boxWidth.value, PAD * 2 + (count.value - 1) * SLOT_MIN))
const inner = computed(() => trackWidth.value - PAD * 2)
const layout = computed(() => slotPositions(attribute.value, SLOT_MIN / inner.value))
const slotX = i => PAD + layout.value.positions[i] * inner.value
const slotWidth = computed(() => Math.min(160, layout.value.toScale
  ? SLOT_MIN
  : inner.value / Math.max(count.value - 1, 1)))

// Room for the tallest stack (at least one value), so the track grows as values are placed.
const maxStack = computed(() => {
  const heights = new Array(count.value).fill(0)
  for (const s of Object.values(props.placement)) heights[s] = (heights[s] || 0) + 1
  return Math.max(1, ...heights)
})
const axisY = computed(() => ARC_SPACE + maxStack.value * (TOKEN_H + 4) + 14)
const height = computed(() => axisY.value + 44)


// --- Tokens ----------------------------------------------------------------
const chipStyle = (attr) => {
  const c = categoryColor(attr)
  return { background: c.bg, color: c.fg }
}
const tokens = computed(() => props.attributes.flatMap((a, attr) => (attr === props.cat
  ? []
  : a.values.map(value => {
    const r = { attr, value: String(value) }
    return {
      ...r,
      key: tokenKey(r),
      label: valueLabel(r, props.attributes),
      style: chipStyle(attr),
      hot: props.hot.has(tokenKey(r))
    }
  }))))
const isPlaced = key => props.placement[key] !== undefined

const stackTop = computed(() => {
  const heights = new Array(count.value).fill(0)
  for (const token of tokens.value) {
    const s = props.placement[token.key]
    if (s !== undefined) heights[s] += 1
  }
  return heights.map(h => axisY.value - 16 - h * (TOKEN_H + 4))
})

const placedTokens = computed(() => {
  const level = new Array(count.value).fill(0)
  return tokens.value.filter(token => isPlaced(token.key)).map((token) => {
    const s = props.placement[token.key]
    level[s] += 1
    return { ...token, x: slotX(s), y: axisY.value - 14 - level[s] * (TOKEN_H + 4) }
  })
})

const trayGroups = computed(() => {
  const groups = []
  for (const token of tokens.value) {
    if (isPlaced(token.key)) continue
    let group = groups.find(g => g.attr === token.attr)
    if (!group) groups.push(group = { attr: token.attr, tokens: [] })
    group.tokens.push(token)
  }
  return groups
})

// --- Relations ---------------------------------------------------------------
const OP = { before: '<', after: '>', directlyBefore: '<', directlyAfter: '>', nextTo: '↔' }
const opLabel = (r) => {
  if (r.type === 'differsBy') return `${r.abs ? '±' : r.offset > 0 ? '+' : '−'}${String(Math.abs(r.offset)).replace('.', ',')}`
  if (r.type === 'times') return `×${String(r.factor).replace('.', ',')}`
  if (r.type === 'sum') return '+'
  if (r.type === 'directlyBefore' || r.type === 'directlyAfter') return `${t('relations.directly')} ${OP[r.type]}`
  return OP[r.type] || '?'
}

const mine = computed(() => scaleRelations(props.relations, props.cat))
const listed = computed(() => mine.value.map((relation, id) => ({
  id, relation, state: relationState(relation, props.attributes, props.cat, props.placement)
})))

const arcs = computed(() => listed.value.flatMap(({ id, relation: r, state }) => {
  if (state === 'open' || r.type === 'sum') return []
  const [sa, sb] = relationRefs(r).map(x => slotOf(x, props.attributes, props.cat, props.placement))
  const xa = slotX(sa)
  const xb = slotX(sb)
  const ya = stackTop.value[sa]
  const yb = stackTop.value[sb]
  const apex = Math.min(ya, yb) - 18 - Math.min(40, Math.abs(xb - xa) * 0.1)
  const both = r.type === 'nextTo' || (r.type === 'differsBy' && r.abs)
  const hot = relationRefs(r).some(x => props.hot.has(tokenKey(x)))
  if (sa === sb) {
    return [{ id, state, hot, label: opLabel(r), path: '', head: '', labelX: xa, labelY: ya - 30 }]
  }
  return [{
    id,
    state,
    hot,
    label: opLabel(r),
    path: `M${xa} ${ya}C${xa} ${apex},${xb} ${apex},${xb} ${yb}`,
    head: `${xb - 4},${yb - 7} ${xb},${yb} ${xb + 4},${yb - 7}`,
    tail: both ? `${xa - 4},${ya - 7} ${xa},${ya} ${xa + 4},${ya - 7}` : '',
    labelX: (xa + xb) / 2,
    labelY: (ya + yb) / 8 + apex * 0.75 - 12
  }]
}))

// --- Picking up and placing ----------------------------------------------------
const selected = ref(null)
const drag = ref(null)
const activeKey = computed(() => drag.value?.key || selected.value)

const possible = computed(() => {
  const key = activeKey.value
  if (!key) return null
  const token = tokens.value.find(x => x.key === key)
  return token ? possibleSlots(token, props.relations, props.attributes, props.cat, props.placement) : null
})

const slots = computed(() => attribute.value.values.map((value, index) => ({
  index,
  label: String(value),
  x: slotX(index),
  possible: !!possible.value && possible.value[index],
  impossible: !!possible.value && !possible.value[index]
})))

const place = (key, slot) => {
  const token = tokens.value.find(x => x.key === key)
  if (!token) return
  const next = { ...props.placement }
  // One value per category on a slot: the one there goes back to the tray.
  for (const [k, s] of Object.entries(next)) {
    if (s === slot && k !== key && Number(k.split(':')[0]) === token.attr) delete next[k]
  }
  next[key] = slot
  emit('update:placement', next)
}
const unplace = (key) => {
  const next = { ...props.placement }
  delete next[key]
  emit('update:placement', next)
}

const clickToken = (token) => {
  if (props.disabled || justDragged) return
  selected.value = selected.value === token.key ? null : token.key
}
const placeSelected = (slot) => {
  if (!selected.value) return
  place(selected.value, slot)
  selected.value = null
}
const trayClick = () => {
  if (selected.value && isPlaced(selected.value)) {
    unplace(selected.value)
    selected.value = null
  }
}

let justDragged = false
const onMove = (event) => {
  const d = drag.value
  if (!d) return
  if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < 5) return
  drag.value = { ...d, moved: true, x: event.clientX, y: event.clientY }
}
const onUp = (event) => {
  const d = drag.value
  endDrag()
  if (!d || !d.moved) return
  justDragged = true
  setTimeout(() => { justDragged = false }, 0)
  selected.value = null
  const target = document.elementFromPoint(event.clientX, event.clientY)
  const slot = target?.closest('[data-slot]')
  if (slot) place(d.key, Number(slot.dataset.slot))
  else if (target?.closest('[data-tray]')) unplace(d.key)
}
function endDrag () {
  drag.value = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', endDrag)
}
const startDrag = (event, token) => {
  if (props.disabled || event.button !== 0) return
  drag.value = { key: token.key, label: token.label, style: token.style, startX: event.clientX, startY: event.clientY, moved: false, x: 0, y: 0 }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', endDrag)
}
</script>

<style lang="scss" scoped>
.relation-scale {
  position: relative;
}

.track-box {
  overflow-x: auto;
}

.track {
  position: relative;
}

.arcs {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.axis {
  stroke: #d9d5e6;
  stroke-width: 2;
}

.arc {
  stroke-width: 2;

  &.ok { stroke: #1f9d6b; }
  &.bad { stroke: #d14343; stroke-dasharray: 5 5; }
  &.bad polyline { stroke-dasharray: none; }
  &.hot { stroke-width: 3; }
}

.arc-label {
  position: absolute;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  pointer-events: none;

  &.ok { background: #e3f5ec; color: #146c4a; }
  &.bad { background: #fdecec; color: #a12a2a; }
}

.slot {
  position: absolute;
  transform: translate(-50%, -9px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 44px;
  padding: 0 4px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;

  .slot-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    box-sizing: border-box;
    background: #fff;
    border: 2px solid #c9c4da;
    transition: background-color 0.15s, border-color 0.15s;
  }

  .slot-label {
    font-size: 13px;
    font-weight: 700;
    color: #3d3a52;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &.possible .slot-dot {
    background: #7957d5;
    border: 3px solid #d9cefb;
  }

  &.impossible {
    .slot-dot { border-style: dashed; border-color: #cfcbdc; }
    .slot-label { color: #b4b0c6; text-decoration: line-through; }
  }

  &:disabled { cursor: default; }
}

.token {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: grab;
  // In the tray a swipe still scrolls the page (on touch: tap, then tap a slot).
  touch-action: manipulation;
  user-select: none;

  &.placed {
    touch-action: none;
    position: absolute;
    transform: translateX(-50%);
    box-shadow: 0 1px 0 rgba(31, 29, 43, 0.08);
  }

  &.selected { outline: 2px solid #7957d5; outline-offset: 2px; }
  &.hot { box-shadow: 0 0 0 2px #7957d5; }
  &.dragging { opacity: 0.35; }
  &:disabled { cursor: default; }
}

.ghost {
  position: fixed;
  z-index: 50;
  transform: translate(-50%, -50%) rotate(-3deg);
  border: 1.5px dashed #7957d5;
  box-shadow: 0 10px 24px rgba(91, 63, 196, 0.18);
  pointer-events: none;
}

.scale-note {
  margin: 0;
  font-size: 12px;
  color: #8b879e;
}

.tray {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 10px 12px;
  border: 1.5px dashed transparent;
  border-radius: 12px;
  background: #f6f5fa;
  transition: border-color 0.15s;

  &.target { border-color: #7957d5; }

  .tray-title {
    margin-right: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #6b6880;
  }

  .tray-empty {
    font-size: 13px;
    color: #8b879e;
  }
}

.scale-relations {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  li {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 14px;
  }

  .state-badge {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: #f1eff7;
    color: #55526a;
  }

  .ok .state-badge { background: #e3f5ec; color: #146c4a; }
  .bad .state-badge { background: #fdecec; color: #a12a2a; }
}
</style>
