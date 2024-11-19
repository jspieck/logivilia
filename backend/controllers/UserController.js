const {User} = require('../models');
// const {sequelize} = require('../models');

module.exports = {
  async show (req, res) {
    try {
      const userId = req.params.userId;
      const user = await User.findOne({
        where: {
          id: userId
        }
      });
      // only show non confident information
      const saveUser = {
        "username": user.username,
        "role": user.role,
        "gender": user.gender,
        "bio": user.bio,
        "birthyear": user.birthyear,
        "city": user.city,
        "solvedLogicals": user.solvedLogicals,
        "solvedNonograms": user.solvedNonograms,
        "solvedLinelogs": user.solvedLinelogs,
        "createdLogicals": user.createdLogicals,
        "createdNonograms": user.createdNonograms,
        "createdLinelogs": user.createdLinelogs,
        "joined": user.joined,
      };
      res.send(saveUser);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Benutzer nicht existent.'
      });
    }
  },
  async update(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findOne({
        where: {
          id: userId
        }
      });
      user.gender = req.body.gender;
      user.city = req.body.city;
      user.birthyear = req.body.birthyear;
      user.bio = req.body.bio;
      await user.save();
      res.send({"success": "true"});
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Benutzer nicht existent.'
      });
    }
  },
  async linelogSolved(req, res) {
    try {
      const userId = req.params.userId;
      const linelogId = parseInt(req.params.linelogId, 10);
      const user = await User.findOne({
        where: {
          id: userId
        }
      });
      if (!user.solvedLinelogs.includes(linelogId)) {
        const solvedLinelogs = [...user.solvedLinelogs]
        solvedLinelogs.push(linelogId);
        user.solvedLinelogs = solvedLinelogs;
        await user.save();
      }
      res.send({"success": "true"});
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Benutzer nicht existent.'
      });
    }
  },
  async nonogramSolved(req, res) {
    try {
      const userId = req.params.userId;
      const nonogramId = parseInt(req.params.nonogramId, 10);
      const user = await User.findOne({
        where: {
          id: userId
        }
      });
      console.log(user.solvedNonograms, nonogramId);
      if (!user.solvedNonograms.includes(nonogramId)) {
        const solvedNonograms = [...user.solvedNonograms]
        solvedNonograms.push(nonogramId);
        user.solvedNonograms = solvedNonograms;
        await user.save();
      }
      res.send({"success": "true"});
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Benutzer nicht existent.'
      });
    }
  },
  async logicalSolved(req, res) {
    try {
      const userId = req.params.userId;
      const logicalId = parseInt(req.params.logicalId, 10);
      const user = await User.findOne({
        where: {
          id: userId
        }
      });
      console.log(user.solvedLogicals, logicalId);
      if (!user.solvedLogicals.includes(logicalId)) {
        const solvedLogicals = [...user.solvedLogicals]
        solvedLogicals.push(logicalId);
        user.solvedLogicals = solvedLogicals;
        await user.save();
      }
      res.send({"success": "true"});
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: 'Benutzer nicht existent.'
      });
    }
  }
}