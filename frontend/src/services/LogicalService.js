import Api from '@/services/Api';

export default {
  index () {
    return Api().get('logical');
  },
  post(logical) {
    return Api().post('logical', logical);
  },
  show(logicalId) {
    return Api().get(`logical/${logicalId}`);
  },
  put(logical) {
    return Api().put(`logical/${logical.id}`, logical);
  },
  // solution: one row per value of the first attribute, that value first
  check(logicalId, solution) {
    return Api().post(`logical/${logicalId}/check`, { solution });
  }
};