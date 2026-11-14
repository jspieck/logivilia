const fs = require('fs');
const path = require('path');
const { sequelize, Sequelize } = require('../models');

async function generateMigrations() {
  const models = sequelize.models;
  const baseTimestamp = parseInt(new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3));

  // Define the order of table creation
  const tableOrder = [
    'Users',           // First, create Users
    'Logicals',        // Then tables that depend on Users
    'Nonograms',
    'Linelogs',
    'Comments',        // Then tables that depend on multiple tables
    'CommentUpvotes',
    'LogicalRatings',
    'NonogramRatings',
    'LinelogRatings',
    'UserSolvedLogicals',
    'UserSolvedNonograms',
    'UserSolvedLinelogs'
  ];

  // Helper function to map DataTypes to Sequelize types
  const getSequelizeType = (attribute) => {
    if (!attribute) return 'Sequelize.STRING';
    
    const type = attribute.type ? attribute.type : attribute;
    const typeName = type.constructor.name;

    // Map specific types that need conversion
    const typeMapping = {
      'JSON': 'Sequelize.JSON',
      'JSONTYPE': 'Sequelize.JSON',  // Handle legacy JSONTYPE
      'JSONB': 'Sequelize.JSONB',
      'STRING': 'Sequelize.STRING',
      'INTEGER': 'Sequelize.INTEGER',
      'BOOLEAN': 'Sequelize.BOOLEAN',
      'DATE': 'Sequelize.DATE',
      'TEXT': 'Sequelize.TEXT',
      'FLOAT': 'Sequelize.FLOAT',
      'DOUBLE': 'Sequelize.DOUBLE',
      'DECIMAL': 'Sequelize.DECIMAL',
      'UUID': 'Sequelize.UUID',
      'ENUM': 'Sequelize.ENUM',
      'ARRAY': 'Sequelize.ARRAY'
    };

    return typeMapping[typeName] || `Sequelize.${typeName}`;
  };

  // Sort models according to tableOrder
  const sortedModels = Object.entries(models).sort(([nameA], [nameB]) => {
    const indexA = tableOrder.indexOf(nameA);
    const indexB = tableOrder.indexOf(nameB);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  for (const [modelName, model] of sortedModels) {
    const attributes = model.rawAttributes;
    const tableName = model.tableName;
    
    // Add a 1-second increment to the timestamp for each table
    const index = tableOrder.indexOf(modelName);
    const timestamp = String(baseTimestamp + (index === -1 ? 0 : (tableOrder.length - index)));

    console.log(`Generating ${modelName} with timestamp ${timestamp}`);

    const migration = `'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('${tableName}', {
      ${Object.entries(attributes).map(([name, attribute]) => {
        const sequelizeType = getSequelizeType(attribute);
        
        return `
      ${name}: {
        type: ${sequelizeType},
        ${attribute.primaryKey ? 'primaryKey: true,' : ''}
        ${attribute.autoIncrement ? 'autoIncrement: true,' : ''}
        ${attribute.unique ? 'unique: true,' : ''}
        ${attribute.allowNull === false ? 'allowNull: false,' : ''}
        ${attribute.defaultValue !== undefined && attribute.defaultValue !== null ? 
          `defaultValue: ${JSON.stringify(attribute.defaultValue)},` : 
          ''}
        ${attribute.references ? `references: {
          model: '${attribute.references.model}',
          key: '${attribute.references.key}'
        },` : ''}
        ${attribute.onUpdate ? `onUpdate: '${attribute.onUpdate}',` : ''}
        ${attribute.onDelete ? `onDelete: '${attribute.onDelete}',` : ''}
      }`;
      }).filter(Boolean).join(',')}
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('${tableName}');
  }
};`;

    const fileName = `${timestamp}_create_${tableName.toLowerCase()}.js`;
    const filePath = path.join(__dirname, '..', 'migrations', fileName);

    fs.writeFileSync(filePath, migration);
    console.log(`Generated migration for ${modelName}: ${fileName}`);
  }
}

// Create migrations directory if it doesn't exist
const migrationsDir = path.join(__dirname, '..', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir);
}

generateMigrations()
  .then(() => {
    console.log('All migrations generated successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error generating migrations:', error);
    process.exit(1);
  }); 