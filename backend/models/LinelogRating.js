module.exports = (sequelize, DataTypes) => {
  const LinelogRating = sequelize.define('LinelogRating', {
    rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 },
    }
  });

  LinelogRating.associate = function(models) {
    LinelogRating.belongsTo(models.User, {
      foreignKey: 'UserId'
    });
    LinelogRating.belongsTo(models.Linelog, {
      foreignKey: 'LinelogId'
    });
  }

  return LinelogRating;
};