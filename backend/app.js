const express = require('express');

const app = express();
// const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
// const passport = require('passport');

// const LocalStrategy = require('passport-local').Strategy;
const publicRoot = '../logivilia-frontend/dist'

app.use(express.static(publicRoot))

app.use(bodyParser.json());
/*app.use(cookieSession({
  name: 'ses',
  keys: ['vueathkey'],
  maxAge: 24 * 60 * 60 * 1000,
}));*/

app.get("/", (req, res, next) => {
  res.sendFile("index.html", { root: publicRoot });
});

/* 
app.use(passport.initialize());
app.use(passport.session());

let users = [
  {
    id: 1,
    name: 'Jude',
    email: 'user@email.com',
    password: 'password'
  },
  {
    id: 2,
    name: 'Emma',
    email: 'emma@email.com',
    password: 'password2'
  },
];

app.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(400).send([user, 'Cannot log in', info]);
    }
    req.login(user, err => {
      res.send('Logged in');
    });
  })(req, res, next);
});

app.get("/api/logout", function(req, res) {
  req.logout();
  return res.send();
});

const authMiddleware = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).send('You are not authenticated');
  } else {
    return next();
  }
};

app.get("/api/user", authMiddleware, (req, res) => {
  let user = users.find(user => {
    return user.id === req.session.passport.user;
  });
  console.log([user, req.session]);
  res.send({ user: user });
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password"
    },
    (username, password, done) => {
      let user = users.find((user) => {
        return user.email === username && user.password === password
      });
      if (user) {
        done(null, user);
      } else {
        done(null, false, { message: 'Incorrect username or password'});
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id)
});

passport.deserializeUser((id, done) => {
  let user = users.find((user) => {
    return user.id === id;
  });
  done(null, user);
});*/

app.listen();
// app.listen(3000, () => {
//   console.log("Example app listening on port 8080")
// });

/* var http = require('http');
var server = http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    var message = 'It works!\n',
        version = 'NodeJS ' + process.versions.node + '\n',
        response = [message, version].join('\n');
    res.end(response);
});
server.listen(); */
