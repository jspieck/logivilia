import Api from '@/services/Api';

export default {
  // Public profile plus stats: { solved: { nonogram: n, ... }, created: {...} }
  show (userId) {
    return Api().get(`users/${userId}`);
  },
  update (userId, updatedProfile) {
    return Api().patch(`users/${userId}`, updatedProfile);
  },
  // Own account: everything stored about the user, as JSON
  exportData (userId) {
    return Api().get(`users/${userId}/export`);
  },
  // Own account: deletes it for good; needs the current password
  deleteAccount (userId, password) {
    return Api().delete(`users/${userId}`, { data: { password } });
  },
  // IDs of the puzzles the user solved, optionally of one type
  solved (userId, type) {
    return Api().get(`users/${userId}/solved`, { params: type ? { type } : {} });
  },
  // Top 10 per type: { nonogram: [...], linelog: [...], logical: [...] }
  getRankings () {
    return Api().get('rankings');
  }
};
