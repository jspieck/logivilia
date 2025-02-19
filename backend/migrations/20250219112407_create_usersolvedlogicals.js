'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UserSolvedLogicals', {
      
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
        primaryKey: true,
        
        
        
        
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      LogicalId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        
        
        
        
        references: {
          model: 'Logicals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('UserSolvedLogicals');
  }
};