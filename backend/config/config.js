const path = require('path');

module.exports = {
  port: process.env.PORT || 8081,
  db: {
    database: process.env.DB_NAME || 'logivilia',
    user: process.env.DB_USER || 'logivilia',
    password: process.env.DB_PASS || 'logivilia',
    options: {
      dialect: process.env.DIAlECT || 'sqlite',
      host: process.env.HOST || 'localhost',
      storage: path.resolve(__dirname, '../logivilia.sqlite')
    }
  },
  authentication: {
    jwtSecret: process.env.JWT_SECRET || 'secret'
  }
};