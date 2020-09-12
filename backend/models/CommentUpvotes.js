module.exports = (sequelize, DataTypes) => {
  const CommentUpvotes = sequelize.define('CommentUpvotes', {});

  CommentUpvotes.associate = function(models) {
    CommentUpvotes.belongsTo(models.User);
    CommentUpvotes.belongsTo(models.Comments);
  };

  return CommentUpvotes;
};