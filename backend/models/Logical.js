module.exports = (sequelize, DataTypes) => {
  const Logical = sequelize.define('Logical', {
    name: DataTypes.STRING,
    difficulty: DataTypes.INTEGER,
    description: DataTypes.TEXT,
    question: DataTypes.TEXT,
    clues: DataTypes.JSON,
    attributes: DataTypes.JSON,
    solution: DataTypes.JSON,
    image: DataTypes.STRING,
    date: DataTypes.DATE,
    author: DataTypes.STRING
  });

  Logical.associate = function(models) {
    Logical.belongsTo(models.User);
  }

  return Logical;
};