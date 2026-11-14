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

// MySQL is the only database for development and production (audit B4);
// docker-compose.yml in the repository root starts one for development.
// Tests use an in-memory SQLite database unless TEST_DB_DIALECT=mysql (CI
// runs them against MySQL as well).
function mysqlConfig () {
  return {
    dialect: 'mysql',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'logivilia',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  };
}

module.exports = {
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
  development: mysqlConfig(),
  production: mysqlConfig(),
  // `npm test` and the browser tests: a fresh in-memory database, never a
  // real one, unless TEST_DB_DIALECT=mysql points them at a throwaway MySQL.
  test: process.env.TEST_DB_DIALECT === 'mysql'
    ? mysqlConfig()
    : { dialect: 'sqlite', storage: ':memory:' }
};
