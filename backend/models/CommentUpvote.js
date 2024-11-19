module.exports = (sequelize, DataTypes) => {
  const CommentUpvote = sequelize.define('CommentUpvote', {});

  CommentUpvote.associate = function(models) {
    CommentUpvote.belongsTo(models.User);
    CommentUpvote.belongsTo(models.Comment);
  };

  return CommentUpvote;
};