const {LogicalRating} = require('../models');
const {sequelize} = require('../models');

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
      res.status(500).send({
        error: 'Bwertungen konnten nicht geladen werden.'
      });
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
      res.status(500).send({
        error: 'Bewertung konnte nicht geladen werden.'
      });
    }
  },
  async post (req, res) {
    try {
      // check if rating is already existing
      const { LogicalId, rating } = req.body;
      const UserId = req.user.id;
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
      res.status(500).send({
        error: 'Bewertung konnte nicht abgegeben werden.'
      });
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
        return res.status(403).send({
          error: 'Du hast keinen Zugang zu dieser Bewertung'
        })
      }
      await logicalRating.destroy();
      res.send(logicalRating);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Bewertung konnte nicht gelöscht werden.'
      });
    }
  },
}