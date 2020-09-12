import Api from '@/services/Api';

export default {
  show (riddleType, riddleId) {
    return Api().get(`comments/${riddleType}/${riddleId}`);
  },
  post (riddleType, riddleId, commentContent) {
    return Api().post(`comments/${riddleType}/${riddleId}`, commentContent);
  },
  delete (params) {
    return Api().delete('comments', params);
  }
};