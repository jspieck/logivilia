// A user's 1-5 rating of a puzzle; at most one per user and puzzle.

module.exports = (sequelize, DataTypes) => {
  const PuzzleRating = sequelize.define('PuzzleRating', {
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    }
  }, {
    indexes: [
      { unique: true, fields: ['UserId', 'PuzzleId'] },
      { fields: ['PuzzleId'] }
    ]
  });

  PuzzleRating.associate = function (models) {
    PuzzleRating.belongsTo(models.User, { foreignKey: 'UserId' });
    PuzzleRating.belongsTo(models.Puzzle, { foreignKey: 'PuzzleId' });
  };

  return PuzzleRating;
};
