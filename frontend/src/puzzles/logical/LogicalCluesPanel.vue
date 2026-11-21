<script setup>
// Clues (click to cross off, optional relation chips) and the categories
// with their values.

import { useI18n } from 'vue-i18n'
import Toggle from '@/components/Toggle.vue'
import RelationChips from './RelationChips.vue'
import { categoryColor } from './categoryColors'

const { t } = useI18n()
const props = defineProps({
  clues: { type: Array, default: () => [] },
  attributes: { type: Array, required: true },
  doneClues: { type: Set, required: true },
  // Map: clue index -> relations (see LogicalDisplay).
  relationsByClue: { type: Map, required: true }
})
const emit = defineEmits(['toggle-clue', 'focus-clue'])
const showRelations = defineModel('showRelations', { type: Boolean, default: false })

const hasRelations = () => props.relationsByClue.size > 0
const relationsOf = i => props.relationsByClue.get(i) || []
const chipStyle = (attrIndex) => {
  if (!hasRelations()) return null
  const c = categoryColor(attrIndex)
  return { background: c.bg, color: c.fg, borderColor: 'transparent' }
}
</script>

<template>
  <div class="info-columns">
    <section class="card clues-section">
      <div class="section-head">
        <h3>{{ t('logical.clues') }}</h3>
        <label v-if="hasRelations()" class="toggle-container">
          <span>{{ t('logical.showRelations') }}</span>
          <Toggle v-model="showRelations" />
        </label>
      </div>
      <ol class="clues-list">
        <li
          v-for="(clue, i) in clues"
          :key="`clue${i}`"
          class="clue"
          :class="{ done: doneClues.has(i) }"
          :title="t('logical.clueDoneTitle')"
          @click="emit('toggle-clue', i)"
          @mouseenter="emit('focus-clue', i)"
          @mouseleave="emit('focus-clue', null)"
        >
          <span class="clue-number">{{ i + 1 }}</span>
          <div class="clue-body">
            <span class="clue-text">{{ clue }}</span>
            <div v-if="showRelations && relationsOf(i).length" class="clue-relations" @click.stop>
              <RelationChips
                v-for="(relation, k) in relationsOf(i)"
                :key="k"
                :relation="relation"
                :attributes="attributes"
              />
            </div>
          </div>
        </li>
      </ol>
      <p class="hint-text">
        {{ t('logical.clueHelp') }}
        <template v-if="hasRelations() && showRelations">{{ t('logical.relationsHelp') }}</template>
      </p>
    </section>

    <section class="card attributes-section">
      <h3>{{ t('logical.attributes') }}</h3>
      <dl class="attributes-list">
        <template v-for="(attr, i) in attributes" :key="`attr${i}`">
          <dt>{{ attr.name }}</dt>
          <dd>
            <span v-for="(v, j) in attr.values" :key="`attr${i}_${j}`" class="chip" :style="chipStyle(i)">{{ v }}</span>
          </dd>
        </template>
      </dl>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@import './logical.scss';

.info-columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 20px;
  margin-bottom: 28px;
}

.card {
  padding: 16px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafbfc;
}

.clues-list {
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: none;
}

.clue-body {
  flex: 1;
  min-width: 0;
}

.clue-relations {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e4e0ef;
  cursor: default;
}

.clue {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 6px 8px;
  margin: 0 -8px 2px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s, color 0.15s;

  &:hover { background: #eef2f7; }

  .clue-number {
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

  &.done {
    color: #9ca3af;

    .clue-text { text-decoration: line-through; }
    .clue-relations { opacity: 0.55; }
    .clue-number { background: #e5e7eb; color: #9ca3af; }
  }
}

.attributes-list {
  margin: 0;

  dt {
    font-weight: 600;
    color: #374151;
    margin-top: 8px;

    &:first-child { margin-top: 0; }
  }

  dd {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 4px 0 0;
  }

  .chip {
    padding: 1px 9px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid #dfe3e8;
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .info-columns {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 20px;
  }

  .card {
    padding: 12px;
  }
}
</style>
