const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/config');
const {sequelize} = require('./models');

// const cookieSession = require('cookie-session');
// const passport = require('passport');
// const LocalStrategy = require('passport-local').Strategy;

const app = express();

// Middleware
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['frontend-production-0af6.up.railway.app']  // Replace with your actual frontend URL
    : 'http://localhost:8080',
  credentials: true
}));

require('./passport');

// Setting up the static directory
const publicRoot = '../logivilia-frontend/dist'
app.use(express.static(publicRoot))

require('./routes')(app);

// {force: true}
sequelize.sync().then(() => {
  app.listen(config.port, () => {
    console.log(`Server started on port ${config.port}`);
  });
});

/*app.use(cookieSession({
  name: 'ses',
  keys: ['vueathkey'],
  maxAge: 24 * 60 * 60 * 1000,
}));*/
