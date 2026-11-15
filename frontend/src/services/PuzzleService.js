import Api from '@/services/Api';

// One service for every puzzle type (see shared/puzzles for the types).
export default {
  // Start page: { counts, daily, popular, topPlayers } (summaries only)
  home () {
    return Api().get('home');
  },
  // type: 'nonogram' | 'linelog' | 'logical'; omit for all types
  index (type) {
    return Api().get('puzzles', { params: type ? { type } : {} });
  },
  show (puzzleId) {
    return Api().get(`puzzles/${puzzleId}`);
  },
  // New ID of a puzzle from the old per-type tables (old links)
  legacy (type, legacyId) {
    return Api().get(`puzzles/legacy/${type}/${legacyId}`);
  },
  // Owner or Admin: the puzzle with its solution, for the editor.
  source (puzzleId) {
    return Api().get(`puzzles/${puzzleId}/source`);
  },
  // puzzle: { type, name, difficulty, ...the type's data fields }
  post (puzzle) {
    return Api().post('puzzles', puzzle);
  },
  put (puzzle) {
    return Api().put(`puzzles/${puzzle.id}`, puzzle);
  },
  // Is this answer correct? Records nothing; works for guests.
  check (puzzleId, answer) {
    return Api().post(`puzzles/${puzzleId}/check`, { answer });
  },
  // Records a solve for the logged-in user; 400 SOLUTION_INCORRECT if wrong.
  solve (puzzleId, answer) {
    return Api().post(`puzzles/${puzzleId}/solve`, { answer });
  },
  // The logged-in user's rating: { rating: 1..5 | null }
  myRating (puzzleId) {
    return Api().get(`puzzles/${puzzleId}/rating`);
  },
  rate (puzzleId, rating) {
    return Api().put(`puzzles/${puzzleId}/rating`, { rating });
  }
};
