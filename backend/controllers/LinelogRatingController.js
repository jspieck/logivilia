const {LinelogRating} = require('../models');
const {sequelize} = require('../models');

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
      res.status(500).send({
        error: 'Bwertungen konnten nicht geladen werden.'
      });
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
      res.status(500).send({
        error: 'Bewertung konnte nicht geladen werden.'
      });
    }
  },
  async post (req, res) {
    try {
      // check if rating is already existing
      const { LinelogId, rating } = req.body;
      const UserId = req.user.id;
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
      res.status(500).send({
        error: 'Bewertung konnte nicht abgegeben werden.'
      });
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
        return res.status(403).send({
          error: 'Du hast keinen Zugang zu dieser Bewertung'
        })
      }
      await linelogRating.destroy();
      res.send(linelogRating);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Bewertung konnte nicht gelöscht werden.'
      });
    }
  },
}