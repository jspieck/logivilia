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
          <router-link :to="`/nonogramSolve/${ props.row.id }`" class="navLink">
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
        <o-table-column field="score" label="Bewertung" v-slot="props" sortable>
          <StarRating :model-value="nonogramRatings[props.row.id]" :max="rateMax" disabled />
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

<script>
import { ref, onMounted, onActivated, watch } from 'vue'
import { useMainStore } from '@/store/store'
import { storeToRefs } from 'pinia'
import UserService from '@/services/UserService'
import NonogramService from '@/services/NonogramService'
import NonogramRatingService from '@/services/NonogramRatingService'

export default {
  name: 'NonogramOverview',
  setup() {
    const store = useMainStore()
    const { isUserLoggedIn, user } = storeToRefs(store)
    
    const title = ref("Nonogramm Auswahl")
    const rateMax = ref(5)
    const nonograms = ref([])
    const nonogramRatings = ref({})
    const solved = ref([])

    const isSolved = (id) => {
      return solved.value.includes(id)
    }

    const loadNonoData = async () => {
      nonograms.value = (await NonogramService.index()).data
      const ratings = (await NonogramRatingService.index()).data
      const ratingDict = {}
      for (const rating of ratings) {
        ratingDict[rating.NonogramId] = parseFloat(rating.avgRating)
      }
      nonogramRatings.value = ratingDict

      if (isUserLoggedIn.value) {
        const userData = (await UserService.show(user.value.id)).data
        solved.value = userData.solvedNonograms
      }
    }

    watch(isUserLoggedIn, async (newValue) => {
      if (newValue) {
        const userData = (await UserService.show(user.value.id)).data
        solved.value = userData.solvedNonograms
      }
    })

    onMounted(async () => {
      await loadNonoData()
    })

    onActivated(async () => {
      await loadNonoData()
    })

    return {
      title,
      rateMax,
      nonograms,
      nonogramRatings,
      solved,
      isSolved
    }
  }
}
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