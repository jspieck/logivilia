const {User} = require('../models')

module.exports = {
  async index (req, res) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'username', 'solvedLogicals', 'solvedNonograms', 'solvedLinelogs'],
        raw: true
      })

      console.log(users[0].solvedLogicals.length)
      // Process users for each category
      const logicals = [...users]
        .map(user => ({
          id: user.id,
          username: user.username,
          solvedCount: user.solvedLogicals ? user.solvedLogicals.length : 0
        }))
        .sort((a, b) => b.solvedCount - a.solvedCount)
        .slice(0, 10)

      const nonograms = [...users]
        .map(user => ({
          id: user.id,
          username: user.username,
          solvedCount: user.solvedNonograms ? user.solvedNonograms.length : 0
        }))
        .sort((a, b) => b.solvedCount - a.solvedCount)
        .slice(0, 10)

      const linelogs = [...users]
        .map(user => ({
          id: user.id,
          username: user.username,
          solvedCount: user.solvedLinelogs ? user.solvedLinelogs.length : 0
        }))
        .sort((a, b) => b.solvedCount - a.solvedCount)
        .slice(0, 10)

      res.send({
        logicals,
        nonograms,
        linelogs
      })
    } catch (error) {
      console.error('Error fetching rankings:', error)
      res.status(500).send({
        error: 'An error occurred while fetching the rankings.'
      })
    }
  }
} 