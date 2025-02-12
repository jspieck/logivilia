<template>
  <div class="overviewPage">
    <h2>Benutzerprofil</h2>

    <div class="tile is-ancestor user-card">
      <div class="tile is-parent is-3 userCardBox">
        <div class="is-child box profile-box">
          <!-- <img class="profile-picture" src="@/assets/stock.jpg"/>
          <div class="profile-picture"></div> -->
          <img class="profile-picture" src="@/assets/bear.svg"/>
          <p class="user-name">{{user.username}}</p>
          <p class="user-role">{{user.role}}</p>
        </div>
      </div>
      <div class="tile is-parent is-4 userCardBox">
        <div class="is-child box profile-box">
          <p class="category-text">Wohnort</p>
          <p class="category-sub">{{user.city}}</p>
          <p class="category-text">Geschlecht</p>
          <p class="category-sub">{{user.gender}}</p>
          <p class="category-text">Alter</p>
          <p class="category-sub">{{age}}</p>
          <p class="category-text">Beitrittsdatum</p>
          <p class="category-sub">{{formatDate(user.joined)}}</p>
        </div>
      </div>
      <div class="tile is-parent is-vertical is-5 userCardBox">
        <div class="tile is-parent statBox">
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
        <div class="tile is-parent statBox">
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

    <div id="editArea">
      <h3>Passe dein Profil an</h3>
      <p class="category-text">Wohnort</p>
      <input v-model="editedCity"/>
      <p class="category-text">Geschlecht</p>
      <MySelect :options="genderOptions" v-model="selectedGender" :sel="selectedGender"/>
      <p class="category-text">Geburtsjahr</p>
      <MySelect :options="years" v-model="selectedBirthyear" :sel="selectedBirthyear"/>
      <p class="category-text">Über mich</p>
      <textarea class="bio-area" v-model="aboutMe"></textarea>
      <button @click="updateProfile">Profil aktualisieren</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from '@/store/store';
import UserService from '@/services/UserService';
import MySelect from '@/components/MySelect';

export default {
  name: 'UserProfile',
  components: {
    MySelect
  },
  setup() {
    const store = useMainStore();
    const route = useRoute();
    const user = ref({
      username: "",
      solvedLogicals: [],
      solvedNonograms: [],
      solvedLinelogs: [],
      createdLogicals: [],
      createdNonograms: [],
      createdLinelogs: []
    });
    const genderOptions = ["Männlich", "Weiblich", "Divers", ""];
    const editedCity = ref("");
    const aboutMe = ref("");
    const selectedBirthyear = ref(1975);
    const selectedGender = ref("");

    const years = computed(() => {
      const year = new Date().getFullYear();
      return Array.from({ length: year - 1900 }, (value, index) => 1901 + index);
    });

    const loggedIn = computed(() => store.isUserLoggedIn);

    const age = computed(() => {
      const year = new Date().getFullYear();
      return year - user.value.birthyear;
    });

    const updateUserEdit = () => {
      if (loggedIn.value && (store.user.id == route.params.id)) {
        editedCity.value = user.value.city;
        aboutMe.value = user.value.bio;
        selectedBirthyear.value = user.value.birthyear;
        selectedGender.value = user.value.gender;
      }
    };

    const updateProfile = async () => {
      await UserService.update(store.user.id, {
        city: editedCity.value,
        birthyear: selectedBirthyear.value,
        bio: aboutMe.value,
        gender: selectedGender.value
      });
    };

    const formatDate = (inputFormat) => {
      function pad(s) { return (s < 10) ? '0' + s : s; }
      const d = new Date(inputFormat);
      return [pad(d.getDate()), pad(d.getMonth() + 1), d.getFullYear()].join('/');
    };

    onMounted(async () => {
      const id = route.params.id;
      user.value = (await UserService.show(id)).data;
      updateUserEdit();
    });

    watch(() => route.params.id, async () => {
      const id = route.params.id;
      user.value = (await UserService.show(id)).data;
      updateUserEdit();
    });

    return {
      user,
      genderOptions,
      editedCity,
      aboutMe,
      selectedBirthyear,
      selectedGender,
      years,
      loggedIn,
      age,
      updateProfile,
      updateUserEdit,
      formatDate
    };
  }
};
</script>

<style scoped>
  .user-card {
    box-shadow: 0 4px 10px #0870b829;
  }
  @media (max-width: 770px) {
    .is-3 {
      width: 33%;
    }
    .is-4 {
      width: 66%;
    }
    .is-3, .is-4 {
      display: inline-block;
      margin: 0;
      padding: 0;
    }
    .box {
      margin: 0 !important;
      padding: 0 !important;
    }
    .tile.is-parent {
      vertical-align: top;
    }
    .userCardBox[data-v-73968b0a] {
      border-right: none;
    }
    .statBox {
      width: 49% !important;
      display: inline-block;
    }
  }
  @media (max-width: 1000px) {
    .heading {
      font-size: 10px !important;
    }
  }
  .bio-area {
    width: 50%;
    height: 150px;
    display: block;
    margin-bottom: 15px;
  }
  .box {
    background: #fcfcfc;
    box-shadow: none;
    width: 100%;
    margin: 20px;
    padding: 20px;
    box-sizing: border-box;
    /* box-shadow: 0 4px 10px rgb(8 112 184 / 16%); */
  }
  .userCardBox {
    border-right: 1px solid #305bd73b;
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
    position: relative;
    box-sizing: border-box;
    background: white;
    box-shadow: none;
    border-radius: 0;
    text-align: center;
  }
  .profile-picture {
    /* width: 150px;
    height: 150px; */
    margin-top: 10px;
    width: 100%;
    background: #9595ea;
    border-radius: 65px;
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