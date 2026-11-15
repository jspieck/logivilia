<template>
  <div class="overviewPage">
    <div class="overview-head">
      <h2 class="tableTitle">{{ title }}</h2>
      <input
        v-model="search"
        type="search"
        class="autocomplete-input overview-search"
        :placeholder="t('overview.search')"
        :aria-label="t('overview.search')"
        spellcheck="false"
      >
    </div>

    <o-table
      v-model:current-page="currentPage"
      :data="rows"
      paginated
      :per-page="perPage"
      :aria-next-label="t('table.next')"
      :aria-previous-label="t('table.previous')"
      :aria-page-label="t('table.page')"
      :aria-current-label="t('table.current')"
    >
      <o-table-column field="name" :label="t('overview.name')" v-slot="props" sortable>
        <router-link :to="`/puzzle/${props.row.id}`" class="navLink">{{ props.row.name }}</router-link>
      </o-table-column>
      <o-table-column field="difficulty" :label="t('overview.difficulty')" v-slot="props" sortable>
        {{ props.row.difficulty }}
      </o-table-column>
      <template v-if="showSize">
        <o-table-column field="width" :label="t('overview.width')" v-slot="props" sortable>
          {{ props.row.width }}
        </o-table-column>
        <o-table-column field="height" :label="t('overview.height')" v-slot="props" sortable>
          {{ props.row.height }}
        </o-table-column>
        <o-table-column field="numColor" :label="t('overview.colors')" v-slot="props" sortable>
          {{ props.row.numColor }}
        </o-table-column>
      </template>
      <o-table-column field="avgRating" :label="t('overview.rating')" v-slot="props" sortable>
        <StarRating :model-value="props.row.avgRating || 0" :max="5" disabled />
      </o-table-column>
      <o-table-column field="date" :label="t('overview.date')" v-slot="props" sortable>
        <span class="tag is-light">{{ new Date(props.row.date).toLocaleDateString(locale) }}</span>
      </o-table-column>
      <o-table-column field="solved" :label="t('overview.status')" v-slot="props" sortable>
        <span v-if="props.row.solved" class="tag is-success">{{ t('overview.solved') }}</span>
        <span v-else class="tag is-danger is-light">{{ t('overview.unsolved') }}</span>
      </o-table-column>

      <template #empty>
        <p class="overview-empty">{{ loading ? t('overview.loading') : t('overview.empty') }}</p>
      </template>

      <!-- Rendered on the left of Oruga's page buttons. -->
      <template #bottom-left>
        <div class="table-controls">
          <label class="control">
            {{ t('table.perPage') }}
            <select v-model.number="perPage">
              <option v-for="n in PAGE_SIZES" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
          <span class="range">{{ t('table.range', range) }}</span>
          <form v-if="pageCount > 1" class="control" @submit.prevent="jump">
            <label :for="jumpId">{{ t('table.goTo') }}</label>
            <input :id="jumpId" v-model.number="jumpTo" type="number" min="1" :max="pageCount" :placeholder="`1–${pageCount}`">
            <button type="submit" class="button is-small">{{ t('table.go') }}</button>
          </form>
        </div>
      </template>
    </o-table>
  </div>
</template>

<script setup>
// Shared table for the nonogram, linelog and logical overview pages:
// search by name, sortable columns, page size (remembered per browser),
// "x–y of n" and jump to page.

import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePuzzleList } from '@/puzzles/usePuzzleList'

const props = defineProps({
  type: { type: String, required: true },
  title: { type: String, required: true },
  showSize: { type: Boolean, default: false }
})

const { t, locale } = useI18n()
const route = useRoute()
const { puzzles, isSolved, loading } = usePuzzleList(props.type)

const PAGE_SIZES = [10, 25, 50, 100]
const PAGE_SIZE_KEY = 'logivilia:pageSize'
const jumpId = `jump-${props.type}`

function storedPageSize () {
  try {
    const n = Number(localStorage.getItem(PAGE_SIZE_KEY))
    if (PAGE_SIZES.includes(n)) return n
  } catch { /* storage unavailable */ }
  return 10
}

const search = ref('')
const currentPage = ref(1)
const perPage = ref(storedPageSize())
const jumpTo = ref(null)

const rows = computed(() => {
  const query = search.value.trim().toLowerCase()
  return puzzles.value
    .filter(p => !query || p.name.toLowerCase().includes(query))
    .map(p => ({ ...p, solved: isSolved(p.id) }))
})

const pageCount = computed(() => Math.max(1, Math.ceil(rows.value.length / perPage.value)))

const range = computed(() => {
  const total = rows.value.length
  const from = total ? (currentPage.value - 1) * perPage.value + 1 : 0
  return { from, to: Math.min(total, currentPage.value * perPage.value), total }
})

function jump () {
  const page = Math.round(Number(jumpTo.value))
  if (!page) return
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value)
  jumpTo.value = null
}

watch(search, () => { currentPage.value = 1 })
watch(perPage, (n) => {
  currentPage.value = 1
  try { localStorage.setItem(PAGE_SIZE_KEY, String(n)) } catch { /* ignore */ }
})
watch(pageCount, (n) => { if (currentPage.value > n) currentPage.value = n })

// The home page links here with ?search=...
watch(() => route.query.search, (value) => {
  if (typeof value === 'string') search.value = value
}, { immediate: true })
</script>

<style lang="scss" scoped>
.overviewPage {
  padding: 28px 24px 32px;
}

.overview-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  margin-bottom: 20px;
}

.tableTitle {
  margin: 0;
}

.overview-search {
  margin: 0;
  max-width: 320px;
}

.overview-empty {
  padding: 24px 0;
  text-align: center;
  color: #6b7280;
}

.table-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  font-size: 0.9rem;
  color: #4b5563;

  .control {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
  }

  select, input {
    height: 2.2em;
    margin: 0;
    padding: 0 6px;
    border: 1px solid #dbdbdb;
    border-radius: 6px;
    background: #fff;
    font: inherit;
  }

  input {
    width: 5.5em;
  }

  .range {
    font-variant-numeric: tabular-nums;
  }
}

@media (max-width: 600px) {
  .overviewPage {
    padding: 20px 4px;
  }

  .overview-search {
    max-width: none;
  }
}
</style>
