import Api from '@/services/Api';

export default {
  show (puzzleId) {
    return Api().get(`puzzles/${puzzleId}/comments`);
  },
  post (puzzleId, commentContent) {
    return Api().post(`puzzles/${puzzleId}/comments`, commentContent);
  },
  delete (commentId) {
    return Api().delete(`comments/${commentId}`);
  }
};
