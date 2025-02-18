const path = require('path');

require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8081,
  db: {
    database: process.env.DB_NAME || 'logivilia',
    user: process.env.DB_USER || 'logivilia',
    password: process.env.DB_PASS || 'logivilia',
    options: {
      dialect: process.env.DIALECT || 'sqlite',
      host: process.env.HOST || 'localhost',
      storage: path.resolve(__dirname, '../logivilia.sqlite')
    }
  },
  authentication: {
    jwtSecret: process.env.JWT_SECRET || 'secret'
  },
  development: {
    database: 'logivilia',
    username: 'logivilia',
    password: 'logivilia',
    host: 'localhost',
    dialect: 'postgres'
  },
  production: {
    database: process.env.PGDATABASE,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};