const {Linelog} = require('../models');

module.exports = {
  async index (req, res) {
    try {
      const linelogs = await Linelog.findAll();
      res.send(linelogs);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Linelogs konnten nicht geladen werden.'
      });
    }
  },
  async show (req, res) {
    try {
      const linelog = await Linelog.findByPk(req.params.linelogId);
      res.send(linelog);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Linelog konnten nicht geladen werden.'
      });
    }
  },
  async post(req, res) {
    try {
      const linelog = await Linelog.create(req.body);
      res.send(linelog);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Fehler beim Erstellen des Linelogs'
      });
    }
  },
  async put(req, res) {
    try {
      const linelog = await Linelog.update(req.body, {
        where: {
          id: req.params.linelogId,
        }
      });
      res.send(linelog);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Fehler beim Ändern des Linelogs'
      });
    }
  }
}