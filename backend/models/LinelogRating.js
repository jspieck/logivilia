module.exports = (sequelize, DataTypes) => {
  const LinelogRating = sequelize.define('LinelogRating', {
    rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 },
    }
  });

  LinelogRating.associate = function(models) {
    LinelogRating.belongsTo(models.User);
    LinelogRating.belongsTo(models.Linelog);
  }

  return LinelogRating;
};