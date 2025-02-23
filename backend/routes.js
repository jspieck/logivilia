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

module.exports = () => {
  const router = express.Router();

  router.post('/register', 
    AuthenticationControllerPolicy.register,
    AuthenticationController.register);
  router.post('/login',
    AuthenticationController.login);
  router.post('/forgot',
    AuthenticationController.forgot);
  router.post('/reset/:token',
    AuthenticationControllerPolicy.reset,
    AuthenticationController.reset);

  // User Pages
  router.get('/users/:userId',
    UserController.show);
  
  // Update bio, age and co
  router.patch('/users/:userId',
    isAuthenticated,
    UserController.update);
  // A new Linelog was solved
  router.patch('/users/:userId/linelog/:linelogId',
    isAuthenticated,
    UserController.linelogSolved);
  // A new Nonogram was solved
  router.patch('/users/:userId/nonogram/:nonogramId',
    isAuthenticated,
    UserController.nonogramSolved);
  // A new Logical was solved
  router.patch('/users/:userId/logical/:logicalId',
    isAuthenticated,
    UserController.logicalSolved);

  // Comments Routes
  router.get('/comments/:riddleType/:riddleId',
    CommentController.index);
  router.post('/comments/:riddleType/:riddleId',
    isAuthenticated,
    CommentController.post);
  router.delete('/comments',
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
    LogicalController.put);
  router.get('/logical/:logicalId',
    LogicalController.show);
  router.post('/logical',
    LogicalController.post);

  // Nonogram Routes
  router.get('/nonogram',
    NonogramController.index);
  router.put('/nonogram/:nonogramId',
    NonogramController.put);
  router.get('/nonogram/:nonogramId',
    NonogramController.show);
  router.post('/nonogram',
    NonogramController.post);

  // Linelog Routes
  router.get('/linelog',
    LinelogController.index);
  router.put('/linelog/:linelogId',
    LinelogController.put);
  router.get('/linelog/:linelogId',
    LinelogController.show);
  router.post('/linelog',
    LinelogController.post);
  
  // Nonogram Rating Routes
  router.get('/nonogramratings',
    NonogramRatingController.index);
  router.post('/nonogramratings',
    isAuthenticated,
    NonogramRatingController.post);
  router.delete('/nonogramratings',
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
  router.delete('/linelogratings',
    isAuthenticated,
    LinelogRatingController.delete);
  router.get('/linelogratings/:linelogId',
    isAuthenticated,
    LinelogRatingController.show);

  router.get('/logicalratings',
    LogicalRatingController.index);
  router.post('/logicalratings',
    isAuthenticated,
    LogicalRatingController.post);
  router.delete('/logicalratings',
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
    res.json({ message: 'Backend API is running' })
  });

  return router;
};