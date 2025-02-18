const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('../config/config');
const db = {};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Log the database configuration (for debugging)
console.log('Database Config:', {
  database: dbConfig.database,
  username: dbConfig.username,
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect
});

let sequelize;
if (env === 'production') {
  // For production, use the DATABASE_URL from Railway
  const databaseUrl = process.env.DATABASE_URL;
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  // For development, use the regular config
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      dialect: dbConfig.dialect,
      host: dbConfig.host,
      port: dbConfig.port,
      ...dbConfig.dialectOptions
    }
  );
}

fs.readdirSync(__dirname)
  .filter((file) =>
    file !== 'index.js')
  .forEach((file) => {
    console.log(file);
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(function (modelName) {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
})

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;