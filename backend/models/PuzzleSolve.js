// A verified solve: the user submitted a correct answer for the puzzle.
// One row per user and puzzle; createdAt is when it was first solved,
// bestSeconds the user's fastest time (null if no time was sent).
// Replaces the solvedLogicals / solvedNonograms / solvedLinelogs JSON arrays
// on User.

module.exports = (sequelize, DataTypes) => {
  const PuzzleSolve = sequelize.define('PuzzleSolve', {
    bestSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['UserId', 'PuzzleId'] },
      { fields: ['PuzzleId'] }
    ]
  });

  PuzzleSolve.associate = function (models) {
    PuzzleSolve.belongsTo(models.User, { foreignKey: 'UserId' });
    PuzzleSolve.belongsTo(models.Puzzle, { foreignKey: 'PuzzleId' });
  };

  return PuzzleSolve;
};
