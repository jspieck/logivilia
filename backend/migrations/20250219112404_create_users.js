'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,  
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
      },
      username: {
        type: Sequelize.STRING,
        unique: true,
      },
      role: {
        type: Sequelize.STRING,
      },
      gender: {
        type: Sequelize.STRING,
      },
      bio: {
        type: Sequelize.TEXT,
      },
      birthyear: {
        type: Sequelize.INTEGER,
      },
      userImageId: {
        type: Sequelize.INTEGER,
      },
      city: {
        type: Sequelize.STRING,
      },
      joined: {
        type: Sequelize.DATE,
      },
      solvedLogicals: {
        type: Sequelize.JSON,
      },
      solvedNonograms: {
        type: Sequelize.JSON,
      },
      solvedLinelogs: {
        type: Sequelize.JSON,
      },
      createdLogicals: {
        type: Sequelize.JSON,
      },
      createdNonograms: {
        type: Sequelize.JSON,
      },
      createdLinelogs: {
        type: Sequelize.JSON,
      },
      password: {
        type: Sequelize.STRING,
      },
      resetPasswordToken: {
        type: Sequelize.STRING,
      },
      resetPasswordExpires: {
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
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Users');
  }
};