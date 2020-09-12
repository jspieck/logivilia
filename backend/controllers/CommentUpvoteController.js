const {CommentUpvotes} = require('../models');

module.exports = {
  async show (req, res) {
    // Show all comment upvotes of the specified user
    try {
      const commentUpvotes = await CommentUpvotes.findAll({
        where: {
          UserId: req.user.id
        },
      });
      res.send(commentUpvotes);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Upvotes konnten nicht geladen werden.'
      });
    }
  },
  async post (req, res) {
    try {
      const upvote = await CommentUpvotes.create({
        CommentsId: parseInt(req.params.commentId, 10),
        UserId: req.user.id
      });
      console.log(upvote);
      res.send(upvote);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Upvote konnte nicht abgegeben werden.'
      });
    }
  },
  async delete (req, res) {
    try {
      const upvote = await CommentUpvotes.findOne({
        where: {
          CommentsId: req.params.commentId,
          UserId: req.user.id
        }
      });
      if (!upvote) {
        return res.status(403).send({
          error: 'Du hast keinen Zugang zu diesem Upvote'
        })
      }
      await upvote.destroy();
      res.send(upvote);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Upvote konnte nicht gelöscht werden.'
      });
    }
  },
};