module.exports = (sequelize, DataTypes) => {
  const LogicalRating = sequelize.define('LogicalRating', {
    rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 },
    }
  });

  LogicalRating.associate = function(models) {
    LogicalRating.belongsTo(models.User, {
      foreignKey: 'UserId'
    });
    LogicalRating.belongsTo(models.Logical, {
      foreignKey: 'LogicalId'
    });
  }

  return LogicalRating;
};