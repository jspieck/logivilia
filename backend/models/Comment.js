module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
    // ID of the comment this one answers, -1 for a top-level comment.
    replyId: DataTypes.INTEGER,
    text: DataTypes.TEXT,
    date: DataTypes.DATE
  });

  Comment.associate = function (models) {
    Comment.belongsTo(models.User);
    Comment.belongsTo(models.Puzzle, { foreignKey: 'PuzzleId' });
    Comment.hasMany(models.CommentUpvote);
  };

  return Comment;
};
