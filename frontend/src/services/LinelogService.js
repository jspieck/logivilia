import Api from '@/services/Api';

export default {
  index () {
    return Api().get('linelog');
  },
  post(linelog) {
    return Api().post('linelog', linelog);
  },
  show(linelogId) {
    return Api().get(`linelog/${linelogId}`);
  },
  put(linelog) {
    return Api().put(`linelog/${linelog.id}`, linelog);
  }
};