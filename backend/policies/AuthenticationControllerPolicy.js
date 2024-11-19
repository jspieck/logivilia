const Joi = require('joi');

module.exports = {
  reset (req, res, next) {
    const schema = {
      password: Joi.string().regex(
        new RegExp('^[a-zA-Z0-9]{8,32}$')
      )
    };
    const { error, value } = Joi.validate(req.body, schema);
    if (error) {
      switch (error.details[0].context.key) {
        case 'password':
          res.status(400).send({
            error: `Das Passwort erfüllt nicht die folgenden Regeln:
            <br>
            1. Das Passwort darf nur die Buchstaben a bis z und A bis Z enthalten.
            <br>
            2: Das Passwort muss zwischen 8 und 32 Zeichen lang sein.
            `
          });
          break;
        default:
          res.status(400).send({
            error: `Informationen nicht valide!`
          });
      }
    } else {
      next();
    }
  },
  register (req, res, next) {
    const schema = {
      username: Joi.string().alphanum().min(3).max(30),
      email: Joi.string().email({ minDomainSegments: 2 }),
      password: Joi.string().regex(
        new RegExp('^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d^a-zA-Z0-9].{8,32}$')
      ),
      gender: Joi.string().min(0),
      city: Joi.string().min(0)
    };
    const { error, value } = Joi.validate(req.body, schema);
    if (error) {
      switch (error.details[0].context.key) {
        case 'username':
          res.status(400).send({
            error: 'Der Benutzername muss zwischen 3 und 30 Zeichen lang sein und darf Buchstaben und Zahlen enthalten.'
          });
          break;
        case 'email':
          res.status(400).send({
            error: 'E-Mail Adresse nicht valide!'
          });
          break;
        case 'password':
          res.status(400).send({
            error: `Das Passwort erfüllt nicht die folgenden Regeln:
            <br>
            1. Das Passwort muss mindestens einen Buchstaben enthalten.
            <br>
            2. Das Passwort muss mindestens eine Zahl enthalten.
            <br>
            4. Das Passwort darf spezielle Charakter enthalten.
            <br>
            4: Das Passwort muss zwischen 8 und 32 Zeichen lang sein.
            `
          });
          break;
        case 'gender':
          res.status(400).send({
            error: 'Geschlecht keine Zeichenkette!'
          });
          break;
        case 'city':
          res.status(400).send({
            error: 'Stadt keine Zeichenkette!'
          });
          break;
        default:
          res.status(400).send({
            error: `Informationen nicht valide!`
          });
      }
    } else {
      next();
    }
  }
};