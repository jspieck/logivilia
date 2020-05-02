import VueCookies from 'vue-cookies';
import Vue from 'vue'
import App from './App.vue'
import router from './router';
import Buefy from 'buefy'
import '@/styles/buefy.css';

Vue.use(Buefy)
Vue.use(VueCookies);

Vue.config.productionTip = false

/* eslint-disable no-new
new Vue({
  el: '#app',
  router,
  render: h => h(App),
  components: { App },
  template: '<App/>',
});*/

new Vue({
  router,
  render: h => h(App),
}).$mount('#app') 
