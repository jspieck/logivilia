const express = require('express');
const path = require('path');
const app = express();

// Laden der Umgebungsvariablen
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './backend/.env' });
} else {
  require('dotenv').config();
}

// Importieren Sie die Backend-Routes statt der ganzen App
const backendRouter = require('./backend/routes');

// Backend-API-Routen
app.use('/api', backendRouter());

// Middleware aus backend/app.js hierher verschieben
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');

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

// Serve das Frontend
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Alle anderen Anfragen zum Frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Datenbank-Verbindung
const { sequelize } = require('./backend/models');

sequelize.sync()
  .then(() => {
    const PORT = process.env.PORT || 8081;
    app.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT}`);
    });
  });

sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = app;