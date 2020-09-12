module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
    riddleType: DataTypes.STRING,
    riddleId: DataTypes.INTEGER,
    replyId: DataTypes.INTEGER,
    text: DataTypes.TEXT,
    date: DataTypes.DATE
  });

  Comment.associate = function(models) {
    Comment.belongsTo(models.User);
  };

  return Comment;
};