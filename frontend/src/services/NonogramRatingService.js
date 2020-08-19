import Api from '@/services/Api';

export default {
  index () {
    return Api().get('nonogramratings');
  },
  show (nonogramId) {
    return Api().get(`nonogramratings/${nonogramId}`);
  },
  post (params) {
    return Api().post('nonogramratings', params);
  }
};