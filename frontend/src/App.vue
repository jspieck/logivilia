<template>
  <div id="app">
    <div id="mainContainer">
      <div class="header">
        <div class="headerContainer">
          <b-navbar>
            <template #brand>
              <b-navbar-item tag="router-link" :to="{ path: '/' }">
                <img
                    src="@/assets/logo.svg"
                    alt="Logivilia"
                >
              </b-navbar-item>
            </template>
            <template #start>
              <b-navbar-item tag="router-link" :to="{ path: '/' }">
                Startseite
              </b-navbar-item>
              <b-navbar-item tag="router-link" :to="{ path: '/nonogram-overview' }">
                Nonogramm
              </b-navbar-item>
              <!--<b-navbar-item tag="router-link" :to="{ path: '/logical-overview' }">
                Logikrätsel
              </b-navbar-item>-->
              <b-navbar-dropdown label="Logikrätsel">
                <b-navbar-item tag="router-link" :to="{ path: '/logical-overview' }">
                  Lösen
                </b-navbar-item>
                <b-navbar-item tag="router-link" :to="{ path: '/logical-create' }">
                  Erstellen
                </b-navbar-item>
              </b-navbar-dropdown>
              <b-navbar-item tag="router-link" :to="{ path: '/linelog-overview' }">
                Linelog
              </b-navbar-item>           
            </template>

            <template #end>
              <b-dropdown 
                v-if="!isLoggedIn" 
                position="is-bottom-left" 
                append-to-body 
                aria-role="menu" 
                trap-focus
                :can-close="false"
              >
                <template #trigger>
                  <a class="navbar-item" role="button">
                    <span>Login</span>
                    <b-icon icon="menu-down"></b-icon>
                  </a>
                </template>

                <b-dropdown-item aria-role="menu-item" :focusable="false" custom paddingless>
                  <div class="modal-card" style="width:250px;">
                    <section class="modal-card-body">
                      <b-field label="E-Mail">
                        <input 
                          style="width: 100%" 
                          type="email" 
                          v-model="loginForm.email"
                        />
                      </b-field>

                      <b-field label="Passwort">
                        <input 
                          style="width: 100%" 
                          type="password" 
                          v-model="loginForm.password"
                        />
                      </b-field>

                      <router-link :to="{ path: '/forgot' }" class="navLink">
                        <a>Passwort vergessen?</a>
                      </router-link>

                      <button 
                        style="float: right"
                        @click="handleLogin"
                        :disabled="isLoading"
                      >
                        {{ isLoading ? 'Wird geladen...' : 'Login' }}
                      </button>

                      <div v-if="error" class="error-message" v-html="error"/>
                    </section>
                  </div>
                </b-dropdown-item>
              </b-dropdown>

              <b-navbar-item 
                v-if="!isLoggedIn" 
                tag="router-link" 
                :to="{ path: '/register' }"
              >
                Registrieren
              </b-navbar-item>

              <b-navbar-item 
                v-if="isLoggedIn" 
                tag="router-link" 
                :to="{ path: `/user/${currentUser?.id}` }"
              >
                <img 
                  class="avatarImg" 
                  src="@/assets/bear.svg"
                >
                <p>
                  Willkommen, {{ currentUser?.username }}
                </p>
              </b-navbar-item>

              <a 
                v-if="isLoggedIn"
                @click="handleLogout"
                class="navbar-item"
                role="button"
              >
                <span>Logout</span>
              </a>
            </template>
          </b-navbar>
        </div>
      </div>
      <div class="body">
        <div class="bodyContainer">
          <router-view v-slot="{ Component }">
            <keep-alive :include="['LinelogOverview', 'NonogramOverview', 'LogicalOverview']">
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </div>
      </div>
      <footer class="logFooter">
        <div class="content has-text-centered">
          <p>
            <strong>Logivilia</strong> by Jan Spieck. ©{{ new Date().getFullYear() }}, <router-link :to="`/impressum`" class="navLink">Impressum</router-link>
          </p>
        </div>
        <CookieConsent />
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/store/store'
import { useNotification } from '@/composables/useNotification'
import AuthenticationService from '@/services/AuthenticationService'
import CookieConsent from './components/CookieConsent.vue'

// Router and store setup
const router = useRouter()
const mainStore = useMainStore()
const { showNotification } = useNotification()

// Reactive state
const loginForm = ref({
  email: '',
  password: ''
})
const error = ref(null)
const isLoading = ref(false)

// Computed properties to replace authStore references
const isLoggedIn = computed(() => mainStore.isUserLoggedIn)
const currentUser = computed(() => mainStore.user)

// Methods
const getUserAvatar = (id) => {
  const paths = ["bear", "chicken", "cat"]
  const index = id ? id % paths.length: 0
  console.log(index)
  return new URL(`@/assets/${paths[index]}.svg`, import.meta.url).href
}

const handleLogin = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await AuthenticationService.login({
      email: loginForm.value.email,
      password: loginForm.value.password
    })

    mainStore.setToken(response.data.token)
    mainStore.setUser(response.data.user)
    
    loginForm.value = { email: '', password: '' }
    showNotification({
      message: 'Erfolgreich eingeloggt',
      type: 'success'
    })
  } catch (err) {
    error.value = err.response?.data?.error || 'Ein Fehler ist aufgetreten'
  } finally {
    isLoading.value = false
  }
}

