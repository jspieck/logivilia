const {User} = require('../models')
const { sendError } = require('../utils/apiError');

module.exports = {
  async index (req, res) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'username', 'solvedLogicals', 'solvedNonograms', 'solvedLinelogs']
      })

      // Process users for each category
      const logicals = [...users]
        .map(user => ({
          id: user.id,
          username: user.username,
          solvedCount: Array.isArray(user.solvedLogicals) ? user.solvedLogicals.length : 0
        }))
        .sort((a, b) => b.solvedCount - a.solvedCount)
        .slice(0, 10)

      const nonograms = [...users]
        .map(user => ({
          id: user.id,
          username: user.username,
          solvedCount: Array.isArray(user.solvedNonograms) ? user.solvedNonograms.length : 0
        }))
        .sort((a, b) => b.solvedCount - a.solvedCount)
        .slice(0, 10)

      const linelogs = [...users]
        .map(user => ({
          id: user.id,
          username: user.username,
          solvedCount: Array.isArray(user.solvedLinelogs) ? user.solvedLinelogs.length : 0
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
      sendError(res, 500, 'RANKING_FETCH_FAILED')
    }
  }
} 