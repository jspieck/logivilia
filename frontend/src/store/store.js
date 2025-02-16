import { defineStore } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createPinia } from 'pinia'

// Create pinia instance
const pinia = createPinia()

// Use the persistence plugin
pinia.use(piniaPluginPersistedstate)

export const useMainStore = defineStore('main', {
  state: () => ({
    token: null,
    user: null,
    isUserLoggedIn: false
  }),
  actions: {
    setToken(token) {
      this.token = token;
      this.isUserLoggedIn = !!token;
    },
    setUser(user) {
      this.user = user;
    },
    logout() {
      this.token = null
      this.user = null
      this.isUserLoggedIn = false
    }
  },
  persist: {
    key: 'logivilia-store',
    storage: sessionStorage,
    paths: ['token', 'user', 'isUserLoggedIn'], // specify which state properties to persist
  }
});

export default pinia;