const {User} = require('../models');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize')

function jwtSignUser (user) {
  const ONE_WEEK = 60 * 60 * 24 * 7;
  return jwt.sign(user, config.authentication.jwtSecret, {
    expiresIn: ONE_WEEK
  });
}

function getTransporter() {
  return nodemailer.createTransport({
    host: "mail.logivilia.com",
    port: 465,
    secure: true,
    auth: {
      user: 'passwortreset@logivilia.com',
      pass: 'qa^XB}oT}[8D'
    }
  });
}

function sendForgotPasswordEmail (userEmail, token) {
  const transporter = getTransporter();
  const mailOptions = {
    from: 'passwortreset@logivilia.com',
    to: userEmail,
    subject: '[Logivilia] Informationen zum Zurücksetzen des Passworts',
    text: 'Sie erhalten diese E-Mail, da Sie (oder jemand anderes) das Zurücksetzen des Passworts Ihres Accounts bei https://logivilia.com beantragt hat.\n' +
    'Bitte klicken Sie auf folgenden Link oder kopieren Sie diesen in ihren Browser, um diesen Prozess fertigzustellen.\n\n' +
    'https://logivilia.com/reset/' + token + ' \n\n' +
    'Wenn Sie das Zurücksetzen Ihres Passworts nicht beantragt haben, ignorieren Sie bitte diese E-Mail und Ihr Passwort bleibt unverändert.\n\n' +
    'Mit freundlichen Grüßen\n' +
    'Ihr Logivilia Team'
  };  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

function sendPasswordResetConfirmation(userEmail) {
  const transporter = getTransporter();
  const mailOptions = {
    from: 'passwortreset@logivilia.com',
    to: userEmail,
    subject: '[Logivilia] Passwort erfolgreich geändert',
    text: 'Sie erhalten diese E-Mail, da Sie das Passwort erfolgreich geändert haben.\n' +
    'Sie können sich nun mit Ihrem neuen Passwort anmelden.\n\n' +
    'Mit freundlichen Grüßen\n' +
    'Ihr Logivilia Team'
  };  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

module.exports = {
  async register (req, res) {
    try {
      const userToBeCreated = req.body;
      userToBeCreated.role = "Mitglied";
      userToBeCreated.joined = new Date().toISOString().slice(0, 10);
      userToBeCreated.solvedLogicals = [];
      userToBeCreated.solvedNonograms = [];
      userToBeCreated.solvedLinelogs = [];
      userToBeCreated.createdLogicals =  [];
      userToBeCreated.createdNonograms = [];
      userToBeCreated.createdLinelogs = [];

      const user = await User.create(userToBeCreated);
      
      console.log(user.toJSON());
      res.send(user.toJSON());
    } catch (err) {
      console.log(err);
      res.status(400).send({
        error: 'Die E-Mail oder der Benutzername wird schon benutzt'
      });
    }
  },
  async forgot (req, res) {
    const token = await new Promise((resolve, reject) => {
      crypto.randomBytes(20, (err, buf) => {
        const token = buf.toString('hex');
        if (err) {
          reject("Error generating token");
        }
        resolve(token);
      });
    });

    try {  
      const user = await User.findOne({
        where: {
          email: req.body.email
        }
      });
      if (!user) {
        return res.status(403).send({
          error: 'E-Mail Adresse nicht gefunden',
        });
      }
      let updatedUser = {
        ...user.toJSON()
      }
      updatedUser.resetPasswordToken = token;
      updatedUser.resetPasswordExpires = Date.now() + 3600000;
      const updateRes = await User.update(updatedUser, {
        where: {
          id: user.id,
        }
      });
      sendForgotPasswordEmail(req.body.email, token);
      res.send({'message': 'Success'});
    } catch (err) {
      console.log(err);
      res.status(400).send({
        error: 'E-Mail Adresse wurde nicht gefunden'
      });
    }
  },
  async reset (req, res) {
    try {  
      const user = await User.findOne({
        where: {
          resetPasswordToken: req.params.token,
          resetPasswordExpires: {
            [Op.gte]: Date.now()
          }
        }
      });
      if (!user) {
        return res.status(400).send({
          error: 'Das Rücksetzen des Passworts ist abgelaufen'
        });
      }
      let updatedUser = {
        ...user.toJSON()
      };
      updatedUser.resetPasswordExpires = 0;
      updatedUser.password = req.body.password;
      console.log('Before update');
      await User.update(updatedUser, {
        where: {
          id: updatedUser.id
        },
        individualHooks: true
      });
      console.log(updatedUser);
      res.send(updatedUser);
      sendPasswordResetConfirmation(user.email);
    } catch (err) {
      console.log(err);
      res.status(400).send({
        error: 'Problem beim Rücksetzen des Passworts'
      });
    }
  },
  async login (req, res) {
    try {
      const {email, password} = req.body;
      const user = await User.findOne({
        where: {
          email: email
        }
      });
      if (!user) {
        return res.status(403).send({
          error: 'Fehlerhafte Login Informationen',
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(403).send({
          error: 'Fehlerhafte Login Informationen',
        });
      }
      const userJson = user.toJSON();
      res.send({
        user: userJson,
        token: jwtSignUser(userJson)
      });
    } catch (err) {
      res.status(500).send({
        error: 'Ein Fehler ist beim Login aufgetreten!'
      });
    }
  }
}