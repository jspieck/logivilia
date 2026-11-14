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
          <router-link :to="`/puzzle/${ props.row.id }`" class="navLink">{{ props.row.name }}</router-link>
        </o-table-column>
        <o-table-column field="difficulty" label="Schwierigkeit" v-slot="props" sortable>
            {{ props.row.difficulty }}
        </o-table-column>
        <o-table-column field="avgRating" label="Bewertung" v-slot="props" sortable>
            <StarRating :model-value="props.row.avgRating || 0" :max="5" disabled />
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
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePuzzleList } from '@/puzzles/usePuzzleList'

export default {
  name: 'LogicalOverview',
  setup() {
    const route = useRoute()
    const { puzzles: logicals, isSolved } = usePuzzleList('logical')
    const tableRef = ref(null)

    const state = ref({
      extractLength: 100,
      title: "Logikrätsel Auswahl",
      imgName: 'biene.jpg',
      defaultSearch: "",
      searchString: ""
    })

    const logicalNames = computed(() => {
      return logicals.value.map(logical => logical.name)
    })

    const filteredLogicals = computed(() => {
      if (!state.value.searchString) {
        return logicals.value
      }
      return logicals.value.filter(logical => 
        logical.name.toLowerCase().startsWith(state.value.searchString.toLowerCase())
      )
    })

    const getExtract = (text) => {
      return text.substr(0, state.value.extractLength) + "\u2026"
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
