<template>
  <div id="app">
    <div id="mainContainer">
      <div class="header">
        <div class="headerContainer">
          <!-- Bulma navbar markup (same structure Buefy's b-navbar rendered). -->
          <nav ref="navRef" class="navbar" role="navigation" :aria-label="t('nav.mainNav')" @click="onNavClick">
            <div class="navbar-brand">
              <router-link :to="{ path: '/' }" class="navbar-item pageLogo">
                <img src="@/assets/logo.svg" alt="Logivilia">
              </router-link>
              <a
                role="button"
                class="navbar-burger"
                :class="{ 'is-active': menuOpen }"
                :aria-label="t('nav.menu')"
                :aria-expanded="menuOpen ? 'true' : 'false'"
                @click.stop="menuOpen = !menuOpen"
              >
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
              </a>
            </div>

            <div class="navbar-menu" :class="{ 'is-active': menuOpen }">
              <div class="navbar-start">
                <router-link class="navbar-item" :to="{ path: '/' }">
                  {{ t('nav.home') }}
                </router-link>
                <!-- The heading itself opens the overview; hovering shows "Erstellen".
                     After a click the dropdown stays hidden until the mouse leaves. -->
                <div
                  v-for="menu in dropdowns"
                  :key="menu.key"
                  class="navbar-item has-dropdown is-hoverable"
                  :class="{ 'hover-suppressed': suppressed === menu.key }"
                  :data-menu="menu.key"
                  @mouseleave="suppressed = null"
                >
                  <router-link class="navbar-link" :to="menu.overview">
                    {{ t(menu.label) }}
                  </router-link>
                  <div class="navbar-dropdown">
                    <router-link class="navbar-item" :to="menu.overview">
                      {{ t('nav.solve') }}
                    </router-link>
                    <router-link class="navbar-item" :to="menu.create">
                      {{ t('nav.create') }}
                    </router-link>
                  </div>
                </div>
                <router-link class="navbar-item" :to="{ path: '/leaderboard' }">
                  {{ t('nav.leaderboard') }}
                </router-link>
              </div>

              <div class="navbar-end">
                <div class="navbar-item language-switch" role="group" :aria-label="t('nav.language')" :title="t('nav.language')">
                  <ion-icon name="globe-outline" aria-hidden="true"></ion-icon>
                  <div class="language-options">
                    <button
                      v-for="l in SUPPORTED_LOCALES"
                      :key="l"
                      type="button"
                      :class="{ active: locale === l }"
                      :aria-pressed="locale === l"
                      :lang="l"
                      :title="LOCALE_NAMES[l]"
                      @click="setLocale(l)"
                    >{{ l.toUpperCase() }}</button>
                  </div>
                </div>

                <div class="login-dropdown-container">
                  <LoginDropdown v-if="!isLoggedIn" />
                </div>

                <router-link
                  v-if="!isLoggedIn"
                  :to="{ path: '/register' }"
                  class="navbar-item register-nav-button"
                >
                  {{ t('nav.register') }}
                </router-link>

                <router-link
                  v-if="isLoggedIn"
                  :to="{ path: `/user/${currentUser?.id}` }"
                  class="navbar-item user-profile-link"
                >
                  <img
                    class="avatarImg"
                    src="@/assets/bear.svg"
                  >
                  <p :title="t('nav.welcome', { name: currentUser?.username })">
                    {{ currentUser?.username }}
                  </p>
                </router-link>

                <a
                  v-if="isLoggedIn"
                  @click="handleLogout"
                  class="navbar-item logout-button"
                  role="button"
                >
                  <span>{{ t('nav.logout') }}</span>
                </a>
              </div>
            </div>
          </nav>
        </div>
      </div>
      <div ref="bodyRef" class="body">
        <div v-if="needsVerification" class="verify-banner" role="status">
          {{ t('banner.verify') }}
          <button class="button is-primary is-small" :disabled="resendBusy" @click="resendVerification">{{ t('banner.resend') }}</button>
        </div>
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
            <strong>Logivilia</strong> by Jan Spieck. ©{{ new Date().getFullYear() }}, <router-link to="/impressum" class="navLink">{{ t('footer.imprint') }}</router-link>, <router-link to="/datenschutz" class="navLink">{{ t('footer.privacy') }}</router-link>
            <span class="footer-languages" role="group" :aria-label="t('nav.language')">
            <ion-icon name="globe-outline" aria-hidden="true"></ion-icon>
            <template v-for="(l, i) in SUPPORTED_LOCALES" :key="l">
              <span v-if="i > 0" aria-hidden="true"> · </span>
              <a
                href="#"
                :lang="l"
                :class="{ active: locale === l }"
                :aria-current="locale === l ? 'true' : undefined"
                @click.prevent="setLocale(l)"
              >{{ LOCALE_NAMES[l] }}</a>
            </template>
            </span>
          </p>
        </div>
        <CookieConsent />
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMainStore } from '@/store/store'
import { useNotification } from '@/composables/useNotification'
import CookieConsent from './components/CookieConsent.vue'
import LoginDropdown from './components/LoginDropdown.vue'
import AuthenticationService from '@/services/AuthenticationService'
import { apiErrorMessage, setLocale, SUPPORTED_LOCALES, LOCALE_NAMES } from '@/i18n'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// Router and store setup
const router = useRouter()
const route = useRoute()

