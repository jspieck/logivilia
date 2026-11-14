const {NonogramRating} = require('../models');
const {sequelize} = require('../models');
const { sendError } = require('../utils/apiError');

module.exports = {
  async index (req, res) {
    try {
      const ratings = await NonogramRating.findAll({
        attributes: [
          'NonogramId',
          [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        ],
        group: ['NonogramId']
      });
      res.send(ratings);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_LIST_FAILED');
    }
  },
  async show (req, res) {
    try {
      const nonogramId = req.params.nonogramId;
      const userId = req.user.id;
      const rating = await NonogramRating.findOne({
        where: {
          NonogramId: nonogramId,
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
      const { NonogramId, rating } = req.body;
      const UserId = req.user.id;
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return sendError(res, 400, 'RATING_INVALID');
      }
      const ratingEntry = await NonogramRating.findOne({
        where: {
          UserId: UserId,
          NonogramId: NonogramId
        }
      });
      const up = {UserId: UserId, NonogramId: NonogramId, rating: rating};
      if (ratingEntry) {
        const nonogramRating = await NonogramRating.update(up, {
          where: {
            UserId: UserId,
            NonogramId: NonogramId
          }
        });
        res.send(nonogramRating);
      } else {
        const nonogramRating = await NonogramRating.create(up);
        res.send(nonogramRating);
      }
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_SAVE_FAILED');
    }
  },
  async delete (req, res) {
    try {
      const userId = req.user.id;
      const {nonogramRatingId} = req.params;
      const nonogramRating = await NonogramRating.findOne({
        where: {
          id: nonogramRatingId,
          UserId: userId
        }
      });
      if (!nonogramRating) {
        return sendError(res, 403, 'FORBIDDEN')
      }
      await nonogramRating.destroy();
      res.send(nonogramRating);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_DELETE_FAILED');
    }
  },
}