import Api from '@/services/Api';

export default {
  index () {
    return Api().get('logicalratings');
  },
  show (logicalId) {
    return Api().get(`logicalratings/${logicalId}`);
  },
  post (params) {
    return Api().post('logicalratings', params);
  }
};