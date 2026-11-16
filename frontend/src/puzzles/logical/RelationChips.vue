<template>
  <div v-if="oneOf" class="relation" :title="sentence" :aria-label="sentence" role="img">
    <span class="value-chip" :style="chipStyle(oneOf.a)"><span class="dot" />{{ label(oneOf.a) }}</span>
    <span class="connector" :style="{ '--rel': NEUTRAL }">
      <span class="op">=</span>
      <svg width="88" height="10" viewBox="0 0 88 10" aria-hidden="true"><line x1="3" y1="5" x2="85" y2="5" /></svg>
      <span class="sub">{{ t('relations.same') }}</span>
    </span>
    <template v-for="(option, k) in oneOf.options" :key="k">
      <span v-if="k > 0" class="word or-word">{{ t('relations.or') }}</span>
      <span class="value-chip" :style="chipStyle(option)"><span class="dot" />{{ label(option) }}</span>
    </template>
  </div>

  <div v-else-if="relation.type === 'anyOf'" class="relation-group">
    <span class="group-tag">{{ t('relations.oneOf') }}</span>
    <template v-for="(option, k) in relation.rules" :key="k">
      <span v-if="k > 0" class="or-word">{{ t('relations.or') }}</span>
      <RelationChips :relation="option" :attributes="attributes" />
    </template>
  </div>

  <div v-else class="relation" :title="sentence" :aria-label="sentence" role="img">
    <span class="value-chip" :style="chipStyle(relation.a)"><span class="dot" />{{ label(relation.a) }}</span>
    <template v-if="relation.type === 'sum'">
      <span class="word">+</span>
      <span class="value-chip" :style="chipStyle(relation.b)"><span class="dot" />{{ label(relation.b) }}</span>
    </template>
    <span class="connector" :style="{ '--rel': op.color }">
      <span class="op">{{ op.text }}</span>
      <svg width="88" height="10" viewBox="0 0 88 10" aria-hidden="true">
        <line x1="3" y1="5" x2="85" y2="5" :stroke-dasharray="op.dashed ? '4 4' : null" />
        <polyline v-if="op.head" points="79,1 85,5 79,9" />
        <polyline v-if="op.tail" points="9,1 3,5 9,9" />
      </svg>
      <span class="sub">{{ op.sub }}</span>
    </span>
    <span class="value-chip" :style="chipStyle(relation.type === 'sum' ? relation.c : relation.b)"><span class="dot" />{{ label(relation.type === 'sum' ? relation.c : relation.b) }}</span>
    <template v-if="relation.type === 'eitherOr'">
      <span class="word or-word">{{ t('relations.or') }}</span>
      <span class="value-chip" :style="chipStyle(relation.c)"><span class="dot" />{{ label(relation.c) }}</span>
    </template>
  </div>
</template>

<script setup>
// One formal relation of a Logikrätsel clue (logical.js publicRelations) as
// chips: [value] —operator→ [value]. Chips take their category's colour
// (categoryColor); the arrow points away from the value the clue is about,
// so "A —+5→ B" reads "A has 5 more than B".

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { describeRule, valueLabel } from './describeRule'
import { categoryColor } from './categoryColors'
import { orderMode } from '@shared/puzzles/logicalSolver.js'

defineOptions({ name: 'RelationChips' })

const props = defineProps({
  relation: { type: Object, required: true },
  attributes: { type: Array, required: true }
})

const { t } = useI18n()

const NEUTRAL = '#8b879e'
const DANGER = '#c2410c'

const label = ref => valueLabel(ref, props.attributes)
const chipStyle = (ref) => {
  const c = categoryColor(ref?.attr)
  return { '--chip-bg': c.bg, '--chip-fg': c.fg, '--chip-dot': c.dot }
}
const sentence = computed(() => describeRule(props.relation, props.attributes, t))

// "a belongs to one of b1, b2, ...": an anyOf of `same` rules about one value,
// drawn as one row instead of a group.
const oneOf = computed(() => {
  const r = props.relation
  if (r.type !== 'anyOf' || !r.rules?.length) return null
  const [first] = r.rules
  const sameA = rule => rule.type === 'same' && rule.a?.attr === first.a?.attr && rule.a?.value === first.a?.value
  return r.rules.every(sameA) ? { a: first.a, options: r.rules.map(rule => rule.b) } : null
})

// Unit after the numbers of a numeric category ("5€" -> "€"), if all agree.
const unitOf = (attribute) => {
  if (orderMode(attribute) !== 'numeric') return ''
  const units = new Set(attribute.values.map(v => String(v).replace(/^[^\d-]*-?[\d.,]+\s*/, '').trim()))
  const [unit] = units
  return units.size === 1 && unit && unit.length <= 3 ? unit : ''
}

const format = n => String(n).replace('.', ',')

const op = computed(() => {
  const r = props.relation
  const by = props.attributes[r.by]
  const cat = by?.name?.trim() || ''
  const color = r.by != null ? categoryColor(r.by).dot : NEUTRAL
  const unit = by ? unitOf(by) : ''
  const withUnit = text => (unit ? `${text} ${unit}` : text)
  const ordered = (text, extra = {}) => ({ text, sub: cat, color, head: true, tail: false, dashed: false, ...extra })
  switch (r.type) {
    case 'same': return { text: '=', sub: t('relations.same'), color: NEUTRAL, head: false, tail: false }
    case 'eitherOr': return { text: '=', sub: t('relations.same'), color: NEUTRAL, head: false, tail: false }
    case 'notSame': return { text: '≠', sub: t('relations.notSame'), color: DANGER, head: false, tail: false, dashed: true }
    case 'before': return ordered('<')
    case 'after': return ordered('>')
    case 'directlyBefore': return ordered(`${t('relations.directly')} <`)
    case 'directlyAfter': return ordered(`${t('relations.directly')} >`)
    case 'nextTo': return ordered(t('relations.nextTo'), { tail: true })
    case 'differsBy': {
      const n = format(Math.abs(r.offset))
      if (r.abs) return ordered(withUnit(`±${n}`), { tail: true })
      return ordered(withUnit(`${r.offset > 0 ? '+' : '−'}${n}`))
    }
    case 'times': return ordered(`×${format(r.factor)}`)
    case 'sum': return ordered('=', { head: false })
    default: return { text: '?', sub: '', color: NEUTRAL }
  }
})
</script>

<style lang="scss" scoped>
.relation {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
}

.value-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 8px;
  border-radius: 999px;
  background: var(--chip-bg);
  color: var(--chip-fg);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--chip-dot);
  }
}

.connector {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  min-width: 88px;
  color: var(--rel);

  .op {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .sub {
    font-size: 11px;
    font-weight: 600;
    color: #6b6880;
    line-height: 1.1;
    white-space: nowrap;
  }

  svg {
    display: block;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.word {
  font-size: 13px;
  font-weight: 700;
  color: #55526a;
}

.or-word {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8b879e;
}

.relation-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 6px 10px 8px;
  border: 1.5px dashed #c9c4da;
  border-radius: 12px;

  .group-tag {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8b879e;
  }
}
</style>