// Burger menu (mobile) and the hover dropdowns (desktop). Any click on a
// link closes everything; so does a click outside the navbar.
const navRef = ref(null)
const menuOpen = ref(false)
const suppressed = ref(null)
const dropdowns = [
  { key: 'nonogram', label: 'nav.nonogram', overview: '/nonogram-overview', create: '/nonogram-create' },
  { key: 'logical', label: 'nav.logical', overview: '/logical-overview', create: '/logical-create' },
  { key: 'linelog', label: 'nav.linelog', overview: '/linelog-overview', create: '/linelog-create' }
]

const onNavClick = (event) => {
  const link = event.target.closest('a[href]')
  if (!link) return
  menuOpen.value = false
  // Bulma also opens a dropdown on :focus-within, so a clicked link would
  // keep it open. Keyboard users keep focus (detail === 0 for Enter).
  if (event.detail > 0) link.blur()
  // Hide the dropdown that was clicked in until the pointer leaves it.
  suppressed.value = link.closest('[data-menu]')?.dataset.menu ?? null
}

const onDocumentClick = (event) => {
  if (menuOpen.value && navRef.value && !navRef.value.contains(event.target)) menuOpen.value = false
}
// Width of .body's scrollbar (0 for overlay scrollbars); see .header.
const bodyRef = ref(null)
const measureScrollbar = () => {
  const el = bodyRef.value
  if (el) document.documentElement.style.setProperty('--scrollbar-width', `${el.offsetWidth - el.clientWidth}px`)
}
onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('resize', measureScrollbar)
  measureScrollbar()
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('resize', measureScrollbar)
})
watch(() => route.fullPath, () => { menuOpen.value = false })

const mainStore = useMainStore()
const { showNotification } = useNotification()

// Computed properties to replace authStore references
const isLoggedIn = computed(() => mainStore.isUserLoggedIn)
const currentUser = computed(() => mainStore.user)

// Accounts created before verification existed have no flag in an old
// session; only an explicit false shows the banner.
const needsVerification = computed(() => isLoggedIn.value && currentUser.value?.emailVerified === false)
const resendBusy = ref(false)

const resendVerification = async () => {
  resendBusy.value = true
  try {
    const { data } = await AuthenticationService.resendVerification()
    if (data.user) {
      // Verified in the meantime (e.g. in another tab)
      mainStore.setUser({ ...mainStore.user, ...data.user })
    } else {
      showNotification({ message: t(`messages.${data.message}`), type: 'success' })
    }
  } catch (err) {
    showNotification({ message: apiErrorMessage(err), type: 'danger' })
  } finally {
    resendBusy.value = false
  }
}

