const {Comment, CommentUpvote, User, Puzzle} = require('../models');
const { sendError } = require('../utils/apiError');

module.exports = {
  async index (req, res) {
    try {
      const comments = await Comment.findAll({
        include: [{
          model: User,
          attributes: ['id', 'username', 'role', 'userImageId']
        }, {
          model: CommentUpvote,
          attributes: ['id', 'UserId']
        }],
        where: {
          PuzzleId: parseInt(req.params.puzzleId, 10) || 0
        },
        order: [['id', 'ASC']],
        attributes: [
          'id', 'PuzzleId', 'replyId', 'text', 'date',
          'createdAt', 'updatedAt', 'UserId'
        ]
      })
      // Count upvotes in JS: grouping by the upvote id (as before) produced
      // one row per upvote and a count of at most 1.
      res.send(comments.map(comment => {
        const json = comment.toJSON()
        json.upvotes = json.CommentUpvotes ? json.CommentUpvotes.length : 0
        return json
      }))
    } catch (err) {
      console.error(err)
      sendError(res, 500, 'COMMENT_LIST_FAILED')
    }
  },
  async post (req, res) {
    try {
      const UserId = req.user.id;
      const puzzle = await Puzzle.findByPk(parseInt(req.params.puzzleId, 10), { attributes: ['id'] });
      if (!puzzle) {
        return sendError(res, 404, 'PUZZLE_NOT_FOUND');
      }
      const date = new Date().toISOString();
      const { text, replyId } = req.body;
      // text arrives URI-encoded from the frontend, hence the generous limit
      if (typeof text !== 'string' || text.trim() === '' || text.length > 20000) {
        return sendError(res, 400, 'COMMENT_INVALID');
      }
      // -1 marks a top-level comment
      const commentObj = {
        text,
        replyId: Number.isInteger(replyId) ? replyId : -1,
        PuzzleId: puzzle.id,
        UserId,
        date
      };
      const comment = await Comment.create(commentObj);
      res.send(comment);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'COMMENT_CREATE_FAILED');
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
        return sendError(res, 403, 'FORBIDDEN')
      }
      await comment.destroy();
      res.send(comment);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'COMMENT_DELETE_FAILED');
    }
  },
}