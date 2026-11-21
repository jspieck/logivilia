<script setup>
// The player's answer: one row per value of the first category, a select
// per other category. Answers are keyed "i_j" (row i, category j + 1).

import { useI18n } from 'vue-i18n'
import MySelect from '@/components/MySelect.vue'

const { t } = useI18n()
defineProps({
  attributes: { type: Array, required: true },
  solved: { type: Boolean, default: false }
})
const inputs = defineModel({ type: Object, required: true })
</script>

<template>
  <section class="solution-section">
    <h3>{{ t('logical.solution') }}</h3>
    <div class="solution-table">
      <table class="data-table">
        <thead>
          <tr>
            <th v-for="attr in attributes" :key="attr.name" scope="col">{{ attr.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(v, i) in attributes[0].values" :key="i">
            <th scope="row">{{ v }}</th>
            <td v-for="(attr, j) in attributes.slice(1)" :key="j" :data-title="attr.name">
              <MySelect
                :options="attr.values"
                :is-disabled="solved"
                v-model="inputs[i + '_' + j]"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@import './logical.scss';

.solution-table {
  overflow-x: auto;

  table {
    border-collapse: separate;
    border-spacing: 0;
    min-width: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  th, td {
    padding: 8px 12px;
    border-bottom: 1px solid #eef0f3;
    text-align: left;
    vertical-align: middle;
  }

  tbody tr:last-child th,
  tbody tr:last-child td { border-bottom: none; }

  thead th {
    background: #f3f4f6;
    color: #262664;
    font-weight: 600;
  }

  tbody th {
    font-weight: 600;
    background: #fafbfc;
    white-space: nowrap;
  }
}
</style>
