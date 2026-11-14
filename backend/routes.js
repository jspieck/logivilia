const express = require('express');
const AuthenticationController = require('./controllers/AuthenticationController');
const AuthenticationControllerPolicy = require('./policies/AuthenticationControllerPolicy');
const PuzzleController = require('./controllers/PuzzleController');
const UserController = require('./controllers/UserController');
const CommentController = require('./controllers/CommentController');
const CommentUpvoteController = require('./controllers/CommentUpvoteController');
const isAuthenticated = require('./policies/isAuthenticated');
const RankingController = require('./controllers/RankingController');
const rateLimit = require('./policies/rateLimit');
const AdminController = require('./controllers/AdminController');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const loginLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 10 });
// One budget per endpoint, so e.g. a few registrations from a shared IP do
// not block "forgot password" for everyone behind it.
const registerLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 5 });
const forgotLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 5 });
const resetLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 5 });
// The check endpoint answers "is this grid correct?", so it is limited to
// keep it from being used to brute-force small puzzles.
const checkLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

module.exports = () => {
  const router = express.Router();

  router.post('/register',
    registerLimiter,
    AuthenticationControllerPolicy.register,
    AuthenticationController.register);
  router.post('/login',
    loginLimiter,
    AuthenticationController.login);
  router.post('/forgot',
    forgotLimiter,
    AuthenticationController.forgot);
  router.post('/reset/:token',
    resetLimiter,
    AuthenticationControllerPolicy.reset,
    AuthenticationController.reset);

  // Admin diagnostics: sends a test e-mail and returns the SMTP result.
  router.post('/admin/test-mail',
    isAuthenticated,
    AdminController.testMail);

  // User Pages
  router.get('/users/:userId',
    UserController.show);

  // Update bio, age and co
  router.patch('/users/:userId',
    isAuthenticated,
    UserController.update);
  // IDs of the puzzles a user solved (?type=nonogram for one type).
  router.get('/users/:userId/solved',
    UserController.solved);

  // Comments
  router.get('/puzzles/:puzzleId/comments',
    CommentController.index);
  router.post('/puzzles/:puzzleId/comments',
    isAuthenticated,
    CommentController.post);
  router.delete('/comments/:commentId',
    isAuthenticated,
    CommentController.delete);

  // Comment Upvote Routes
  router.get('/commentupvote',
    isAuthenticated,
    CommentUpvoteController.show);
  router.post('/commentupvote/:commentId',
    isAuthenticated,
    CommentUpvoteController.post);
  router.delete('/commentupvote/:commentId',
    isAuthenticated,
    CommentUpvoteController.delete);

  // Puzzles, all types. The type's plugin (shared/puzzles) decides what is
  // stored, what players see and which answers are correct.
  router.get('/puzzles',
    PuzzleController.index);
  router.post('/puzzles',
    isAuthenticated,
    PuzzleController.post);
  router.get('/puzzles/legacy/:type/:legacyId',
    PuzzleController.legacy);
  router.get('/puzzles/:puzzleId',
    PuzzleController.show);
  router.put('/puzzles/:puzzleId',
    isAuthenticated,
    PuzzleController.put);
  router.post('/puzzles/:puzzleId/check',
    checkLimiter,
    PuzzleController.check);
  // The body must contain the answer, which is verified before the solve
  // is recorded.
  router.post('/puzzles/:puzzleId/solve',
    isAuthenticated,
    PuzzleController.solve);

  // The logged-in user's rating of a puzzle (1-5)
  router.get('/puzzles/:puzzleId/rating',
    isAuthenticated,
    PuzzleController.myRating);
  router.put('/puzzles/:puzzleId/rating',
    isAuthenticated,
    PuzzleController.rate);
  router.delete('/puzzles/:puzzleId/rating',
    isAuthenticated,
    PuzzleController.unrate);

  // Rankings Route
  router.get('/rankings',
    RankingController.index);

  // Health check route
  router.get('/', (req, res) => {
    res.json({ message: 'Backend API is running' });
  });

  return router;
};
