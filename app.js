const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

// Import passport configuration
require('./backend/passport');

require('dotenv').config();

// Behind a hosting proxy (e.g. Railway) req.ip must come from X-Forwarded-For,
// otherwise the rate limiter sees every client as the same IP.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Middleware setup
app.use(morgan('combined'));
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

// Initialize Passport
const passport = require('./backend/passport');
app.use(passport.initialize());

// Backend API routes
const backendRouter = require('./backend/routes');
app.use('/api', backendRouter());

// Conditionally serve static frontend files based on environment
if (process.env.NODE_ENV === 'production') {
  // Production: Serve static frontend files
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
  
  // Frontend catch-all route for production
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  });
} else {
  // Development: Proxy requests to the Vue dev server
  const { createProxyMiddleware } = require('http-proxy-middleware');
  
  // Proxy all non-API requests to the Vue dev server
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:8081', // Default Vite dev server port
    changeOrigin: true,
    ws: true, // Support WebSocket
  }));
}

// Database connection
const { sequelize } = require('./backend/models');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    
    return new Promise((resolve, reject) => {
      const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        console.log(`API available at http://localhost:${PORT}/api`);
        console.log(`Frontend served from http://localhost:${PORT}`);
        resolve(server);
      }).on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;