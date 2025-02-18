const {sequelize, Comment, CommentUpvote, User} = require('../models');
// const {sequelize} = require('../models');

module.exports = {
  async index (req, res) {
    try {
      const { riddleType, riddleId } = req.params
      const comments = await Comment.findAll({
        include: [{
          model: User,
          attributes: ['id', 'username', 'role', 'userImageId']
        }, {
          model: CommentUpvote,
          attributes: ['id', 'UserId']
        }],
        where: {
          riddleType: riddleType,
          riddleId: riddleId
        },
        attributes: [
          'id', 'riddleType', 'riddleId', 'replyId', 'text', 'date', 
          'createdAt', 'updatedAt', 'UserId',
          [sequelize.fn('COUNT', sequelize.col('CommentUpvotes.id')), 'upvotes']
        ],
        group: [
          'Comment.id', 'Comment.riddleType', 'Comment.riddleId', 
          'Comment.replyId', 'Comment.text', 'Comment.date', 
          'Comment.createdAt', 'Comment.updatedAt', 'Comment.UserId',
          'User.id', 'User.username', 'User.role', 'User.userImageId',
          'CommentUpvotes.id', 'CommentUpvotes.UserId'
        ]
      })
      res.send(comments)
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: 'An error occurred trying to fetch comments'
      })
    }
  },
  async post (req, res) {
    try {
      const UserId = req.user.id;
      const riddleType = req.params.riddleType;
      const riddleId = parseInt(req.params.riddleId, 10);
      const date = new Date().toISOString();
      const commentObj = {...req.body, riddleType, riddleId, UserId, date};
      const comment = await Comment.create(commentObj);
      res.send(comment);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Kommentar konnte nicht abgegeben werden.'
      });
    }
  },
  async delete (req, res) {
    try {
      const userId = req.user.id;
      const {commentId} = req.params;
      const comment = await Comment.findOne({
        where: {
          id: commentId,
          UserId: userId
        }
      });
      if (!comment) {
        return res.status(403).send({
          error: 'Du hast keinen Zugang zu diesem Kommentar'
        })
      }
      await comment.destroy();
      res.send(comment);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Kommentar konnte nicht gelöscht werden.'
      });
    }
  },
}