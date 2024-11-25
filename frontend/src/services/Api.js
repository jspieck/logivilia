import axios from 'axios';
import store from '@/store/store'

// http:localhost:8081
export default () => {
  return axios.create({
    // baseURL: `https://logivilia.com`,
    baseURL: `http://localhost:8081`,
    headers: {
      Authorization: `Bearer ${store.state.token}`
    }
  });
};