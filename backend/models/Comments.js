module.exports = (sequelize, DataTypes) => {
  const Comments = sequelize.define('Comments', {
    riddleType: DataTypes.STRING,
    riddleId: DataTypes.INTEGER,
    replyId: DataTypes.INTEGER,
    upvotes: DataTypes.INTEGER,
    text: DataTypes.TEXT,
    date: DataTypes.DATE
  });

  Comments.associate = function(models) {
    Comments.belongsTo(models.User); // , { foreignKey: { unique: false}, onDelete: 'cascade', onUpdate: 'cascade'});
    Comments.hasMany(models.CommentUpvotes, { foreignKey: 'CommentsId' });
  };

  return Comments;
};