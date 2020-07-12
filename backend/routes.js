const AuthenticationController = require('./controllers/AuthenticationController');
const AuthenticationControllerPolicy = require('./policies/AuthenticationControllerPolicy');
const LogicalController = require('./controllers/LogicalController');
const LogicalRatingController = require('./controllers/LogicalRatingController');
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

  app.get('/logical',
    LogicalController.index);
  app.put('/logical:logicalId',
    LogicalController.put);
  app.get('/logical/:logicalId',
    LogicalController.show);
  app.post('/logical',
    LogicalController.post);

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