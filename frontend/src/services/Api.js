import axios from 'axios'
import { useMainStore } from '@/store/store'

export default () => {
  const store = useMainStore()
  
  return axios.create({
    // Add https:// to the URL
    baseURL: process.env.NODE_ENV === 'production' 
      ? 'https://backend-production-d51b.up.railway.app'  // Added https://
      : 'http://localhost:8081',
    headers: {
      Authorization: `Bearer ${store.token}`
    },
    withCredentials: true
  })
}