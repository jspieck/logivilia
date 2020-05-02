<template>
<div>
  <h2 class="tableTitle">{{title}}</h2>
  <!-- <table id="solTable" class="dataTable sortable responsive-table">
    <thead>
      <tr>
        <th class="leftAlign">Name</th>
        <th class="leftAlign">Extrakt</th>
        <th>Schwierigkeit</th>
        <th>Datum</th>
        <th>Gelöst</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="log in logical" v-bind:key='log.name'>
        <td class="logicalName leftAlign">{{log.name}}</td>
        <td class="leftAlign">{{getExtract(log.description)}}</td>
        <td>{{log.difficulty}}</td>
        <td>{{(new Date(log.date)).toLocaleDateString('de-DE')}}</td>
        <td>{{isSolved(log.id)}}</td>
      </tr>
    </tbody>
  </table>
  
  detailed
    detail-key="id"
    :show-detail-icon="showDetailIcon"
  -->
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
import logical from '../assets/logicals.json';

export default {
  name: 'LogicalOverview',
  data() {
    return {
      data: logical,
      extractLength: 100,
      title: "Logical Overview",
      solved: {},
      showDetailIcon: true,
      imgName: 'biene.jpg',
      rate: 4.5,
      rateMax: 5,
    };
  },
  computed: {

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
  }
};
</script>

<style lang="scss">
.tableTitle {
  margin-top: 30px;
  margin-bottom: 30px;
}
</style>
