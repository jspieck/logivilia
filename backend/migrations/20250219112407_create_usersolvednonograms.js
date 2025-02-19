'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UserSolvedNonograms', {
      
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
      NonogramId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        
        
        
        
        references: {
          model: 'Nonograms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('UserSolvedNonograms');
  }
};