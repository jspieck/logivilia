// A logged-in creator's unfinished puzzle from one of the editors. `state` is
// the editor's own snapshot (see frontend/src/puzzles/engine/useDraft.js);
// the server stores it without reading it. Deleted when the puzzle is
// published from it, or by its owner.

module.exports = (sequelize, DataTypes) => {
  const PuzzleDraft = sequelize.define('PuzzleDraft', {
    type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    name: DataTypes.STRING,
    state: {
      type: DataTypes.JSON,
      allowNull: false
    }
  }, {
    tableName: 'PuzzleDrafts',
    indexes: [
      { fields: ['UserId'] }
    ]
  });

  PuzzleDraft.associate = function (models) {
    PuzzleDraft.belongsTo(models.User, { foreignKey: 'UserId' });
  };

  return PuzzleDraft;
};
