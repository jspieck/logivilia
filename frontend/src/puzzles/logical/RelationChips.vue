<template>
  <div v-if="oneOf" class="relation" :title="sentence" :aria-label="sentence" role="img">
    <span class="value-chip" :style="chipStyle(oneOf.a)"><span class="dot" />{{ label(oneOf.a) }}</span>
    <span class="sign">=</span>
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

  <div v-else-if="oriented" class="relation" :title="sentence" :aria-label="sentence" role="img">
    <span class="value-chip" :style="chipStyle(oriented.left)"><span class="dot" />{{ label(oriented.left) }}</span>
    <!-- Smaller -> bigger: a slim arrow with the gap written above it; a
         double arrow when there is no direction ("5 apart", neighbours). -->
    <span class="line-arrow" :class="{ sym: oriented.sym }" :style="arrowStyle">
      <span class="arrow-text">{{ arrowText }}</span>
      <span class="shaft" />
    </span>
    <span class="value-chip" :style="chipStyle(oriented.right)"><span class="dot" />{{ label(oriented.right) }}</span>
  </div>

  <div v-else class="relation" :title="sentence" :aria-label="sentence" role="img">
    <span class="value-chip" :style="chipStyle(relation.a)"><span class="dot" />{{ label(relation.a) }}</span>
    <template v-if="relation.type === 'sum'">
      <span class="sign">+</span>
      <span class="value-chip" :style="chipStyle(relation.b)"><span class="dot" />{{ label(relation.b) }}</span>
    </template>
    <span class="sign" :class="{ danger: relation.type === 'notSame' }">{{ relation.type === 'notSame' ? '≠' : '=' }}</span>
    <span class="value-chip" :style="chipStyle(relation.type === 'sum' ? relation.c : relation.b)"><span class="dot" />{{ label(relation.type === 'sum' ? relation.c : relation.b) }}</span>
    <template v-if="relation.type === 'eitherOr'">
      <span class="word or-word">{{ t('relations.or') }}</span>
      <span class="value-chip" :style="chipStyle(relation.c)"><span class="dot" />{{ label(relation.c) }}</span>
    </template>
  </div>
</template>

<script setup>
// One formal relation of a Logikrätsel clue (logical.js publicRelations) as
// chips. Chips take their category's colour (categoryColor). Comparisons are
// always written smaller-first, [A] ──+5 Seiten──▶ [B], as a big arrow in the
// colour of the compared category with the gap on it (orientRelation), so
// clues chain: A → B, B → C. "Same" and "not same" are just = and ≠.

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { describeRule, valueLabel } from './describeRule'
import { categoryColor } from './categoryColors'
import { orientRelation, orientText } from './orientRelation'

defineOptions({ name: 'RelationChips' })

const props = defineProps({
  relation: { type: Object, required: true },
  attributes: { type: Array, required: true }
})

const { t } = useI18n()

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

const oriented = computed(() => orientRelation(props.relation))
const arrowText = computed(() => orientText(oriented.value, props.attributes[props.relation.by], t))
const arrowStyle = computed(() => {
  const c = categoryColor(props.relation.by)
  return { '--rel-bg': c.bg, '--rel-fg': c.fg, '--rel-dot': c.dot }
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

// = and ≠ between two chips, no line needed.
.sign {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  color: #8b879e;
  padding: 0 2px;

  &.danger { color: #c2410c; }
}

// Slim arrow between two chips, smaller -> bigger, the gap written above it.
// An empty line of the text's height below keeps the shaft at the middle of
// the chips. .sym: heads on both ends.
$head: 9px;

.line-arrow {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 64px;

  &::after {
    content: '';
    height: 14px;
  }

  .arrow-text {
    height: 14px;
    padding: 0 6px;
    text-align: center;
    font-size: 11.5px;
    font-weight: 700;
    line-height: 14px;
    color: var(--rel-fg);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .shaft {
    height: 9px;
    background: var(--rel-dot);
    clip-path: polygon(0 41%, calc(100% - #{$head}) 41%, calc(100% - #{$head}) 0, 100% 50%, calc(100% - #{$head}) 100%, calc(100% - #{$head}) 59%, 0 59%);
  }

  &.sym .shaft {
    clip-path: polygon(0 50%, $head 0, $head 41%, calc(100% - #{$head}) 41%, calc(100% - #{$head}) 0, 100% 50%, calc(100% - #{$head}) 100%, calc(100% - #{$head}) 59%, $head 59%, $head 100%);
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
