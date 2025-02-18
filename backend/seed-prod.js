const { sequelize } = require('./models')
const Promise = require('bluebird')
const {
  User,
  Logical,
  Nonogram,
  Linelog
} = require('./models')

const users = require('./seed/users.json')
const logicals = require('./seed/logicals.json')
const nonograms = require('./seed/nonograms.json')
const linelogs = require('./seed/linelogs.json')

sequelize.sync({force: true})
  .then(async function () {
    await Promise.all(
      users.map(user => {
        User.create(user)
      })
    )

    await Promise.all(
      logicals.map(logical => {
        Logical.create(logical)
      })
    )

    await Promise.all(
      nonograms.map(nonogram => {
        Nonogram.create(nonogram)
      })
    )

    await Promise.all(
      linelogs.map(linelog => {
        Linelog.create(linelog)
      })
    )
  })