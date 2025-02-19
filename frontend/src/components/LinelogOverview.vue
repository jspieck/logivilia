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

    <b-table
      :data="filteredLinelogs"
      ref="table"
      paginated
      per-page="10"
      aria-next-label="Nächste Seite"
      aria-previous-label="Vorherige Seite"
      aria-page-label="Seite"
      aria-current-label="Gegenwärtige Seite">
        <b-table-column field="name" label="Name" v-slot="props" sortable>
          <router-link :to="`/linelogSolve/${props.row.id}`" class="navLink">
            {{ props.row.name }}
          </router-link>
        </b-table-column>
        <b-table-column field="difficulty" label="Schwierigkeit" v-slot="props" sortable>
          {{ props.row.difficulty }}
        </b-table-column>
        <b-table-column field="width" label="Breite" v-slot="props" sortable>
          {{ props.row.width }}
        </b-table-column>
        <b-table-column field="height" label="Höhe" v-slot="props" sortable>
          {{ props.row.height }}
        </b-table-column>
        <b-table-column field="numColor" label="Farben" v-slot="props" sortable>
          {{ props.row.numColor }}
        </b-table-column>
        <b-table-column field="score" label="Bewertung" v-slot="props" sortable>
          <b-rate
            v-model="state.linelogRatings[props.row.id]"
            icon-pack="mdi"
            icon="star"
            :max="state.rateMax"
            :show-text="false"
            :rtl="false"
            :spaced="false"
            :disabled="true">
          </b-rate>
        </b-table-column>
        <b-table-column field="date" label="Date" v-slot="props" sortable>
          <span class="tag is-success">
            {{ new Date(props.row.date).toLocaleDateString() }}
          </span>
        </b-table-column>
        <b-table-column field="date" label="Gelöst" v-slot="props" sortable>
          <span v-if="isSolved(props.row.id)" class="tag is-success">
            Gelöst
          </span>
          <span v-else class="tag is-danger">
            Ungelöst
          </span>
        </b-table-column>
    </b-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store/store'
import UserService from '@/services/UserService'
import LinelogService from '@/services/LinelogService'
import LinelogRatingService from '@/services/LinelogRatingService'

const route = useRoute()
const store = useMainStore()
const { isUserLoggedIn, user } = storeToRefs(store)

const state = ref({
  title: "Linelog Auswahl",
  solved: [],
  rateMax: 5,
  defaultSearch: "",
  searchString: "",
  linelogs: [],
  linelogRatings: {}
})

const linelogNames = computed(() => {
  return state.value.linelogs.map(linelog => linelog.name)
})

const filteredLinelogs = computed(() => {
  if (!state.value.searchString) {
    return state.value.linelogs
  }
  console.log(state.value.linelogs)
  return state.value.linelogs.filter(linelog => 
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

const isSolved = (id) => {
  if (!id) return false
  return state.value.solved.includes(id)
}

const getRating = (id) => {
  if (!id) return 0
  return state.value.linelogRatings[id] || 0
}

const loadRatings = async () => {
  const ratings = (await LinelogRatingService.index()).data
    
  const ratingDict = {}
  for (const rating of ratings) {
    ratingDict[rating.LinelogId] = parseFloat(rating.avgRating)
  }
  state.value.linelogRatings = ratingDict
}

const loadSolvedLinelogs = async () => {
  if (isUserLoggedIn.value && user.value) {
    const userData = (await UserService.show(user.value.id)).data
    state.value.solved = userData.solvedLinelogs || []
  } else {
    state.value.solved = []
  }
}

const loadLinelogData = async () => {
  try {
    state.value.linelogs = (await LinelogService.index()).data
    loadRatings()
    loadSolvedLinelogs()
  } catch (error) {
    console.error('Error loading linelog data:', error)
  }
}

watch(() => route.query.search, (value) => {
  state.value.searchString = value
  state.value.defaultSearch = value
}, { immediate: true })

watch(() => isUserLoggedIn.value, async (newValue) => {
  if (newValue && user.value) {
    const userData = (await UserService.show(user.value.id)).data
    state.value.solved = userData.solvedLinelogs || []
  } else {
    state.value.solved = []
  }
})

onMounted(async () => {
  await loadLinelogData()
})

onActivated(async () => {
  await loadLinelogData()
})
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