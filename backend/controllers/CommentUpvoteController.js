const {CommentUpvote} = require('../models');
const { sendError } = require('../utils/apiError');

module.exports = {
  async show (req, res) {
    // Show all comment upvotes of the specified user
    try {
      const commentUpvotes = await CommentUpvote.findAll({
        where: {
          UserId: req.user.id
        },
      });
      res.send(commentUpvotes);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'UPVOTE_LIST_FAILED');
    }
  },
  async post (req, res) {
    try {
      const upvote = await CommentUpvote.create({
        CommentId: parseInt(req.params.commentId, 10),
        UserId: req.user.id
      });
      console.log(upvote);
      res.send(upvote);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'UPVOTE_CREATE_FAILED');
    }
  },
  async delete (req, res) {
    try {
      const upvote = await CommentUpvote.findOne({
        where: {
          CommentId: req.params.commentId,
          UserId: req.user.id
        }
      });
      if (!upvote) {
        return sendError(res, 403, 'FORBIDDEN')
      }
      await upvote.destroy();
      res.send(upvote);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'UPVOTE_DELETE_FAILED');
    }
  },
};