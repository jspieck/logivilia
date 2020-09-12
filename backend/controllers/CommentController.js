const {sequelize, Comments, CommentUpvotes, User} = require('../models');
// const {sequelize} = require('../models');

module.exports = {
  async index (req, res) {
    try {
      const comments = await Comments.findAll({
        attributes: {
          include: [
            [sequelize.fn('COUNT', sequelize.col('CommentUpvotes.CommentId')), 'upvotes']
          ]
        },
        where: {
          riddleType: req.params.riddleType,
          riddleId: req.params.riddleId
        },
        include: [
          {
            model: User,
            required: false, 
            attributes: ['username', 'role', 'userImageId']
          },
          {
            model: CommentUpvotes,
            required: false
          }],
        group: ['Comments.id']
      });
      res.send(comments);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Kommentare konnten nicht geladen werden.'
      });
    }
  },
  async post (req, res) {
    try {
      const UserId = req.user.id;
      const riddleType = req.params.riddleType;
      const riddleId = parseInt(req.params.riddleId, 10);
      const date = new Date().toISOString();
      const commentObj = {...req.body, riddleType, riddleId, UserId, date};
      const comment = await Comments.create(commentObj);
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
      const comment = await Comments.findOne({
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