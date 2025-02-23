const express = require('express');
const router = express.Router();

// API Routes
require('./routes')(router);

module.exports = router;
