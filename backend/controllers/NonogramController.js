const {Nonogram} = require('../models');

module.exports = {
  async index (req, res) {
    try {
      const nonogram = await Nonogram.findAll();
      res.send(nonogram);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Nonogramme konnten nicht geladen werden.'
      });
    }
  },
  async show (req, res) {
    try {
      const nonogram = await Nonogram.findByPk(req.params.nonogramId);
      res.send(nonogram);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Nonogramm konnten nicht geladen werden.'
      });
    }
  },
  async post(req, res) {
    try {
      const nonogram = await Nonogram.create(req.body);
      res.send(nonogram);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Fehler beim Erstellen des Nonogramms'
      });
    }
  },
  async put(req, res) {
    try {
      const nonogram = await Nonogram.update(req.body, {
        where: {
          id: req.params.nonogramId,
        }
      });
      res.send(nonogram);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Fehler beim Ändern des Nonogramms'
      });
    }
  }
}