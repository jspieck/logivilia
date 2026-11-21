import axios from 'axios'
import { useMainStore } from '@/store/store'
import i18n from '@/i18n'

export default () => {
  const store = useMainStore()
  
  return axios.create({
    baseURL: '/api',  // Relative URL, da wir über den gleichen Server servieren
    headers: {
      Authorization: `Bearer ${store.token}`,
      // The language of e-mails the server sends (backend/utils/mails.js).
      'Accept-Language': i18n.global.locale.value
    },
    withCredentials: true
  })
}