const handleLogout = () => {
  mainStore.logout()
  router.push('/')
  showNotification({
    message: t('nav.loggedOut'),
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
  scrollbar-gutter: stable;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%23f1f1f1' stroke-width='1'%3E%3Cpath d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63'/%3E%3Cpath d='M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764'/%3E%3Cpath d='M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880'/%3E%3Cpath d='M520-140L578.5 42.5 731-63M603 493L539 269 237 261 370 105M902 382L539 269M390 382L102 382'/%3E%3Cpath d='M-222 42L126.5 79.5 370 105 539 269 577.5 41.5 927 80 769 229 902 382 603 493 731 737M295-36L577.5 41.5M578 842L295 764M40-201L127 80M102 382L-261 269'/%3E%3C/g%3E%3Cg fill='%23b3d2f4'%3E%3Ccircle cx='769' cy='229' r='5'/%3E%3Ccircle cx='539' cy='269' r='5'/%3E%3Ccircle cx='603' cy='493' r='5'/%3E%3Ccircle cx='731' cy='737' r='5'/%3E%3Ccircle cx='520' cy='660' r='5'/%3E%3Ccircle cx='309' cy='538' r='5'/%3E%3Ccircle cx='295' cy='764' r='5'/%3E%3Ccircle cx='40' cy='599' r='5'/%3E%3Ccircle cx='102' cy='382' r='5'/%3E%3Ccircle cx='127' cy='80' r='5'/%3E%3Ccircle cx='370' cy='105' r='5'/%3E%3Ccircle cx='578' cy='42' r='5'/%3E%3Ccircle cx='237' cy='261' r='5'/%3E%3Ccircle cx='390' cy='382' r='5'/%3E%3C/g%3E%3C/svg%3E");
  width: 100%;
}

.header {
  // The page below scrolls inside .body, whose scrollbar takes width from
  // its content. The same room is left free here so header and page line up.
  padding-right: var(--scrollbar-width, 0px);
  background: #fff;
  flex-grow: 0;
  flex-shrink: 0; /* Prevent header from shrinking */
}

// Header, banner and page share one width so they line up.
:root {
  --page-width: 1200px;
}

.headerContainer, .bodyContainer {
  max-width: var(--page-width);
  width: calc(100% - 48px);
  padding: 0;
  margin: auto;
}

.bodyContainer {
  display: flex;
  background: white;
}

// Phones: less empty room at the sides.
@media (max-width: 768px) {
  .headerContainer, .bodyContainer {
    width: calc(100% - 16px);
  }
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

.verify-banner {
  max-width: var(--page-width);
  width: calc(100% - 48px);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0.6rem 1rem;
  background: #fff8e1;
  border: 1px solid #ffe08a;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

@media (min-width: 1024px) {
  // Must beat Bulma's `.navbar-item.is-hoverable:hover .navbar-dropdown`.
  .navbar-item.has-dropdown.is-hoverable.hover-suppressed .navbar-dropdown {
    display: none;
  }
}

.language-switch {
  gap: 6px;

  > ion-icon {
    font-size: 18px;
    color: #7957d5;
  }

  .language-options {
    display: inline-flex;
    padding: 2px;
    border: 1px solid #d8cff5;
    border-radius: 8px;
    background: #faf8ff;
  }

  button {
    padding: 3px 9px;
    border: none;
    border-radius: 6px;
    background: none;
    color: #6b7280;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;

    &:hover { color: #262664; }

    &.active {
      background: #7957d5;
      color: #fff;
    }
  }
}

.footer-languages {
  margin-left: 1rem;
  white-space: nowrap;

  ion-icon {
    vertical-align: -2px;
    margin-right: 4px;
  }

  a {
    color: inherit;

    &.active {
      font-weight: 700;
      color: #7957d5;
    }
  }
}

.error-message {
  color: #e74c3c;
  margin-top: 10px;
  font-size: 0.9rem;
}

.logoutButton {
  background: #f0f0f0;
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
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// Between the burger breakpoint and the full page width the desktop navbar
// has to squeeze into less room.
@media (min-width: 1024px) and (max-width: 1250px) {
  .navbar .navbar-item, .navbar .navbar-link {
    padding-left: 0.45rem;
    padding-right: 0.45rem;
  }

  .navbar .navbar-link:not(.is-arrowless) {
    padding-right: 1.9em;
  }

  .navbar .navbar-item.has-dropdown {
    padding: 0;
  }

  .user-profile-link p {
    max-width: 100px;
  }

  .language-switch > ion-icon {
    display: none;
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
