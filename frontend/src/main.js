import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import Buefy from 'buefy'
import 'buefy/dist/buefy.css'
import Oruga from '@oruga-ui/oruga-next';
import Autocomplete from '@trevoreyre/autocomplete-vue'
import '@/styles/searchbar.css'
import VueCookies from 'vue-cookies'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(Buefy)
app.use(Oruga)
app.use(Autocomplete)
app.use(VueCookies)

app.config.compilerOptions.isCustomElement = tag => tag.startsWith('ion-')
app.config.productionTip = false

app.mount('#app')
