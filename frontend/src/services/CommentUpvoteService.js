import Api from '@/services/Api';

export default {
  get () {
    return Api().get(`commentupvote`);
  },
  post (commentId) {
    return Api().post(`commentupvote/${commentId}`);
  },
  delete (commentId) {
    return Api().delete(`commentupvote/${commentId}`);
  }
};