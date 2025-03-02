<template>
  <div id="app">
    <div id="mainContainer">
      <div class="header">
        <div class="headerContainer">
          <b-navbar>
            <template #brand>
              <b-navbar-item tag="router-link" :to="{ path: '/' }" class="pageLogo">
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
              <b-navbar-item tag="router-link" :to="{ path: '/leaderboard' }">
                Bestenliste
              </b-navbar-item>
            </template>

            <template #end>
              <div class="login-dropdown-container">
                <LoginDropdown v-if="!isLoggedIn" />
              </div>

              <b-navbar-item 
                v-if="!isLoggedIn" 
                tag="router-link" 
                :to="{ path: '/register' }"
                class="register-nav-button"
              >
                Registrieren
              </b-navbar-item>

              <b-navbar-item 
                v-if="isLoggedIn" 
                tag="router-link" 
                :to="{ path: `/user/${currentUser?.id}` }"
                class="user-profile-link"
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
                class="navbar-item logout-button"
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
import CookieConsent from './components/CookieConsent.vue'
import LoginDropdown from './components/LoginDropdown.vue'

// Router and store setup
const router = useRouter()
const mainStore = useMainStore()
const { showNotification } = useNotification()

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

const handleLogout = () => {
  mainStore.logout()
  router.push('/')
  showNotification({
    message: 'Erfolgreich ausgeloggt',
    type: 'success'
  })
}
</script>

<style lang="scss">
// Prevent any scrolling on html/body
html, body {
  height: 100%;
  overflow: hidden; /* Prevent scrolling on both */
  margin: 0;
}

body {
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
  flex-shrink: 0; /* Prevent footer from shrinking */
  height: 55px;
  line-height: 55px;
}

#app {
  text-align: left;
  color: #2c3e50;
  height: 100%;
}

.body {
  flex-grow: 1;
  flex-shrink: 1;
  overflow-y: scroll; /* Only this element should scroll */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%23f1f1f1' stroke-width='1'%3E%3Cpath d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63'/%3E%3Cpath d='M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764'/%3E%3Cpath d='M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880'/%3E%3Cpath d='M520-140L578.5 42.5 731-63M603 493L539 269 237 261 370 105M902 382L539 269M390 382L102 382'/%3E%3Cpath d='M-222 42L126.5 79.5 370 105 539 269 577.5 41.5 927 80 769 229 902 382 603 493 731 737M295-36L577.5 41.5M578 842L295 764M40-201L127 80M102 382L-261 269'/%3E%3C/g%3E%3Cg fill='%23b3d2f4'%3E%3Ccircle cx='769' cy='229' r='5'/%3E%3Ccircle cx='539' cy='269' r='5'/%3E%3Ccircle cx='603' cy='493' r='5'/%3E%3Ccircle cx='731' cy='737' r='5'/%3E%3Ccircle cx='520' cy='660' r='5'/%3E%3Ccircle cx='309' cy='538' r='5'/%3E%3Ccircle cx='295' cy='764' r='5'/%3E%3Ccircle cx='40' cy='599' r='5'/%3E%3Ccircle cx='102' cy='382' r='5'/%3E%3Ccircle cx='127' cy='80' r='5'/%3E%3Ccircle cx='370' cy='105' r='5'/%3E%3Ccircle cx='578' cy='42' r='5'/%3E%3Ccircle cx='237' cy='261' r='5'/%3E%3Ccircle cx='390' cy='382' r='5'/%3E%3C/g%3E%3C/svg%3E");
  width: 100vw;
}

.header {
  background: #fff;
  flex-grow: 0;
  flex-shrink: 0; /* Prevent header from shrinking */
}

.headerContainer, .bodyContainer {
  max-width: 1000px;
  width: 90%;
  padding: 0;
  margin: auto;
}

.bodyContainer {
  display: flex;
  background: white;
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

.pageLogo {
  padding-left: 0px!important;
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

.logoutButton {
  background: #f0f0f0;
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

.navbar {
  width: 100%;  // Take full width of headerContainer
}

.navbar-item {
  padding: 0.5rem 0.75rem;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  width: 90%;
  padding: 2rem 0;
}

// If you're using Oruga's navbar, you might need to override its styles
.o-nav {
  &__menu {
    width: auto;  // Prevent menu from expanding beyond content
  }
  
  &__item {
    width: auto;  // Prevent items from expanding
  }
}

// Add this at the top to ensure consistent scrollbar behavior
html {
  overflow: hidden;
}

// Enhanced Login Dropdown Styles
.login-dropdown-container {
  position: relative;
}

.dropdown-content {
  background-color: transparent!important;
}

.forgot-password {
  text-align: right;
  margin-bottom: 1.2rem;
  
  a {
    color: #6e8efb;
    font-size: 0.8rem;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.login-submit-button {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  
  &:hover {
    box-shadow: 0 5px 15px rgba(110, 142, 251, 0.4);
    background: linear-gradient(135deg, #4e6ecb, #a777e3);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
  }
  
  .button-glow {
    position: absolute;
    width: 50px;
    height: 100%;
    top: 0;
    left: -100px;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.3) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: glow 2s infinite;
    pointer-events: none;
  }
}

.error-message {
  color: #f44336;
  margin-top: 1rem;
  text-align: center;
  font-size: 0.9rem;
}

.register-link {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: #666;
  
  a {
    color: #6e8efb;
    font-weight: 500;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.user-profile-link {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(110, 142, 251, 0.1);
  }
  
  .avatarImg {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    margin-right: 10px;
    border: 2px solid #6e8efb;
  }
  
  p {
    margin: 0;
    font-weight: 500;
  }
}

.logout-button {
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-left: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #f0f0f0;
    color: #e74c3c;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes glow {
  0% { left: -100px; }
  100% { left: 100%; }
}

// Mobile responsiveness
@media (max-width: 768px) {
  .navbar-menu {
    padding: 0.5rem;
  }
  
  .navbar-item {
    padding: 0.5rem;
  }
  
  .login-button, .register-nav-button, .logout-button {
    padding: 0.5rem;
    margin: 0.25rem;
  }
}

// Add a mobile overlay for better UX
@media (max-width: 768px) {
  body.has-dropdown-active {
    overflow: hidden;
  }
  
  .dropdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    display: none;
  }
  
  .dropdown.enhanced-dropdown.is-active + .dropdown-overlay {
    display: block;
  }
}
</style>
