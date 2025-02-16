<template>
  <div class="overviewPage">
    <h2 class="tableTitle">{{title}}</h2>
    <b-table
      :data="linelogs"
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
            v-model="linelogRatings[props.row.id]"
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
import LinelogService from '@/services/LinelogService'
import LinelogRatingService from '@/services/LinelogRatingService'

export default {
  name: 'LinelogOverview',
  setup() {
    const store = useMainStore()
    const { isUserLoggedIn, user } = storeToRefs(store)
    
    const title = ref("Linelog Auswahl")
    const solved = ref([])
    const rateMax = ref(5)
    const linelogs = ref([])
    const linelogRatings = ref({})

    const isSolved = (id) => {
      if (!id) return false
      return solved.value.includes(id)
    }

    const getRating = (id) => {
      if (!id) return 0
      return linelogRatings.value[id] || 0
    }

    const loadLinelogData = async () => {
      try {
        linelogs.value = (await LinelogService.index()).data
        const ratings = (await LinelogRatingService.index()).data
        
        const ratingDict = {}
        for (const rating of ratings) {
          ratingDict[rating.LinelogId] = rating.avgRating
        }
        linelogRatings.value = ratingDict

        if (isUserLoggedIn.value && user.value) {
          const userData = (await UserService.show(user.value.id)).data
          solved.value = userData.solvedLinelogs || []
        } else {
          solved.value = []
        }
      } catch (error) {
        console.error('Error loading linelog data:', error)
      }
    }

    watch(() => isUserLoggedIn.value, async (newValue) => {
      if (newValue && user.value) {
        const userData = (await UserService.show(user.value.id)).data
        solved.value = userData.solvedLinelogs || []
      } else {
        solved.value = []
      }
    })

    onMounted(async () => {
      await loadLinelogData()
    })

    onActivated(async () => {
      await loadLinelogData()
    })

    return {
      title,
      solved,
      rateMax,
      linelogs,
      linelogRatings,
      isSolved,
      getRating
    }
  }
}
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
</style>