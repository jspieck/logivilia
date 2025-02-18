const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const {sequelize} = require('./models');

// const cookieSession = require('cookie-session');
// const passport = require('passport');
// const LocalStrategy = require('passport-local').Strategy;

const app = express();

// Middleware
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

require('./passport');

require('./routes')(app);

sequelize.sync()
  .then(() => {
    app.listen(process.env.PORT || 8081);
    console.log(`Server started on port ${process.env.PORT || 8081}`);
  });

/*app.use(cookieSession({
  name: 'ses',
  keys: ['vueathkey'],
  maxAge: 24 * 60 * 60 * 1000,
}));*/
