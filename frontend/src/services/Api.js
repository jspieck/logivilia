import axios from 'axios'
import { useMainStore } from '@/store/store'

export default () => {
  const store = useMainStore()
  
  return axios.create({
    // baseURL: `https://logivilia.com`,
    baseURL: `http://localhost:8081`,
    headers: {
      Authorization: `Bearer ${store.token}`
    }
  })
}