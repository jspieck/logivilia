// Server for the browser smoke tests (npm run test:e2e): the real API on a
// fresh in-memory SQLite database, plus the built frontend (frontend/dist,
// so run `npm run build` first). Never touches a real database.
//
// Fixtures, in this order (so their IDs are 1, 2, 3):
//   1 tiny nonogram, 2 tiny linelog, 3 the first seed logical
// and one user, e2e@example.com / e2e-pass1 (unverified).

process.env.NODE_ENV = 'test';
process.env.TEST_DB_DIALECT = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-only-secret-that-is-at-least-32-characters';

const path = require('path');
const express = require('express');
const createApp = require('../backend/createApp');
const { Puzzle, User } = require('../backend/models');
const { resetDatabase } = require('../backend/migrator');
const { toPuzzleRow } = require('../backend/utils/legacyPuzzles');
const seedLogicals = require('../backend/seed/logicals.json');

const PORT = Number(process.env.E2E_PORT || 4173);
const DIST = path.join(__dirname, '..', 'frontend', 'dist');

async function fixtures () {
  await resetDatabase();
  // Colour 1 = colors[0]; the last colour is the background.
  await Puzzle.create({
    type: 'nonogram', name: 'E2E Nonogramm', difficulty: 1,
    data: { width: 2, height: 2, numColor: 1, colors: ['#000000', '#ffffff'], solution: [[1, 0], [1, 1]] }
  });
  await Puzzle.create({
    type: 'linelog', name: 'E2E Linelog', difficulty: 1,
    data: { width: 3, height: 1, numColor: 1, colors: ['#e53935', '#ffffff'], information: [[3, 0, 3]], solution: [[1, 1, 1]] }
  });
  await Puzzle.create({ ...toPuzzleRow('logical', seedLogicals[0], null), UserId: null });
  await User.create({ username: 'e2euser', email: 'e2e@example.com', password: 'e2e-pass1', role: 'Mitglied' });
}

fixtures().then(() => {
  const app = createApp();
  app.use(express.static(DIST));
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
  app.listen(PORT, () => console.log(`e2e server on http://localhost:${PORT}`));
}).catch(err => {
  console.error(err);
  process.exit(1);
});
