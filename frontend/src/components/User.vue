<template>
  <div>
    <h2>Benutzerprofil</h2>

    <div class="tile is-ancestor user-card">
      <div class="tile is-parent is-3">
        <div class="is-child box profile-box">
          <!-- <img class="profile-picture" src="@/assets/stock.jpg"/>
          <div class="profile-picture"></div> -->
          <img class="profile-picture" src="@/assets/bear.svg"/>
          <p class="user-name">{{user.username}}</p>
          <p class="user-role">{{user.role}}</p>
        </div>
      </div>
      <div class="tile is-parent is-4">
        <div class="is-child box profile-box">
          <p class="category-text">Wohnort</p>
          <p class="category-sub">{{user.city}}</p>
          <p class="category-text">Geschlecht</p>
          <p class="category-sub">{{user.gender}}</p>
          <p class="category-text">Alter</p>
          <p class="category-sub">{{user.age}}</p>
          <p class="category-text">Beitrittsdatum</p>
          <p class="category-sub">{{formatDate(user.joined)}}</p>
        </div>
      </div>
      <div class="tile is-parent is-vertical is-5">
        <div class="tile is-parent">
          <div class="is-child box">
            <p class="tile-heading">Gelöste Rätsel</p>
            <nav class="level">
              <div class="level-item has-text-centered">
                <div>
                  <p class="heading">Logikrätsel</p>
                  <p class="title">{{user.solvedLogicals.length}}</p>
                </div>
              </div>
              <div class="level-item has-text-centered">
                <div>
                  <p class="heading">Nonogramme</p>
                  <p class="title">{{user.solvedNonograms.length}}</p>
                </div>
              </div>
              <div class="level-item has-text-centered">
                <div>
                  <p class="heading">Linelogs</p>
                  <p class="title">{{user.solvedLinelogs.length}}</p>
                </div>
              </div>
            </nav>
          </div>
        </div>
        <div class="tile is-parent">
          <div class="is-child box">
            <p class="tile-heading">Erstellte Rätsel</p>
            <nav class="level">
              <div class="level-item has-text-centered">
                <div>
                  <p class="heading">Logikrätsel</p>
                  <p class="title">{{user.createdLogicals.length}}</p>
                </div>
              </div>
              <div class="level-item has-text-centered">
                <div>
                  <p class="heading">Nonogramme</p>
                  <p class="title">{{user.createdNonograms.length}}</p>
                </div>
              </div>
              <div class="level-item has-text-centered">
                <div>
                  <p class="heading">Linelogs</p>
                  <p class="title">{{user.createdLinelogs.length}}</p>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import UserService from '@/services/UserService';

export default {
  name: 'User',
  data() {
    return {
      user: {
        username: "",
        solvedLogicals: [],
        solvedNonograms: [],
        solvedLinelogs: [],
        createdLogicals: [],
        createdNonograms: [],
        createdLinelogs: []
      }
    };
  },
  async mounted() {
    const id = this.$store.state.route.params.id;
    this.user = (await UserService.show(id)).data;
  },
  watch: {
    async id() {
      const id = this.$store.state.route.params.id;
      this.user = (await UserService.show(id)).data;
    },
  },
  methods: {
    formatDate(inputFormat) {
      function pad(s) { return (s < 10) ? '0' + s : s; }
      const d = new Date(inputFormat);
      return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('/');
    }
  },
};
</script>

<style scoped>
  .user-card {
    box-shadow: 0 4px 10px #0870b829;
  }
  .box {
    background: #fcfcfc;
    box-shadow: none;
    width: 100%;
    margin: 20px;
    padding: 20px;
    /* box-shadow: 0 4px 10px rgb(8 112 184 / 16%); */
  }
  .level {
    width: 100%;
  }
  .title {
    margin-top: 10px;
  }
  .tile-heading {
    text-align: center;
    font-size: 20px;
    font-weight: 600;
  }
  .bodyContainer {
    background: #f7f9fc;
  }
  .profile-box {
    padding: 50px;
    position: relative;
    box-sizing: border-box;
    background: white;
    box-shadow: none;
    border-radius: 0;
    border-right: 1px solid #305bd73b;
  }
  .profile-picture {
    width: 150px;
    height: 150px;
    background: #9595ea;
    border-radius: 65px;
    margin-left: -12.5px;
  }
  .user-name {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
  }
  .user-role {
    color: #a0a6b1;
    font-size: 18px;
    text-align: center;
  }
  .category-text {
    color: #a0a6b1;
    font-size: 18px;
  } 
  .category-sub {
    color: #343434;
    font-weight: 600;
    font-size: 18px;
  }
  .heading {
    font-size: 13px;
  }
  .tile.is-ancestor {
    margin: 0;
  }
  .tile {
    box-sizing: border-box;
  }
</style>