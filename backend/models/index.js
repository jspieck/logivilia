const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('../config/config.js');
const db = {};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Log environment variables (for debugging)
console.log('Environment:', env);
console.log('Database URL:', process.env.DATABASE_URL);
console.log('Postgres Variables:', {
  PGDATABASE: process.env.PGDATABASE,
  PGHOST: process.env.PGHOST,
  PGPORT: process.env.PGPORT,
  PGUSER: process.env.PGUSER,
});

let sequelize;
if (env === 'production') {
  // Check if we have individual Postgres variables
  if (process.env.PGDATABASE && process.env.PGHOST) {
    sequelize = new Sequelize({
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
    });
  } else if (process.env.DATABASE_URL) {
    // Use DATABASE_URL if available
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
  } else {
    throw new Error('No database configuration found. Please set DATABASE_URL or Postgres variables.');
  }
} else {
  // Development configuration
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      dialect: dbConfig.dialect,
      host: dbConfig.host,
      storage: dbConfig.storage
    }
  );
}

fs
  .readdirSync(__dirname)
  .filter((file) =>
    file !== 'index.js'
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(function (modelName) {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;