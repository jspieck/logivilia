<template>
  <div class="overviewPage">
    <h2 class="tableTitle">{{title}}</h2>
    <b-table
      :data="nonograms"
      ref="table"
      paginated
      per-page="10"
      aria-next-label="Nächste Seite"
      aria-previous-label="Vorherige Seite"
      aria-page-label="Seite"
      aria-current-label="Gegenwärtige Seite">
        <b-table-column field="name" label="Name" v-slot="props" sortable>
          <router-link :to="`/nonogramSolve/${ props.row.id }`" class="navLink">
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
            v-model="nonogramRatings[props.row.id]"
            icon-pack="mdi"
            icon="star"
            :max="rateMax"
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
      return solved.value.includes(id - 1)
    }

    const loadNonoData = async () => {
      nonograms.value = (await NonogramService.index()).data
      const ratings = (await NonogramRatingService.index()).data
      const ratingDict = {}
      for (const rating of ratings) {
        ratingDict[rating.NonogramId] = rating.avgRating
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
.overviewPage {
  padding: 1rem;
}

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