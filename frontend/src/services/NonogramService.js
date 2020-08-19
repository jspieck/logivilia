import Api from '@/services/Api';

export default {
  index () {
    return Api().get('nonogram');
  },
  post(nonogram) {
    return Api().post('nonogram', nonogram);
  },
  show(nonogramId) {
    return Api().get(`nonogram/${nonogramId}`);
  },
  put(nonogram) {
    return Api().put(`nonogram/${nonogram.id}`, nonogram);
  }
};