import Api from '@/services/Api';

export default {
  index () {
    return Api().get('linelogratings');
  },
  show (linelogId) {
    return Api().get(`linelogratings/${linelogId}`);
  },
  post (params) {
    return Api().post('linelogratings', params);
  }
};