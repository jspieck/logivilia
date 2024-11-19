const {Logical} = require('../models');

module.exports = {
  async index (req, res) {
    try {
      const logical = await Logical.findAll();
      res.send(logical);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Logicals konnten nicht geladen werden.'
      });
    }
  },
  async show (req, res) {
    try {
      const logical = await Logical.findByPk(req.params.logicalId);
      res.send(logical);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Logical konnten nicht geladen werden.'
      });
    }
  },
  async post(req, res) {
    try {
      const logical = await Logical.create(req.body);
      res.send(logical);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Fehler beim Erstellen des Logicals'
      });
    }
  },
  async put(req, res) {
    try {
      const logical = await Logical.update(req.body, {
        where: {
          id: req.params.logicalId,
        }
      });
      res.send(logical);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Fehler beim Ändern des Logicals'
      });
    }
  }
}