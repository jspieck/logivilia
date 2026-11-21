// A logged-in user's unfinished game of one puzzle, so it can be continued
// on another device. `state` is the board's own save object (see
// frontend/src/puzzles/engine/progress.js); the server only stores it.
// Deleted when the puzzle is solved or restarted.

module.exports = (sequelize, DataTypes) => {
  const PuzzleProgress = sequelize.define('PuzzleProgress', {
    state: {
      type: DataTypes.JSON,
      allowNull: false
    }
  }, {
    tableName: 'PuzzleProgresses',
    indexes: [
      { unique: true, fields: ['UserId', 'PuzzleId'] }
    ]
  });

  PuzzleProgress.associate = function (models) {
    PuzzleProgress.belongsTo(models.User, { foreignKey: 'UserId' });
    PuzzleProgress.belongsTo(models.Puzzle, { foreignKey: 'PuzzleId' });
  };

  return PuzzleProgress;
};