const handleLogout = () => {
  mainStore.logout()
  router.push('/')
  showNotification({
    message: 'Erfolgreich ausgeloggt',
    type: 'success'
  })
}
</script>

<style>
html, body {
  height: 100%;
}

body {
  margin: 0;
  font-size: 15px;
  line-height: 23px;
  font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button {
  font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;
}

h1, h2, h3, h4 {
  color: #262664;
}

h2 {
  font-size: 24px;
}

#mainContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.avatarImg {
  border-radius: 37%;
  margin-right: 5px;
}

.logFooter {
  background: #fcfcfc;
  border-top: 2px solid #f2f2f2;
  flex-grow: 0;
  flex-shrink: 1;
  height: 55px;
  line-height: 55px;
}

#app {
  text-align: left;
  color: #2c3e50;
  background: #f5f5f5;
  height: 100%;
}

.body {
  flex-grow: 1;
  flex-shrink: 1;
  background: #f5f5f5;
  overflow-y: overlay;

  background: #ffffff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%23f1f1f1' stroke-width='1'%3E%3Cpath d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63'/%3E%3Cpath d='M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764'/%3E%3Cpath d='M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880'/%3E%3Cpath d='M520-140L578.5 42.5 731-63M603 493L539 269 237 261 370 105M902 382L539 269M390 382L102 382'/%3E%3Cpath d='M-222 42L126.5 79.5 370 105 539 269 577.5 41.5 927 80 769 229 902 382 603 493 731 737M295-36L577.5 41.5M578 842L295 764M40-201L127 80M102 382L-261 269'/%3E%3C/g%3E%3Cg fill='%23b3d2f4'%3E%3Ccircle cx='769' cy='229' r='5'/%3E%3Ccircle cx='539' cy='269' r='5'/%3E%3Ccircle cx='603' cy='493' r='5'/%3E%3Ccircle cx='731' cy='737' r='5'/%3E%3Ccircle cx='520' cy='660' r='5'/%3E%3Ccircle cx='309' cy='538' r='5'/%3E%3Ccircle cx='295' cy='764' r='5'/%3E%3Ccircle cx='40' cy='599' r='5'/%3E%3Ccircle cx='102' cy='382' r='5'/%3E%3Ccircle cx='127' cy='80' r='5'/%3E%3Ccircle cx='370' cy='105' r='5'/%3E%3Ccircle cx='578' cy='42' r='5'/%3E%3Ccircle cx='237' cy='261' r='5'/%3E%3Ccircle cx='390' cy='382' r='5'/%3E%3C/g%3E%3C/svg%3E");
}

.header {
  /* height: 60px;
  line-height: 60px;
  padding: 0 100px; 
  border-bottom: 2px solid #f2f2f2; */
  background: #fff; /* #fe4f6c; */
  flex-grow: 0;
  flex-shrink: 1;
}

.headerContainer, .bodyContainer {
  max-width: 1000px;
  padding: 0;
  margin: auto;
}

.bodyContainer {
  display: flex;
}

input {
  margin: 10px 0;
  display: block;
  padding: 10px;
  border-radius: 5px;
  border: none;
  background-color: #eee;
  position: relative;
}

input:focus {
  background-color: #fff;
  border: 1px solid #eee;
}

.puzzleContainer {
  box-shadow: 0 4px 10px rgb(8 112 184 / 16%);
}

@media (max-width: 1000px) {
  #app {
    background: #ffffffab;
  }
  .body {
    background: inherit;
  }
  .bodyContainer {
    max-width: 100%;
  }
  .overviewPage {
    padding: 20px;
  } 
  .puzzleContainer {
    margin: 0;
    border: none;
    box-shadow: none;
  }
  .websiteText {
    margin: 0;
    left: 0;
  }
  .imgCard {
    height: 350px;
    background-size: auto;
  }
  .subtile {
    display: block;
    width: 100%;
    padding: 0px;
  }
  .puzzleBody {
    background: none;
  }
}
.subimg {
  width: 300px;
}
@media (max-width: 350px) {
  .subimg {
    width: 100%;
  }
}

.logo {
  vertical-align: middle;
  font-size: 24px;
  color: #2128bd;
}

.navMenu {
  float: right;
  position: relative;
  z-index: 200;
  overflow: hidden;
}

.navList {
  list-style: none;
  margin: 0;
  padding: 0;
}

.navList li {
  float: left;
  margin: 0;
  padding: 0;
  position: relative;
  cursor: pointer;
  padding-right: 40px;
}

.navLink {
  color: #000;
  letter-spacing: 0;
  font-style: normal;
  text-decoration: none;
}

.navLink:hover {
  color: #da1260;
}

.error-message {
  color: #e74c3c;
  margin-top: 10px;
  font-size: 0.9rem;
}

.modal-card-body {
  padding: 20px;
  
  button {
    background: #3498db;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s ease;

    &:hover {
      background: #2980b9;
    }

    &:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }
  }
}

.avatarImg {
  width: 32px;
  height: 32px;
  margin-right: 8px;
}
</style>
