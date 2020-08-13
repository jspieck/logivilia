<template>
<div class="overviewPage">
  <h2 class="tableTitle">{{title}}</h2>
  <Autocomplete 
    :search="search"
    placeholder="Suche nach einem Rätsel"
    :defaultValue="defaultSearch"
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

  <b-table
    :data="filteredLogicals"
    ref="table"
    paginated
    per-page="10"
    aria-next-label="Nächste Seite"
    aria-previous-label="Vorherige Seite"
    aria-page-label="Seite"
    aria-current-label="Gegenwärtige Seite">
      <template slot-scope="props">
          <b-table-column field="id" label="Name" sortable>
            <router-link :to="`/logicalSolve/${ props.row.id }`" class="navLink">{{ props.row.name }}</router-link>
          </b-table-column>
          <b-table-column field="difficulty" label="Schwierigkeit" sortable>
            <template>
              {{ props.row.difficulty }}
            </template>
          </b-table-column>
          <b-table-column field="score" label="Bewertung" sortable>
            <template>
              <b-rate
                v-model="logicalRatings[props.row.id]"
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
      </template>

      <template slot="detail" slot-scope="props">
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
      </template>
  </b-table>
</div>
</template>

<script>
import LogicalService from '@/services/LogicalService';
import LogicalRatingService from '@/services/LogicalRatingService';

export default {
  name: 'LogicalOverview',
  data() {
    return {
      extractLength: 100,
      title: "Logikrätsel Auswahl",
      solved: {},
      showDetailIcon: true,
      imgName: 'biene.jpg',
      rate: 4.5,
      rateMax: 5,
      defaultSearch: "",
      searchString: "",
      logicals: [],
      logicalRatings: {}
    };
  },
  computed: {
    logicalNames() {
      const names = [];
      for (const logical of this.logicals) {
        names.push(logical.name);
      }
      return names;
    },
    filteredLogicals() {
      if (this.searchString == null || this.searchString == "") {
        return this.logicals;
      }
      return this.logicals.filter(logical => {
        return logical.name.toLowerCase()
          .startsWith(this.searchString.toLowerCase())
      });
    }
  },
  async mounted() {
    this.logicals = (await LogicalService.index()).data;
    const ratings = (await LogicalRatingService.index()).data;
    const ratingDict = {};
    for (const rating of ratings) {
      ratingDict[rating.LogicalId] = rating.avgRating;
    }
    this.logicalRatings = ratingDict;
  },
  watch: {
    '$route.query.search': {
      immediate: true,
      handler(value) {
        this.searchString = value;
        this.defaultSearch = value;
      }
    }
  },
  methods: {
    getExtract(text) {
      return text.substr(0, this.extractLength) + "\u2026";
    },
    isSolved(id) {
      if (this.solved[id] == null) {
        return false;
      }
      return true;
    },
    toggle(row) {
      this.$refs.table.toggleDetails(row)
    },
    getImg() {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      return require(`@/assets/${this.imgName}`);
    },
    search(input) {
      if (input != this.searchString) {
        // this.pushRoute(input);
        this.searchString = this.input;
      }
      if (input.length < 1) { return [] }
      return this.logicalNames.filter(name => {
        return name.toLowerCase()
          .startsWith(input.toLowerCase())
      });
    },
    handleSubmit(result) {
      if (result == null) {
        return;
      }
      this.searchString = result;
    }
  }
};
</script>

<style lang="scss">
.tableTitle {
  margin-top: 0;
  padding-top: 30px;
  margin-bottom: 30px;
}
</style>
