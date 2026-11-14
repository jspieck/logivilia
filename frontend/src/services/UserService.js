import Api from '@/services/Api';

export default {
  show (userId) {
    return Api().get(`users/${userId}`);
  },
  update (userId, updatedProfile) {
    return Api().patch(`users/${userId}`, updatedProfile);
  },
  // grid: 2D array in the stored encoding (0 = empty, k = colour k)
  linelogSolved (userId, linelogId, grid) {
    return Api().patch(`users/${userId}/linelog/${linelogId}`, { grid });
  },
  // grid: 2D array in the stored encoding (0 = empty, k = colour k)
  nonogramSolved (userId, nonogramId, grid) {
    return Api().patch(`users/${userId}/nonogram/${nonogramId}`, { grid });
  },
  // solution: table with the same shape as the logical's solution
  logicalSolved (userId, logicalId, solution) {
    return Api().patch(`users/${userId}/logical/${logicalId}`, { solution });
  },
  getRankings () {
    return Api().get('rankings');
  }
};
