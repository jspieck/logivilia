const path = require('path');
const crypto = require('crypto');

require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

function resolveJwtSecret () {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (isProduction) {
    throw new Error('JWT_SECRET must be set (at least 32 characters) in production.');
  }
  console.warn('[config] JWT_SECRET missing or too short - using a random secret for this process. ' +
    'Logins will not survive a restart. Set JWT_SECRET in .env.');
  return crypto.randomBytes(48).toString('hex');
}

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
    jwtSecret: resolveJwtSecret()
  },
  mail: {
    host: process.env.SMTP_HOST || 'mail.logivilia.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: (process.env.SMTP_SECURE || 'true') === 'true',
    user: process.env.SMTP_USER || 'passwortreset@logivilia.com',
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'passwortreset@logivilia.com',
    appUrl: process.env.APP_URL || 'https://logivilia.com'
  },
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'logivilia',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql'
  },
  // Used by `npm test`: a fresh in-memory database, never a real one.
  test: {
    dialect: 'sqlite',
    storage: ':memory:'
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql'
  }
};