import axios from 'axios'
import { useMainStore } from '@/store/store'

export default () => {
  const store = useMainStore()
  
  return axios.create({
    baseURL: '/api',  // Relative URL, da wir über den gleichen Server servieren
    headers: {
      Authorization: `Bearer ${store.token}`
    },
    withCredentials: true
  })
}