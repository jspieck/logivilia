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
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

require('./passport');

require('./routes')(app);

sequelize.sync()
  .then(() => {
    app.listen(process.env.PORT || 8081);
    console.log(`Server started on port ${process.env.PORT || 8081}`);
  });

sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

/*app.use(cookieSession({
  name: 'ses',
  keys: ['vueathkey'],
  maxAge: 24 * 60 * 60 * 1000,
}));*/
