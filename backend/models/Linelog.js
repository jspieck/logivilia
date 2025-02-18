module.exports = (sequelize, DataTypes) => {
  const Linelog = sequelize.define('Linelog', {
    name: DataTypes.STRING,
    difficulty: DataTypes.INTEGER,
    width: DataTypes.INTEGER,
    height: DataTypes.INTEGER,
    numColor: DataTypes.INTEGER,
    colors: DataTypes.JSON,
    information: DataTypes.JSON,
    solution: DataTypes.JSON,
    date: DataTypes.DATE
  });

  Linelog.associate = function(models) {
    Linelog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'creator'
    });
    
    Linelog.hasMany(models.LinelogRating, {
      foreignKey: 'linelogId'
    });
  }

  return Linelog;
};
