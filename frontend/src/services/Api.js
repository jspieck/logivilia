import axios from 'axios'
import { useMainStore } from '@/store/store'

export default () => {
  const store = useMainStore()
  
  return axios.create({
    // In production, use the Railway-provided URL
    baseURL: process.env.NODE_ENV === 'production' 
      ? 'backend-production-d51b.up.railway.app'  // Replace with your actual backend URL
      : 'http://localhost:8081',
    headers: {
      Authorization: `Bearer ${store.token}`
    },
    withCredentials: true
  })
}