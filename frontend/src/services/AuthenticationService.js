import Api from '@/services/Api';

export default {
  register (credentials) {
    return Api().post('register', credentials);
  },
  login (credentials) {
    return Api().post('login', credentials);
  },
  forgot (email) {
    return Api().post('forgot', email);
  },
  reset (token, password) {
    return Api().post(`reset/${token}`, password);
  }
};