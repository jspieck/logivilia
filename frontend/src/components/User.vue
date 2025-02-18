<template>
  <div class="profile-page">
    <div class="profile-header">
      <div class="header-content">
        <div class="user-avatar">
          <img class="avatar-image" src="@/assets/bear.svg" alt="Profile picture" />
          <div class="user-status" :class="{ 'online': isOnline }"></div>
        </div>
        <div class="user-info">
          <h1 class="username">{{ user.username }}</h1>
          <span class="user-role">{{ user.role }}</span>
          
          <div class="user-details">
            <div class="detail-item" v-if="user.gender">
              <ion-icon name="person-outline"></ion-icon>
              <span>{{ user.gender }}</span>
            </div>
            <div class="detail-item" v-if="user.birthyear">
              <ion-icon name="gift-outline"></ion-icon>
              <span>{{ age }} Jahre</span>
            </div>
            <div class="detail-item" v-if="user.city">
              <ion-icon name="location-outline"></ion-icon>
              <span>{{ user.city }}</span>
            </div>
            <div class="detail-item">
              <ion-icon name="calendar-outline"></ion-icon>
              <span>Dabei seit {{ formatDate(user.joined) }}</span>
            </div>
          </div>

          <div class="user-bio" v-if="user.bio">
            <p>{{ user.bio }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-content">
      <div class="stats-grid">
        <div class="stats-card solved">
          <h3>Gelöste Rätsel</h3>
          <div class="stats-numbers">
            <div class="stat-group">
              <div class="stat-value">{{ user.solvedLogicals.length }}</div>
              <div class="stat-label">Logikrätsel</div>
            </div>
            <div class="stat-group">
              <div class="stat-value">{{ user.solvedNonograms.length }}</div>
              <div class="stat-label">Nonogramme</div>
            </div>
            <div class="stat-group">
              <div class="stat-value">{{ user.solvedLinelogs.length }}</div>
              <div class="stat-label">Linelogs</div>
            </div>
          </div>
        </div>

        <div class="stats-card created">
          <h3>Erstellte Rätsel</h3>
          <div class="stats-numbers">
            <div class="stat-group">
              <div class="stat-value">{{ user.createdLogicals.length }}</div>
              <div class="stat-label">Logikrätsel</div>
            </div>
            <div class="stat-group">
              <div class="stat-value">{{ user.createdNonograms.length }}</div>
              <div class="stat-label">Nonogramme</div>
            </div>
            <div class="stat-group">
              <div class="stat-value">{{ user.createdLinelogs.length }}</div>
              <div class="stat-label">Linelogs</div>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-edit" v-if="loggedIn && (store.user.id == route.params.id)">
        <h3>Profil bearbeiten</h3>
        <div class="edit-form">
          <div class="form-group">
            <label>Wohnort</label>
            <input 
              v-model="editedCity" 
              placeholder="Stadt eingeben"
              @keyup.enter="updateProfile"
            />
          </div>
          <div class="form-group">
            <label>Geschlecht</label>
            <div><MySelect :options="genderOptions" v-model="selectedGender" /></div>
          </div>
          <div class="form-group">
            <label>Geburtsjahr</label>
            <div><MySelect :options="years" v-model="selectedBirthyear" /></div>
          </div>
          <div class="form-group">
            <label>Über mich</label>
            <textarea 
              class="bio-area" 
              v-model="aboutMe" 
              placeholder="Erzähle etwas über dich..."
            ></textarea>
          </div>
          <button 
            class="save-button" 
            @click="updateProfile"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from '@/store/store';
import { useOruga } from '@oruga-ui/oruga-next';
import UserService from '@/services/UserService';
import MySelect from '@/components/MySelect.vue';

const store = useMainStore();
const route = useRoute();
const oruga = useOruga();
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

const isOnline = ref(true);

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
  try {
    await UserService.update(store.user.id, {
      city: editedCity.value,
      birthyear: selectedBirthyear.value,
      bio: aboutMe.value,
      gender: selectedGender.value
    });

    // Update the displayed user data immediately
    user.value = {
      ...user.value,
      city: editedCity.value,
      birthyear: selectedBirthyear.value,
      bio: aboutMe.value,
      gender: selectedGender.value
    };

    // Show success notification
    oruga.notification.open({
      message: 'Profil erfolgreich aktualisiert!',
      duration: 3000,
      variant: 'success',
      position: 'bottom-right'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    oruga.notification.open({
      message: 'Fehler beim Aktualisieren des Profils',
      duration: 3000,
      variant: 'danger',
      position: 'bottom-right'
    });
  }
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
</script>

<style lang="scss" scoped>
.profile-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  background: white;
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.header-content {
  display: flex;
  gap: 24px;
  align-items: center;
}

.user-avatar {
  position: relative;

  .avatar-image {
    width: 120px;
    height: 120px;
    border-radius: 60px;
    object-fit: cover;
    background: #f0f0f0;
  }

  .user-status {
    position: absolute;
    bottom: 5px;
    right: 5px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #4CAF50;
    border: 2px solid white;
  }
}

.user-info {
  flex: 1;

  .username {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 4px 0;
  }

  .user-role {
    color: #666;
    font-size: 14px;
    margin-bottom: 16px;
    display: block;
  }

  .user-details {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #666;
    font-size: 14px;
    padding: 4px 12px;
    background: #f5f5f5;
    border-radius: 20px;

    ion-icon {
      font-size: 18px;
      color: #2196F3;
    }
  }

  .user-bio {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #eee;

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.stats-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    color: #333;
  }

  .stats-numbers {
    display: flex;
    justify-content: space-around;
    text-align: center;
  }

  .stat-group {
    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #2196F3;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
  }
}

.profile-edit {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    color: #333;
  }

  .edit-form {
    display: grid;
    gap: 20px;
    max-width: 600px;
  }

  .form-group {
    display: grid;
    gap: 8px;

    label {
      font-size: 14px;
      color: #666;
    }

    input,
    select,
    textarea {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;

      &:focus {
        outline: none;
        border-color: #2196F3;
      }
    }

    .bio-area {
      min-height: 100px;
      resize: vertical;
    }
  }

  .save-button {
    background: #2196F3;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #1976D2;
    }
  }
}

@media (max-width: 600px) {
  .header-content {
    flex-direction: column;
    text-align: center;
  }

  .user-details {
    justify-content: center;
  }

  .user-bio {
    text-align: left;
  }

  .stats-card .stats-numbers {
    flex-direction: column;
    gap: 16px;
  }
}
</style>