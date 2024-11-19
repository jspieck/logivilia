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

module.exports = (app) => {
  app.post('/register', 
    AuthenticationControllerPolicy.register,
    AuthenticationController.register);
  app.post('/login',
    AuthenticationController.login);
  app.post('/forgot',
    AuthenticationController.forgot);
  app.post('/reset/:token',
    AuthenticationControllerPolicy.reset,
    AuthenticationController.reset);

  // User Pages
  app.get('/users/:userId',
    UserController.show);
  
  // Update bio, age and co
  app.patch('/users/:userId',
    isAuthenticated,
    UserController.update);
  // A new Linelog was solved
  app.patch('/users/:userId/linelog/:linelogId',
    isAuthenticated,
    UserController.linelogSolved);
  // A new Nonogram was solved
  app.patch('/users/:userId/nonogram/:nonogramId',
    isAuthenticated,
    UserController.nonogramSolved);
  // A new Logical was solved
  app.patch('/users/:userId/logical/:logicalId',
    isAuthenticated,
    UserController.logicalSolved);

  // Comments Routes
  app.get('/comments/:riddleType/:riddleId',
    CommentController.index);
  app.post('/comments/:riddleType/:riddleId',
    isAuthenticated,
    CommentController.post);
  app.delete('/comments',
    isAuthenticated,
    CommentController.delete);

  // Comment Upvote Routes
  app.get('/commentupvote',
    isAuthenticated,
    CommentUpvoteController.show);
  app.post('/commentupvote/:commentId',
    isAuthenticated,
    CommentUpvoteController.post);
  app.delete('/commentupvote/:commentId',
    isAuthenticated,
    CommentUpvoteController.delete);


  // Logical Routes
  app.get('/logical',
    LogicalController.index);
  app.put('/logical/:logicalId',
    LogicalController.put);
  app.get('/logical/:logicalId',
    LogicalController.show);
  app.post('/logical',
    LogicalController.post);

  // Nonogram Routes
  app.get('/nonogram',
    NonogramController.index);
  app.put('/nonogram/:nonogramId',
    NonogramController.put);
  app.get('/nonogram/:nonogramId',
    NonogramController.show);
  app.post('/nonogram',
    NonogramController.post);

  // Linelog Routes
  app.get('/linelog',
    LinelogController.index);
  app.put('/linelog/:linelogId',
    LinelogController.put);
  app.get('/linelog/:linelogId',
    LinelogController.show);
  app.post('/linelog',
    LinelogController.post);
  
  // Nonogram Rating Routes
  app.get('/nonogramratings',
    NonogramRatingController.index);
  app.post('/nonogramratings',
    isAuthenticated,
    NonogramRatingController.post);
  app.delete('/nonogramratings',
    isAuthenticated,
    NonogramRatingController.delete);
  app.get('/nonogramratings/:nonogramId',
    isAuthenticated,
    NonogramRatingController.show);

  // Linelog Rating Routes
  app.get('/linelogratings',
    LinelogRatingController.index);
  app.post('/linelogratings',
    isAuthenticated,
    LinelogRatingController.post);
  app.delete('/linelogratings',
    isAuthenticated,
    LinelogRatingController.delete);
  app.get('/linelogratings/:linelogId',
    isAuthenticated,
    LinelogRatingController.show);

  app.get('/logicalratings',
    LogicalRatingController.index);
  app.post('/logicalratings',
    isAuthenticated,
    LogicalRatingController.post);
  app.delete('/logicalratings',
    isAuthenticated,
    LogicalRatingController.delete);
  app.get('/logicalratings/:logicalId',
    isAuthenticated,
    LogicalRatingController.show);

  app.get("/", (req, res, next) => {
    res.sendFile("index.html", { root: publicRoot });
  });
};