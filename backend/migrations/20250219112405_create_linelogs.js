'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Linelogs', {
      
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
      width: {
        type: Sequelize.INTEGER,
        
        
        
        
        
        
        
        
      },
      height: {
        type: Sequelize.INTEGER,
        
        
        
        
        
        
        
        
      },
      numColor: {
        type: Sequelize.INTEGER,
        
        
        
        
        
        
        
        
      },
      colors: {
        type: Sequelize.JSON,
        
        
        
        
        
        
        
        
      },
      information: {
        type: Sequelize.JSON,
        
        
        
        
        
        
        
        
      },
      solution: {
        type: Sequelize.JSON,
        
        
        
        
        
        
        
        
      },
      date: {
        type: Sequelize.DATE,
        
        
        
        
        
        
        
        
      },
      createdAt: {
        type: Sequelize.DATE,
        
        
        
        allowNull: false,
        
        
        
        
      },
      updatedAt: {
        type: Sequelize.DATE,
        
        
        
        allowNull: false,
        
        
        
        
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
    await queryInterface.dropTable('Linelogs');
  }
};