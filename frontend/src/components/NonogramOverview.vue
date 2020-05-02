<template>
<div>
  <h2 class="tableTitle">{{title}}</h2>
  <b-table
    :data="data"
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
                v-model="rate"
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
  </b-table>
</div>
</template>

<script>
import nonogram from '../assets/nonograms.json';

export default {
  name: 'NonogramOverview',
  data() {
    return {
      data: nonogram,
      title: "Nonogramm Auswahl",
      solved: {},
      showDetailIcon: true,
      rate: 4.5,
      rateMax: 5,
    };
  },
  computed: {

  },
  methods: {
    isSolved(id) {
      if (this.solved[id] == null) {
        return false;
      }
      return true;
    },
  }
};
</script>

<style lang="scss">
</style>
