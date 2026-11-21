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

    <div class="overview-filters" role="group" :aria-label="t('overview.filters')">
      <label v-if="showSize" class="filter">
        <span>{{ t('overview.size') }}</span>
        <select v-model="filters.size">
          <option value="">{{ t('overview.any') }}</option>
          <option v-for="s in SIZES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>
      <label v-if="showSize" class="filter">
        <span>{{ t('overview.colors') }}</span>
        <select v-model="filters.colors">
          <option value="">{{ t('overview.any') }}</option>
          <option v-for="c in COLORS" :key="c" :value="c">{{ c === 4 ? '4+' : c }}</option>
        </select>
      </label>
      <label class="filter">
        <span>{{ t('overview.difficulty') }}</span>
        <select v-model="filters.difficulty">
          <option value="">{{ t('overview.any') }}</option>
          <option v-for="d in 5" :key="d" :value="d">{{ d }}</option>
        </select>
      </label>
      <label class="filter">
        <span>{{ t('overview.rating') }}</span>
        <select v-model="filters.rating">
          <option value="">{{ t('overview.any') }}</option>
          <option v-for="r in [2, 3, 4]" :key="r" :value="r">{{ t('overview.atLeastStars', { n: r }) }}</option>
        </select>
      </label>
      <label class="filter">
        <span>{{ t('overview.author') }}</span>
        <input v-model="filters.author" type="search" spellcheck="false" class="author-input">
      </label>
      <label v-if="isUserLoggedIn" class="filter filter-check">
        <input v-model="filters.unsolved" type="checkbox">
        <span>{{ t('overview.unsolvedOnly') }}</span>
      </label>
      <button v-if="hasFilters" type="button" class="button is-small is-light" @click="resetFilters">
        {{ t('overview.resetFilters') }}
      </button>
    </div>

    <o-table
      :key="tableKey"
      v-model:current-page="currentPage"
      :default-sort="tableSort"
      :data="rows"
      paginated
      backend-pagination
      backend-sorting
      :total="total"
      :per-page="perPage"
      :class="{ 'is-stale': loading }"
      :aria-next-label="t('table.next')"
      :aria-previous-label="t('table.previous')"
      :aria-page-label="t('table.page')"
      :aria-current-label="t('table.current')"
      @sort="onSort"
    >
      <o-table-column field="name" :label="t('overview.name')" v-slot="props" sortable>
        <router-link :to="{ path: `/puzzle/${props.row.id}`, query: linkQuery }" class="navLink">{{ props.row.name }}</router-link>
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
      <o-table-column field="solved" :label="t('overview.status')" v-slot="props" :sortable="isUserLoggedIn">
        <span v-if="props.row.solved" class="tag is-success">{{ t('overview.solved') }}</span>
        <span v-else class="tag is-danger is-light">{{ t('overview.unsolved') }}</span>
      </o-table-column>

      <template #empty>
        <p class="overview-empty">
          {{ loading ? t('overview.loading') : failed ? t('overview.failed') : t('overview.empty') }}
        </p>
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
// Shared table for the nonogram, linelog and logical overview pages. The
// server filters, sorts and paginates (GET /puzzles?page=...); this page
// only holds the controls: name search, filters (size, colours, difficulty,
// rating, author, unsolved only), sortable columns, page size (remembered
// per browser), "x–y of n" and jump to page.
//
// Search, filters, sorting and page live in the URL (../puzzles/listQuery.mjs),
// so a list can be shared and Back returns to it. Puzzle links carry the
// filters, so "next puzzle" on the puzzle page continues in this list.

import { ref, reactive, computed, watch, onActivated, onDeactivated } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store/store'
import { usePuzzleList } from '@/puzzles/usePuzzleList'
import {
  SIZES, COLORS, emptyFilters, readListQuery, toRouteQuery, toApiParams, sameQuery
} from '@/puzzles/listQuery'

const props = defineProps({
  type: { type: String, required: true },
  title: { type: String, required: true },
  showSize: { type: Boolean, default: false }
})

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const { isUserLoggedIn } = storeToRefs(useMainStore())

const PAGE_SIZES = [10, 25, 50, 100]
const PAGE_SIZE_KEY = 'logivilia:pageSize'
const TEXT_DELAY_MS = 300
const jumpId = `jump-${props.type}`

function storedPageSize () {
  try {
    const n = Number(localStorage.getItem(PAGE_SIZE_KEY))
    if (PAGE_SIZES.includes(n)) return n
  } catch { /* storage unavailable */ }
  return 10
}

const initial = readListQuery(route.query)
const search = ref(initial.q)
const filters = reactive({ ...initial.filters })
const currentPage = ref(initial.page)
const perPage = ref(storedPageSize())
const sort = ref({ ...initial.sort })
const jumpTo = ref(null)
// The sort the table shows its arrow for. Oruga reads it when the table is
// created and re-sorts (back to page 1) whenever the prop changes, so it is
// set only together with tableKey, which recreates the table: at the start
// and when the sort comes from the URL (Back/Forward).
const tableKey = ref(0)
const sortArrow = s => (s.field ? [s.field, s.order] : undefined)
const tableSort = ref(sortArrow(initial.sort))

