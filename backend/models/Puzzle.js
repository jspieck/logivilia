// One table for every puzzle type. Columns shared by all types are real
// columns; everything type-specific (grid size, colours, clues, solution)
// lives in `data`, whose shape is defined by the type's plugin in
// shared/puzzles/<type>.js.

module.exports = (sequelize, DataTypes) => {
  const Puzzle = sequelize.define('Puzzle', {
    type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    name: DataTypes.STRING,
    difficulty: DataTypes.INTEGER,
    data: {
      type: DataTypes.JSON,
      allowNull: false
    },
    date: DataTypes.DATE,
    author: DataTypes.STRING,
    // ID in the old per-type table (Nonograms, Linelogs, Logicals), so old
    // links such as /nonogramSolve/12 can be redirected. Null for new puzzles.
    legacyId: DataTypes.INTEGER
  }, {
    indexes: [
      { fields: ['type'] },
      { unique: true, fields: ['type', 'legacyId'] }
    ]
  });

  Puzzle.associate = function (models) {
    Puzzle.belongsTo(models.User, { foreignKey: 'UserId' });
    Puzzle.hasMany(models.PuzzleRating, { foreignKey: 'PuzzleId' });
    Puzzle.hasMany(models.PuzzleSolve, { foreignKey: 'PuzzleId' });
    Puzzle.hasMany(models.Comment, { foreignKey: 'PuzzleId' });
  };

  return Puzzle;
};
