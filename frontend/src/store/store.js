import { defineStore } from 'pinia';

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
    storage: window.sessionStorage,
  }
});