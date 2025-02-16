import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store/store'
import Buefy from 'buefy'
import 'buefy/dist/buefy.css'
import Oruga from '@oruga-ui/oruga-next';
import '@oruga-ui/theme-oruga/dist/oruga.css'
import Autocomplete from '@trevoreyre/autocomplete-vue'
import '@/styles/searchbar.css'
import VueCookies from 'vue-cookies'
import '@/styles/app.css'

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(Buefy)
app.use(Oruga)
app.use(Autocomplete)
app.use(VueCookies)

app.config.productionTip = false

app.mount('#app')
