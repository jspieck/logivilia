<template>
  <div class="overviewPage">
    <h2 class="tableTitle">{{state.title}}</h2>
    <Autocomplete 
      :search="search"
      placeholder="Suche nach einem Linelog"
      :defaultValue="state.defaultSearch"
      @submit="handleSubmit">
      <template #default="{rootProps, inputProps, inputListeners, resultListProps,
        resultListListeners, results, resultProps}">
        <div v-bind="rootProps">
          <input
            v-bind="inputProps"
            v-on="inputListeners"
            role="combobox"
            autocomplete="new-password"
            spellcheck="false"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            placeholder="Suche nach einem Linelog"
            class="autocomplete-input"/>
          <ul v-bind="resultListProps" v-on="resultListListeners">
            <li
              v-for="(result, index) in results"
              :key="resultProps[index].id"
              v-bind="resultProps[index]"
            >
              {{ result }}
            </li>
          </ul>
        </div>
      </template>
    </Autocomplete>

    <o-table
      :data="filteredLinelogs"
      ref="table"
      paginated
      :per-page="10"
      aria-next-label="Nächste Seite"
      aria-previous-label="Vorherige Seite"
      aria-page-label="Seite"
      aria-current-label="Gegenwärtige Seite">
        <o-table-column field="name" label="Name" v-slot="props" sortable>
          <router-link :to="`/puzzle/${props.row.id}`" class="navLink">
            {{ props.row.name }}
          </router-link>
        </o-table-column>
        <o-table-column field="difficulty" label="Schwierigkeit" v-slot="props" sortable>
          {{ props.row.difficulty }}
        </o-table-column>
        <o-table-column field="width" label="Breite" v-slot="props" sortable>
          {{ props.row.width }}
        </o-table-column>
        <o-table-column field="height" label="Höhe" v-slot="props" sortable>
          {{ props.row.height }}
        </o-table-column>
        <o-table-column field="numColor" label="Farben" v-slot="props" sortable>
          {{ props.row.numColor }}
        </o-table-column>
        <o-table-column field="avgRating" label="Bewertung" v-slot="props" sortable>
          <StarRating :model-value="props.row.avgRating || 0" :max="5" disabled />
        </o-table-column>
        <o-table-column field="date" label="Date" v-slot="props" sortable>
          <span class="tag is-success">
            {{ new Date(props.row.date).toLocaleDateString() }}
          </span>
        </o-table-column>
        <o-table-column field="date" label="Gelöst" v-slot="props" sortable>
          <span v-if="isSolved(props.row.id)" class="tag is-success">
            Gelöst
          </span>
          <span v-else class="tag is-danger">
            Ungelöst
          </span>
        </o-table-column>
    </o-table>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePuzzleList } from '@/puzzles/usePuzzleList'

const route = useRoute()
const { puzzles: linelogs, isSolved } = usePuzzleList('linelog')

const state = ref({
  title: "Linelog Auswahl",
  defaultSearch: "",
  searchString: ""
})

const linelogNames = computed(() => {
  return linelogs.value.map(linelog => linelog.name)
})

const filteredLinelogs = computed(() => {
  if (!state.value.searchString) {
    return linelogs.value
  }
  return linelogs.value.filter(linelog => 
    linelog.name.toLowerCase().startsWith(state.value.searchString.toLowerCase())
  )
})

const search = (input) => {
  if (input !== state.value.searchString) {
    state.value.searchString = input
  }
  if (input.length < 1) return []
  return linelogNames.value.filter(name => 
    name.toLowerCase().startsWith(input.toLowerCase())
  )
}

const handleSubmit = (result) => {
  if (result == null) return
  state.value.searchString = result
}

watch(() => route.query.search, (value) => {
  state.value.searchString = value
  state.value.defaultSearch = value
}, { immediate: true })

</script>

<style lang="scss">
.overviewPage {
  width: 100%;
}

.navLink {
  color: inherit;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
}

.autocomplete-input {
  width: 100%;
  padding: 8px;
  margin-bottom: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #3273dc;
  }
}
</style>