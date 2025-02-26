const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

// Import passport configuration
require('./backend/passport');

require('dotenv').config();

// Middleware setup
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(cors({
  origin: true, // Allow all origins since we're serving frontend from same server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize Passport
const passport = require('./backend/passport');
app.use(passport.initialize());

// Backend API routes
const backendRouter = require('./backend/routes');
app.use('/api', backendRouter());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Frontend catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

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