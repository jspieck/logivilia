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

async function seed() {
  try {
    // Force sync all tables
    await sequelize.sync({ force: true })
    console.log('Database synced')

    // Create users first
    console.log('Creating users...')
    const createdUsers = await Promise.all(
      users.map(user => User.create(user))
    )
    console.log(`Created ${createdUsers.length} users`)

    // Get the first user's ID to use as creator
    const userId = createdUsers[0].id

    // Create logicals with the user ID
    console.log('Creating logicals...')
    await Promise.all(
      logicals.map(logical => 
        Logical.create({
          ...logical,
          userId: userId
        })
      )
    )

    // Create nonograms with the user ID
    console.log('Creating nonograms...')
    await Promise.all(
      nonograms.map(nonogram => 
        Nonogram.create({
          ...nonogram,
          userId: userId
        })
      )
    )

    // Create linelogs with the user ID
    console.log('Creating linelogs...')
    await Promise.all(
      linelogs.map(linelog => 
        Linelog.create({
          ...linelog,
          userId: userId
        })
      )
    )

    console.log('Seeding completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('Seeding error:', error)
    process.exit(1)
  }
}

seed()