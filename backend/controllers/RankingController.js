const {User} = require('../models')
const {sequelize} = require('../models')

module.exports = {
  async index (req, res) {
    try {
      // Get users with their solved puzzles counts
      const users = await User.findAll({
        attributes: [
          'id',
          'username',
          [sequelize.fn('COUNT', sequelize.col('solvedLogicals.id')), 'logicalCount'],
          [sequelize.fn('COUNT', sequelize.col('solvedNonograms.id')), 'nonogramCount'],
          [sequelize.fn('COUNT', sequelize.col('solvedLinelogs.id')), 'linelogCount']
        ],
        include: [
          {
            association: 'solvedLogicals',
            attributes: [],
            required: false
          },
          {
            association: 'solvedNonograms',
            attributes: [],
            required: false
          },
          {
            association: 'solvedLinelogs',
            attributes: [],
            required: false
          }
        ],
        group: [
          'User.id',
          'User.username'
        ],
        raw: true
      })

      // Sort users for each category
      const logicals = [...users]
        .sort((a, b) => b.logicalCount - a.logicalCount)
        .slice(0, 10)
        .map(user => ({
          id: user.id,
          username: user.username,
          solvedCount: parseInt(user.logicalCount)
        }))

      const nonograms = [...users]
        .sort((a, b) => b.nonogramCount - a.nonogramCount)
        .slice(0, 10)
        .map(user => ({
          id: user.id,
          username: user.username,
          solvedCount: parseInt(user.nonogramCount)
        }))

      const linelogs = [...users]
        .sort((a, b) => b.linelogCount - a.linelogCount)
        .slice(0, 10)
        .map(user => ({
          id: user.id,
          username: user.username,
          solvedCount: parseInt(user.linelogCount)
        }))

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