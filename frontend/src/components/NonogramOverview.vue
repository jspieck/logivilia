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
      <template slot-scope="props">
        <b-table-column field="name" label="Name" sortable>
          <router-link :to="`/nonogramSolve/${ props.row.id }`" class="navLink">{{ props.row.name }}</router-link>
        </b-table-column>
        <b-table-column field="difficulty" label="Schwierigkeit" sortable>
          <template>
            {{ props.row.difficulty }}
          </template>
        </b-table-column>
        <b-table-column field="width" label="Breite" sortable>
          <template>
            {{ props.row.width }}
          </template>
        </b-table-column>
        <b-table-column field="height" label="Höhe" sortable>
          <template>
            {{ props.row.height }}
          </template>
        </b-table-column>
        <b-table-column field="numColor" label="Farben" sortable>
          <template>
            {{ props.row.numColor }}
          </template>
        </b-table-column>
        <b-table-column field="score" label="Bewertung" sortable>
          <template>
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
          </template>
        </b-table-column>
        <b-table-column field="date" label="Date" sortable>
          <span class="tag is-success">
              {{ new Date(props.row.date).toLocaleDateString() }}
          </span>
        </b-table-column>
        <b-table-column field="date" label="Gelöst" sortable>
          <span v-if="isSolved(props.row.id)" class="tag is-success">
            Gelöst
          </span>
          <span v-if="!isSolved(props.row.id)" class="tag is-danger">
            Ungelöst
          </span>
        </b-table-column>
      </template>
  </b-table>
</div>
</template>

<script>
import UserService from '@/services/UserService';
import NonogramService from '@/services/NonogramService';
import NonogramRatingService from '@/services/NonogramRatingService';

export default {
  name: 'NonogramOverview',
  data() {
    return {
      title: "Nonogramm Auswahl",
      rateMax: 5,
      nonograms: [],
      nonogramRatings: {},
      solved: []
    };
  },
  computed: {
    loggedIn() {
      return this.$store.state.isUserLoggedIn;
    },
  },
  async mounted() {
    await this.loadNonoData();
  },
  async activated() {
    await this.loadNonoData();
  },
  watch: {
    async loggedIn() {
      const userData = (await UserService.show(this.$store.state.user.id)).data;
      this.solved = userData.solvedNonograms;
    }
  },
  methods: {
    isSolved(id) {
      if (this.solved.includes(id - 1)) {
        return true;
      }
      return false;
    },
    async loadNonoData() {
      this.nonograms = (await NonogramService.index()).data;
      const ratings = (await NonogramRatingService.index()).data;
      const ratingDict = {};
      for (const rating of ratings) {
        ratingDict[rating.NonogramId] = rating.avgRating;
      }
      this.nonogramRatings = ratingDict;
      if (this.loggedIn) {
        // New request in case the user solved in puzzle since logging in
        const userData = (await UserService.show(this.$store.state.user.id)).data;
        this.solved = userData.solvedNonograms;
      }
    }
  }
};
</script>

<style lang="scss">
</style>
