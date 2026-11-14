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
  },
  // Link from the verification e-mail; answers { user }
  verify (token) {
    return Api().post(`verify/${token}`);
  },
  // Logged in: send a new verification link
  resendVerification () {
    return Api().post('verify/resend');
  }
};