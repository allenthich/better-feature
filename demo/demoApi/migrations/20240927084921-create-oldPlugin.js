'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      fullName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isEmailVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      role: {
        type: Sequelize.ENUM('manager', 'welfareCenter', 'facility'),
        allowNull: false,
      },
      notificationPreference: {
        type: Sequelize.ENUM('email', 'line', 'email&line'),
        allowNull: true,
      },
      operationArea: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lineId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      displayName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pictureUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isFriend: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      facilityId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Facilities', // Name of the table it references
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      managementId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Management', // Name of the table it references
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      welfareCenterId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'WelfareCenters', // Name of the table it references
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Users');
  },
};
