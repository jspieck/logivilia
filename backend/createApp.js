// Builds the Express app without starting a server, so tests can use it
// directly. The entry point (../app.js) adds the database check and listen().

require('dotenv').config();

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

// External origins the frontend uses (see frontend/index.html and sw.js):
// ionicons (script + its SVGs) from unpkg, icon fonts from jsdelivr
// (Material Design Icons) and Font Awesome, and one puzzle image that is
// still hot-linked from pixabay. A new CDN or image host must be added here.
const ICON_CSS = ['https://cdn.jsdelivr.net', 'https://use.fontawesome.com'];
const GOOGLE_FONTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
const UNPKG = 'https://unpkg.com';

function contentSecurityDirectives (env) {
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", UNPKG],
    // Vue :style bindings and the ionicons web components inject inline
    // styles, so styles cannot be restricted to files.
    styleSrc: ["'self'", "'unsafe-inline'", ...ICON_CSS, GOOGLE_FONTS[0]],
    fontSrc: ["'self'", 'data:', ...ICON_CSS, GOOGLE_FONTS[1]],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://cdn.pixabay.com'],
    // ionicons fetches its SVGs; the service worker refreshes the CDN files.
    connectSrc: ["'self'", UNPKG, ...ICON_CSS, ...GOOGLE_FONTS],
    workerSrc: ["'self'"],
    manifestSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'self'"]
  };
  if (env !== 'production') {
    // Plain-http localhost and the Vite HMR websocket.
    directives.upgradeInsecureRequests = null;
    directives.connectSrc.push('ws://localhost:*', 'ws://127.0.0.1:*');
  }
  return directives;
}

module.exports = function createApp () {
  const env = process.env.NODE_ENV;
  const app = express();

  // Behind a hosting proxy (e.g. Passenger/nginx) req.ip must come from
  // X-Forwarded-For, otherwise the rate limiter sees every client as one IP.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers (HSTS, nosniff, frame protection, referrer policy, ...)
  // plus a Content-Security-Policy. Set CSP_REPORT_ONLY=1 to only log
  // violations in the browser console instead of blocking them.
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      reportOnly: process.env.CSP_REPORT_ONLY === '1',
      directives: contentSecurityDirectives(env)
    },
    crossOriginEmbedderPolicy: false
  }));

  if (env !== 'test') {
    app.use(morgan('combined'));
  }
  app.use(bodyParser.json({ limit: '1mb' }));

  // The frontend is served from this same server, so cross-origin access is
  // only needed for origins listed explicitly in ALLOWED_ORIGINS.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  const passport = require('./passport');
  app.use(passport.initialize());

  // The puzzle-type plugins are an ES module loaded asynchronously; hold
  // API requests until they are available (only matters right after start).
  const puzzles = require('./puzzles');
  app.use('/api', (req, res, next) => puzzles.ready.then(() => next(), next));
  app.use('/api', require('./routes')());

  if (env === 'production') {
    // Serve the built Vue app; unknown paths get index.html (client routing).
    app.use(express.static(FRONTEND_DIST));
    app.get('*', (req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    });
  } else if (env !== 'test') {
    // Development: forward everything that is not /api to the Vite dev server.
    const { createProxyMiddleware } = require('http-proxy-middleware');
    app.use('/', createProxyMiddleware({
      target: 'http://localhost:8081',
      changeOrigin: true,
      ws: true
    }));
  }

  return app;
};
