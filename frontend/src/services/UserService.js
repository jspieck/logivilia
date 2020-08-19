import Api from '@/services/Api';

export default {
  show (userId) {
    return Api().get(`users/${userId}`);
  },
  linelogSolved (userId, linelogId) {
    return Api().patch(`users/${userId}/linelog/${linelogId}`);
  },
  nonogramSolved (userId, nonogramId) {
    return Api().patch(`users/${userId}/nonogram/${nonogramId}`);
  },
  logicalSolved (userId, logicalId) {
    return Api().patch(`users/${userId}/logical/${logicalId}`);
  }
};