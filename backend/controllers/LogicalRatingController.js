const {LogicalRating} = require('../models');
const {sequelize} = require('../models');
const { sendError } = require('../utils/apiError');

module.exports = {
  async index (req, res) {
    try {
      const ratings = await LogicalRating.findAll({
        attributes: [
          'LogicalId',
          [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        ],
        group: ['LogicalId']
      });
      res.send(ratings);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_LIST_FAILED');
    }
  },
  async show (req, res) {
    try {
      const logicalId = req.params.logicalId;
      const userId = req.user.id;
      const rating = await LogicalRating.findOne({
        where: {
          LogicalId: logicalId,
          UserId: userId
        }
      });
      res.send(rating);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_FETCH_FAILED');
    }
  },
  async post (req, res) {
    try {
      // check if rating is already existing
      const { LogicalId, rating } = req.body;
      const UserId = req.user.id;
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return sendError(res, 400, 'RATING_INVALID');
      }
      const ratingEntry = await LogicalRating.findOne({
        where: {
          UserId: UserId,
          LogicalId: LogicalId
        }
      });
      const up = {UserId: UserId, LogicalId: LogicalId, rating: rating}
      if (ratingEntry) {
        const logicalRating = await LogicalRating.update(up, {
          where: {
            UserId: UserId,
            LogicalId: LogicalId
          }
        });
        res.send(logicalRating);
      } else {
        const logicalRating = await LogicalRating.create(up);
        res.send(logicalRating);
      }
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_SAVE_FAILED');
    }
  },
  async delete (req, res) {
    try {
      const userId = req.user.id;
      const {logicalRatingId} = req.params;
      const logicalRating = await LogicalRating.findOne({
        where: {
          id: logicalRatingId,
          UserId: userId
        }
      });
      if (!logicalRating) {
        return sendError(res, 403, 'FORBIDDEN')
      }
      await logicalRating.destroy();
      res.send(logicalRating);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_DELETE_FAILED');
    }
  },
}