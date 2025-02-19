'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('LogicalRatings', {
      
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        
        allowNull: false,
        
        
        
        
      },
      rating: {
        type: Sequelize.INTEGER,
        
        
        
        
        
        
        
        
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
      LogicalId: {
        type: Sequelize.INTEGER,
        
        
        
        
        
        references: {
          model: 'Logicals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('LogicalRatings');
  }
};