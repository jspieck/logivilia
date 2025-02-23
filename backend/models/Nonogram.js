module.exports = (sequelize, DataTypes) => {
  const Nonogram = sequelize.define('Nonogram', {
    name: DataTypes.STRING,
    difficulty: DataTypes.INTEGER,
    width: DataTypes.INTEGER,
    height: DataTypes.INTEGER,
    numColor: DataTypes.INTEGER,
    colors: DataTypes.JSON,
    solution: DataTypes.JSON,
    date: DataTypes.DATE,
    author: DataTypes.STRING
  });

  Nonogram.associate = function(models) {
    Nonogram.belongsTo(models.User, {
      foreignKey: 'UserId'
    });
  }

  return Nonogram;
};
