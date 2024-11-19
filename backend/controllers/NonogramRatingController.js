const {NonogramRating} = require('../models');
const {sequelize} = require('../models');

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
      res.status(500).send({
        error: 'Bwertungen konnten nicht geladen werden.'
      });
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
      res.status(500).send({
        error: 'Bewertung konnte nicht geladen werden.'
      });
    }
  },
  async post (req, res) {
    try {
      // check if rating is already existing
      const { NonogramId, rating } = req.body;
      const UserId = req.user.id;
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
      res.status(500).send({
        error: 'Bewertung konnte nicht abgegeben werden.'
      });
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
        return res.status(403).send({
          error: 'Du hast keinen Zugang zu dieser Bewertung'
        })
      }
      await nonogramRating.destroy();
      res.send(nonogramRating);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Bewertung konnte nicht gelöscht werden.'
      });
    }
  },
}