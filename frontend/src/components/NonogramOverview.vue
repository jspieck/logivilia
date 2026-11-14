<template>
  <div class="overviewPage">
    <h2 class="tableTitle">{{title}}</h2>
    <o-table
      :data="nonograms"
      ref="table"
      paginated
      :per-page="10"
      aria-next-label="Nächste Seite"
      aria-previous-label="Vorherige Seite"
      aria-page-label="Seite"
      aria-current-label="Gegenwärtige Seite">
        <o-table-column field="name" label="Name" v-slot="props" sortable>
          <router-link :to="`/puzzle/${ props.row.id }`" class="navLink">
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
import { usePuzzleList } from '@/puzzles/usePuzzleList'

const title = 'Nonogramm Auswahl'
const { puzzles: nonograms, isSolved } = usePuzzleList('nonogram')
</script>

<style lang="scss">
.tableTitle {
  margin-bottom: 1rem;
}

.navLink {
  color: inherit;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
}
</style>