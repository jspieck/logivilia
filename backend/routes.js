const express = require('express');
const AuthenticationController = require('./controllers/AuthenticationController');
const AuthenticationControllerPolicy = require('./policies/AuthenticationControllerPolicy');
const LogicalController = require('./controllers/LogicalController');
const LogicalRatingController = require('./controllers/LogicalRatingController');
const NonogramRatingController = require('./controllers/NonogramRatingController');
const LinelogRatingController = require('./controllers/LinelogRatingController');
const NonogramController = require('./controllers/NonogramController');
const LinelogController = require('./controllers/LinelogController');
const UserController = require('./controllers/UserController');
const CommentController = require('./controllers/CommentController');
const CommentUpvoteController = require('./controllers/CommentUpvoteController');
const isAuthenticated = require('./policies/isAuthenticated');
const RankingController = require('./controllers/RankingController');
const rateLimit = require('./policies/rateLimit');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const loginLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 10 });
// One budget per endpoint, so e.g. a few registrations from a shared IP do
// not block "forgot password" for everyone behind it.
const registerLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 5 });
const forgotLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 5 });
const resetLimiter = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 5 });

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

  // User Pages
  router.get('/users/:userId',
    UserController.show);

  // Update bio, age and co
  router.patch('/users/:userId',
    isAuthenticated,
    UserController.update);
  // A puzzle was solved. The body must contain the solved grid, which is
  // verified on the server before the puzzle is counted.
  router.patch('/users/:userId/linelog/:linelogId',
    isAuthenticated,
    UserController.linelogSolved);
  router.patch('/users/:userId/nonogram/:nonogramId',
    isAuthenticated,
    UserController.nonogramSolved);
  router.patch('/users/:userId/logical/:logicalId',
    isAuthenticated,
    UserController.logicalSolved);

  // Comments Routes
  router.get('/comments/:riddleType/:riddleId',
    CommentController.index);
  router.post('/comments/:riddleType/:riddleId',
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

  // Logical Routes
  router.get('/logical',
    LogicalController.index);
  router.put('/logical/:logicalId',
    isAuthenticated,
    LogicalController.put);
  router.get('/logical/:logicalId',
    LogicalController.show);
  router.post('/logical',
    isAuthenticated,
    LogicalController.post);

  // Nonogram Routes
  router.get('/nonogram',
    NonogramController.index);
  router.put('/nonogram/:nonogramId',
    isAuthenticated,
    NonogramController.put);
  router.get('/nonogram/:nonogramId',
    NonogramController.show);
  router.post('/nonogram',
    isAuthenticated,
    NonogramController.post);

  // Linelog Routes
  router.get('/linelog',
    LinelogController.index);
  router.put('/linelog/:linelogId',
    isAuthenticated,
    LinelogController.put);
  router.get('/linelog/:linelogId',
    LinelogController.show);
  router.post('/linelog',
    isAuthenticated,
    LinelogController.post);

  // Nonogram Rating Routes
  router.get('/nonogramratings',
    NonogramRatingController.index);
  router.post('/nonogramratings',
    isAuthenticated,
    NonogramRatingController.post);
  router.delete('/nonogramratings/:nonogramRatingId',
    isAuthenticated,
    NonogramRatingController.delete);
  router.get('/nonogramratings/:nonogramId',
    isAuthenticated,
    NonogramRatingController.show);

  // Linelog Rating Routes
  router.get('/linelogratings',
    LinelogRatingController.index);
  router.post('/linelogratings',
    isAuthenticated,
    LinelogRatingController.post);
  router.delete('/linelogratings/:linelogRatingId',
    isAuthenticated,
    LinelogRatingController.delete);
  router.get('/linelogratings/:linelogId',
    isAuthenticated,
    LinelogRatingController.show);

  // Logical Rating Routes
  router.get('/logicalratings',
    LogicalRatingController.index);
  router.post('/logicalratings',
    isAuthenticated,
    LogicalRatingController.post);
  router.delete('/logicalratings/:logicalRatingId',
    isAuthenticated,
    LogicalRatingController.delete);
  router.get('/logicalratings/:logicalId',
    isAuthenticated,
    LogicalRatingController.show);

  // Rankings Route
  router.get('/rankings',
    RankingController.index);

  // Health check route
  router.get('/', (req, res) => {
    res.json({ message: 'Backend API is running' });
  });

  return router;
};
