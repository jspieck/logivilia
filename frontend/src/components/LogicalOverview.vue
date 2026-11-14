<template>
<div class="overviewPage">
  <h2 class="tableTitle">{{state.title}}</h2>
  <Autocomplete 
    :search="search"
    placeholder="Suche nach einem Rätsel"
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
          placeholder="Suche nach einem Rätsel"
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
    :data="filteredLogicals"
    ref="tableRef"
    paginated
    :per-page="10"
    aria-next-label="Nächste Seite"
    aria-previous-label="Vorherige Seite"
    aria-page-label="Seite"
    aria-current-label="Gegenwärtige Seite">
        <o-table-column field="id" label="Name" v-slot="props" sortable>
          <router-link :to="`/logicalSolve/${ props.row.id }`" class="navLink">{{ props.row.name }}</router-link>
        </o-table-column>
        <o-table-column field="difficulty" label="Schwierigkeit" v-slot="props" sortable>
            {{ props.row.difficulty }}
        </o-table-column>
        <o-table-column field="score" label="Bewertung" v-slot="props" sortable>
            <StarRating :model-value="state.logicalRatings[props.row.id]" :max="state.rateMax" disabled />
        </o-table-column>
        <o-table-column field="date" label="Erstelldatum" v-slot="props" sortable>
          <span class="tag is-success">
              {{ new Date(props.row.date).toLocaleDateString() }}
          </span>
        </o-table-column>
        <o-table-column field="date" label="Gelöst" v-slot="props" sortable>
          <span v-if="isSolved(props.row.id)" class="tag is-success">
            Gelöst
          </span>
          <span v-if="!isSolved(props.row.id)" class="tag is-danger">
            Ungelöst
          </span>
        </o-table-column>

      <!--<template #detail="props">
        <article class="media">
          <figure class="media-left">
            <p class="image is-64x64">
              <img :src="getImg()">
            </p>
          </figure>
          <div class="media-content">
            <div class="content">
              <p>
                <strong>{{ props.row.name }}</strong>
                <small>@Admin</small>
                <br>
                {{getExtract(props.row.description)}}
              </p>
            </div>
          </div>
        </article>
      </template> -->
  </o-table>
</div>
</template>

<script>
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store/store'
import LogicalService from '@/services/LogicalService'
import LogicalRatingService from '@/services/LogicalRatingService'
import UserService from '@/services/UserService'

export default {
  name: 'LogicalOverview',
  setup() {
    const route = useRoute()
    const store = useMainStore()
    const { isUserLoggedIn, user } = storeToRefs(store)
    const tableRef = ref(null)

    const state = ref({
      extractLength: 100,
      title: "Logikrätsel Auswahl",
      imgName: 'biene.jpg',
      rateMax: 5,
      defaultSearch: "",
      searchString: "",
      logicals: [],
      logicalRatings: {},
      solved: []
    })

    const logicalNames = computed(() => {
      return state.value.logicals.map(logical => logical.name)
    })

    const filteredLogicals = computed(() => {
      if (!state.value.searchString) {
        return state.value.logicals
      }
      return state.value.logicals.filter(logical => 
        logical.name.toLowerCase().startsWith(state.value.searchString.toLowerCase())
      )
    })

    const loadLogicalData = async () => {
      state.value.logicals = (await LogicalService.index()).data
      const ratings = (await LogicalRatingService.index()).data
      console.log(ratings)
      const ratingDict = {}
      for (const rating of ratings) {
        ratingDict[rating.LogicalId] = parseFloat(rating.avgRating)
      }
      state.value.logicalRatings = ratingDict
      console.log(state.value.logicalRatings)

      if (isUserLoggedIn.value) {
        const userData = (await UserService.show(user.value.id)).data
        state.value.solved = userData.solvedLogicals
      }
    }

    const getExtract = (text) => {
      return text.substr(0, state.value.extractLength) + "\u2026"
    }

    const isSolved = (id) => {
      return state.value.solved.includes(id)
    }

    const toggle = (row) => {
      tableRef.value.toggleDetails(row)
    }

    const getImg = () => {
      try {
        return new URL(`../assets/${state.value.imgName}`, import.meta.url).href
      } catch (error) {
        console.error('Error loading image:', error)
        return ''
      }
    }

    const search = (input) => {
      if (input !== state.value.searchString) {
        state.value.searchString = input
      }
      if (input.length < 1) return []
      return logicalNames.value.filter(name => 
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

    watch(isUserLoggedIn, async (newValue) => {
      if (newValue) {
        const userData = (await UserService.show(user.value.id)).data
        state.value.solved = userData.solvedLogicals
      }
    })

    onMounted(async () => {
      await loadLogicalData()
    })

    onActivated(async () => {
      await loadLogicalData()
    })

    return {
      tableRef,
      filteredLogicals,
      logicalNames,
      isSolved,
      toggle,
      getImg,
      getExtract,
      search,
      handleSubmit,
      state
    }
  }
}
</script>

<style lang="scss">
.tableTitle {
  margin-top: 0;
  padding-top: 30px;
  margin-bottom: 30px;
}
</style>