// Typed text reaches the server (and the URL) only after a short pause.
const debounced = reactive({ q: initial.q, author: initial.filters.author })
let textTimer = null
watch([search, () => filters.author], ([q, author]) => {
  clearTimeout(textTimer)
  textTimer = setTimeout(() => {
    debounced.q = q.trim()
    debounced.author = author.trim()
  }, TEXT_DELAY_MS)
})

// Search, filters and sort as they go to the server and into the URL. The
// page is kept apart: the filter watcher below must not see page changes.
const listState = computed(() => ({
  q: debounced.q,
  filters: { ...filters, author: debounced.author },
  sort: sort.value
}))
const apiParams = computed(() => toApiParams(listState.value, isUserLoggedIn.value))
// Only the filters (a new sort resets the page in onSort).
const filterParams = computed(() => {
  const params = { ...apiParams.value }
  delete params.sort
  delete params.order
  return params
})

const query = computed(() => ({
  ...apiParams.value,
  page: currentPage.value,
  perPage: perPage.value
}))

const { rows, total, loading, failed } = usePuzzleList(props.type, query)

// Links to a puzzle carry the list's filters and sort (not the page).
const linkQuery = computed(() => toRouteQuery({ ...listState.value, page: 1 }, { withPage: false }))

const hasFilters = computed(() => Object.entries(filters).some(([key, value]) => value !== emptyFilters()[key]))

function resetFilters () {
  Object.assign(filters, emptyFilters())
}

function onSort (column, direction) {
  // Oruga also reports the initial sort from the URL; that is no change.
  if (sort.value.field === column.field && sort.value.order === direction) return
  sort.value = { field: column.field, order: direction }
  currentPage.value = 1
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const range = computed(() => {
  const from = total.value ? (currentPage.value - 1) * perPage.value + 1 : 0
  return { from, to: Math.min(total.value, currentPage.value * perPage.value), total: total.value }
})

function jump () {
  const page = Math.round(Number(jumpTo.value))
  if (!page) return
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value)
  jumpTo.value = null
}

// New filters start again on page 1 (page and size changes are not
// filters). 'sync', so the list loads once with page 1, not first with the
// old page.
watch(filterParams, () => { currentPage.value = 1 }, { deep: true, flush: 'sync' })
watch(perPage, (n) => {
  currentPage.value = 1
  try { localStorage.setItem(PAGE_SIZE_KEY, String(n)) } catch { /* ignore */ }
})
watch(pageCount, (n) => { if (!loading.value && currentPage.value > n) currentPage.value = n })

// --- URL sync --------------------------------------------------------------
// The overview stays alive (<keep-alive> in App.vue) while a puzzle is open;
// `route` then is the puzzle's, so the sync only runs while this page shows.
const ownPath = route.path
let active = true
onActivated(() => { active = true; applyUrl(route.query) })
onDeactivated(() => { active = false })
const onOwnPage = () => active && route.path === ownPath

const urlQuery = computed(() => toRouteQuery({ ...listState.value, page: currentPage.value }))

watch(urlQuery, (wanted) => {
  if (!onOwnPage() || sameQuery(wanted, route.query)) return
  router.replace({ query: wanted, hash: route.hash })
}, { immediate: true })

// Back/Forward, a link with other filters, or the home page's ?search=.
function applyUrl (routeQuery) {
  if (sameQuery(toRouteQuery(readListQuery(routeQuery)), urlQuery.value)) return
  const next = readListQuery(routeQuery)
  clearTimeout(textTimer)
  search.value = next.q
  debounced.q = next.q
  debounced.author = next.filters.author
  Object.assign(filters, next.filters)
  if (next.sort.field !== sort.value.field || next.sort.order !== sort.value.order) {
    sort.value = next.sort
    tableSort.value = sortArrow(next.sort)
    tableKey.value++
  }
  // After the filters: their watcher has just reset the page to 1.
  currentPage.value = next.page
}
watch(() => route.query, (routeQuery) => { if (onOwnPage()) applyUrl(routeQuery) })
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
  margin-bottom: 14px;
}

.tableTitle {
  margin: 0;
}

.overview-search {
  margin: 0;
  max-width: 320px;
}

.overview-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 16px;
  margin-bottom: 18px;
  font-size: 0.9rem;
  color: #4b5563;

  .filter {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 0;
  }

  .filter-check {
    flex-direction: row;
    align-items: center;
    gap: 6px;
    height: 2.2em;
    cursor: pointer;
  }

  select, .author-input {
    height: 2.2em;
    margin: 0;
    padding: 0 6px;
    border: 1px solid #dbdbdb;
    border-radius: 6px;
    background: #fff;
    font: inherit;
  }

  .author-input {
    width: 9em;
  }

  .button {
    height: 2.2em;
  }
}

// Keep the old rows visible while the next page loads, just dimmed.
.is-stale :deep(tbody) {
  opacity: 0.55;
  transition: opacity 0.15s;
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

  .overview-filters {
    display: grid;
    grid-template-columns: 1fr 1fr;

    select, .author-input {
      width: 100%;
    }
  }

  // Page size, range and "go to" above the page buttons instead of pushing
  // them off the screen.
  :deep(.o-table__pagination) {
    flex-wrap: wrap;
    gap: 10px;
  }

  :deep(.o-table__pagination > *) {
    flex: 1 1 100%;
    min-width: 0;
  }

  .table-controls {
    min-width: 0;
    gap: 8px 12px;
  }
}
</style>
