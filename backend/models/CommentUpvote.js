module.exports = (sequelize, DataTypes) => {
  const CommentUpvote = sequelize.define('CommentUpvote', {});

  CommentUpvote.associate = function(models) {
    CommentUpvote.belongsTo(models.User, {
      foreignKey: 'UserId'
    });
    CommentUpvote.belongsTo(models.Comment, {
      foreignKey: 'CommentId'
    });
  };

  return CommentUpvote;
};