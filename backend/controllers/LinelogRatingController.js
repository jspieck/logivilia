const {LinelogRating} = require('../models');
const {sequelize} = require('../models');
const { sendError } = require('../utils/apiError');

module.exports = {
  async index (req, res) {
    try {
      const ratings = await LinelogRating.findAll({
        attributes: [
          'LinelogId',
          [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        ],
        group: ['LinelogId']
      });
      res.send(ratings);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_LIST_FAILED');
    }
  },
  async show (req, res) {
    try {
      const linelogId = req.params.linelogId;
      const userId = req.user.id;
      const rating = await LinelogRating.findOne({
        where: {
          LinelogId: linelogId,
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
      const { LinelogId, rating } = req.body;
      const UserId = req.user.id;
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return sendError(res, 400, 'RATING_INVALID');
      }
      const ratingEntry = await LinelogRating.findOne({
        where: {
          UserId: UserId,
          LinelogId: LinelogId
        }
      });
      const up = {UserId: UserId, LinelogId: LinelogId, rating: rating};
      if (ratingEntry) {
        const linelogRating = await LinelogRating.update(up, {
          where: {
            UserId: UserId,
            LinelogId: LinelogId
          }
        });
        res.send(linelogRating);
      } else {
        const linelogRating = await LinelogRating.create(up);
        res.send(linelogRating);
      }
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_SAVE_FAILED');
    }
  },
  async delete (req, res) {
    try {
      const userId = req.user.id;
      const {linelogRatingId} = req.params;
      const linelogRating = await LinelogRating.findOne({
        where: {
          id: linelogRatingId,
          UserId: userId
        }
      });
      if (!linelogRating) {
        return sendError(res, 403, 'FORBIDDEN')
      }
      await linelogRating.destroy();
      res.send(linelogRating);
    } catch (err) {
      console.log(err);
      sendError(res, 500, 'RATING_DELETE_FAILED');
    }
  },
}