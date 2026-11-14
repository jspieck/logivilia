import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store/store'
import i18n from './i18n'
// Bulma is used only as a CSS base (layout, typography, .button, .tag, ...).
// All interactive components come from Oruga.
import 'bulma/css/bulma.css'
// Register only the Oruga components the app uses, so the rest is tree-shaken.
import { OrugaConfig, Button, Dropdown, Field, Icon, Input, Modal, Notification, Table } from '@oruga-ui/oruga-next'
import '@oruga-ui/theme-oruga/dist/oruga.css'
import Autocomplete from '@trevoreyre/autocomplete-vue'
import '@/styles/searchbar.css'
import '@/styles/app.css'
import StarRating from '@/components/StarRating.vue'

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(i18n)
// The options object is required: OrugaConfig without it loses all defaults.
app.use(OrugaConfig, {})
for (const plugin of [Button, Dropdown, Field, Icon, Input, Modal, Notification, Table]) {
  app.use(plugin)
}
app.use(Autocomplete)
// Used in all overview tables and solve pages (replaces Buefy's b-rate).
app.component('StarRating', StarRating)

app.mount('#app')
