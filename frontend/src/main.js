import VueCookies from 'vue-cookies';
import Vue from 'vue'
import App from './App.vue'
import router from './router';
import Buefy from 'buefy'
import { sync } from 'vuex-router-sync';
import store from '@/store/store';
import '@/styles/buefy.css';
import Autocomplete from '@trevoreyre/autocomplete-vue'
import '@/styles/searchbar.css'

Vue.use(Autocomplete);
Vue.use(Buefy);
Vue.use(VueCookies);

Vue.config.ignoredElements = [/^ion-/];
Vue.config.productionTip = false;

sync(store, router);

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app');
