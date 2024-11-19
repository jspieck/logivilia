module.exports = (sequelize, DataTypes) => {
  const NonogramRating = sequelize.define('NonogramRating', {
    rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 },
    }
  });

  NonogramRating.associate = function(models) {
    NonogramRating.belongsTo(models.User);
    NonogramRating.belongsTo(models.Nonogram);
  }

  return NonogramRating;
};