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
  // One page of an overview: { type, page, perPage, sort, order, q, author,
  // minSize, maxSize, minColors, maxColors, minDifficulty, maxDifficulty,
  // minRating, status: 'solved' | 'unsolved' } (all but page optional)
  // -> { items, total, page, perPage }
  list (params) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''));
    return Api().get('puzzles', { params: clean });
  },
  // { id } of the next puzzle of the same type the player has not solved
  // (for guests simply the next one), or { id: null }.
  next (puzzleId) {
    return Api().get(`puzzles/${puzzleId}/next`);
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
  // Records a solve (and the time in seconds, optional) for the logged-in
  // user; 400 SOLUTION_INCORRECT if wrong.
  // -> { solved, firstSolve, bestSeconds, newBest }
  solve (puzzleId, answer, seconds) {
    return Api().post(`puzzles/${puzzleId}/solve`, { answer, seconds });
  },
  // The logged-in user's saved game and best time:
  // { progress: { state, updatedAt } | null, bestSeconds }
  // (saving goes through puzzles/engine/progress.js)
  progress (puzzleId) {
    return Api().get(`puzzles/${puzzleId}/progress`);
  },
  // The logged-in user's rating: { rating: 1..5 | null }
  myRating (puzzleId) {
    return Api().get(`puzzles/${puzzleId}/rating`);
  },
  rate (puzzleId, rating) {
    return Api().put(`puzzles/${puzzleId}/rating`, { rating });
  }
};
