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
    legacyId: DataTypes.INTEGER,
    // Copies of data.width / data.height / data.numColor for filtering and
    // sorting the overview in SQL; set by the hook below, null for logic
    // puzzles.
    width: DataTypes.INTEGER,
    height: DataTypes.INTEGER,
    numColor: DataTypes.INTEGER,
    // { [locale]: name } copied from data.translations, so the overview can
    // show translated names without loading `data`. Null when untranslated.
    names: DataTypes.JSON
  }, {
    hooks: {
      // Not run by bulkCreate (no individualHooks), so the copy-legacy
      // migration never writes these columns before they exist; migration
      // 20261121-02 fills them in.
      beforeSave (puzzle) {
        const { listColumns, nameTranslations } = require('../utils/puzzleView');
        Object.assign(puzzle, listColumns(puzzle));
        puzzle.names = nameTranslations(puzzle);
      }
    },
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
