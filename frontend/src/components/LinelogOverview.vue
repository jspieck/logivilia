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
      <template slot-scope="props">
        <b-table-column field="name" label="Name" sortable>
          <router-link :to="`/linelogSolve/${ props.row.id }`" class="navLink">{{ props.row.name }}</router-link>
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
              v-model="linelogRatings[props.row.id]"
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
import LinelogService from '@/services/LinelogService';
import LinelogRatingService from '@/services/LinelogRatingService';

export default {
  name: 'LinelogOverview',
  data() {
    return {
      title: "Linelog Auswahl",
      solved: [],
      rateMax: 5,
      linelogs: [],
      linelogRatings: []
    };
  },
  async mounted() {
    this.linelogs = (await LinelogService.index()).data;
    const ratings = (await LinelogRatingService.index()).data;
    const ratingDict = {};
    for (const rating of ratings) {
      ratingDict[rating.LinelogId] = rating.avgRating;
    }
    this.linelogRatings = ratingDict;
    if (this.loggedIn) {
      // New request in case the user solved in puzzle since logging in
      const userData = (await UserService.show(this.$store.state.user.id)).data;
      this.solved = userData.solvedLinelogs;
    }
  },
  async activated() {
    this.linelogs = (await LinelogService.index()).data;
    const ratings = (await LinelogRatingService.index()).data;
    const ratingDict = {};
    for (const rating of ratings) {
      ratingDict[rating.LinelogId] = rating.avgRating;
    }
    this.linelogRatings = ratingDict;
    if (this.loggedIn) {
      // New request in case the user solved in puzzle since logging in
      const userData = (await UserService.show(this.$store.state.user.id)).data;
      this.solved = userData.solvedLinelogs;
    }
  },
  computed: {
    loggedIn() {
      return this.$store.state.isUserLoggedIn;
    },
  },
  watch: {
    async loggedIn() {
      const userData = (await UserService.show(this.$store.state.user.id)).data;
      this.solved = userData.solvedLinelogs;
    }
  },
  methods: {
    isSolved(id) {
      if (this.solved.includes(id - 1)) {
        return true;
      }
      return false;
    },
  }
};
</script>

<style lang="scss">
</style>
