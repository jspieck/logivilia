'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Logicals', {
      
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        
        allowNull: false,
        
        
        
        
      },
      name: {
        type: Sequelize.STRING,
        
        
        
        
        
        
        
        
      },
      difficulty: {
        type: Sequelize.INTEGER,
        
        
        
        
        
        
        
        
      },
      description: {
        type: Sequelize.TEXT,
        
        
        
        
        
        
        
        
      },
      question: {
        type: Sequelize.TEXT,
        
        
        
        
        
        
        
        
      },
      clues: {
        type: Sequelize.JSON,
        
        
        
        
        
        
        
        
      },
      attributes: {
        type: Sequelize.JSON,
        
        
        
        
        
        
        
        
      },
      solution: {
        type: Sequelize.JSON,
        
        
        
        
        
        
        
        
      },
      image: {
        type: Sequelize.STRING,
        
        
        
        
        
        
        
        
      },
      date: {
        type: Sequelize.DATE,
        
        
        
        
        
        
        
        
      },
      author: {
        type: Sequelize.STRING,
        
        
        
        
        
        
        
        
      },
      createdAt: {
        type: Sequelize.DATE,
        
        
        
        allowNull: false,
        
        
        
        
      },
      updatedAt: {
        type: Sequelize.DATE,
        
        
        
        allowNull: false,
        
        
        
        
      },
      UserId: {
        type: Sequelize.INTEGER,
        
        
        
        
        
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      userId: {
        type: Sequelize.INTEGER,
        
        
        
        
        
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Logicals');
  }
};