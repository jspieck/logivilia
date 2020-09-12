module.exports = (sequelize, DataTypes) => {
  const Comments = sequelize.define('Comments', {
    riddleType: DataTypes.STRING,
    riddleId: DataTypes.INTEGER,
    replyId: DataTypes.INTEGER,
    text: DataTypes.TEXT,
    date: DataTypes.DATE
  });

  Comments.associate = function(models) {
    Comments.belongsTo(models.User);
  };

  return Comments;
};