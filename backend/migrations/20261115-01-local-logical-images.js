// Logic puzzle header images were hot-linked from the old WordPress site
// (logiklab.de/wp-content/uploads/...), which is being shut down. The images
// now ship with the frontend under /images/logicals/ (frontend/public), with
// the same year/month/file path, so only the URL prefix changes.
//
// Only data.image of type 'logical' is touched; other URLs (e.g. pixabay)
// stay as they are. Running it again changes nothing.

const OLD_PREFIX = /^https?:\/\/(?:www\.)?logiklab\.de\/wp-content\/uploads\//
const NEW_PREFIX = '/images/logicals/'

function parse (data) {
  return typeof data === 'string' ? JSON.parse(data) : data
}

async function rewrite (qi, from, to) {
  const { sequelize } = qi
  const table = qi.quoteIdentifier('Puzzles')
  const rows = await sequelize.query(
    `SELECT ${qi.quoteIdentifier('id')}, ${qi.quoteIdentifier('data')} FROM ${table} WHERE ${qi.quoteIdentifier('type')} = 'logical'`,
    { type: sequelize.QueryTypes.SELECT }
  )
  await sequelize.transaction(async transaction => {
    for (const row of rows) {
      const data = parse(row.data)
      if (!data || typeof data.image !== 'string' || !from.test(data.image)) continue
      data.image = data.image.replace(from, to)
      await sequelize.query(
        `UPDATE ${table} SET ${qi.quoteIdentifier('data')} = ? WHERE ${qi.quoteIdentifier('id')} = ?`,
        { replacements: [JSON.stringify(data), row.id], transaction }
      )
    }
  })
}

module.exports = {
  async up (qi) {
    await rewrite(qi, OLD_PREFIX, NEW_PREFIX)
  },

  async down (qi) {
    await rewrite(qi, /^\/images\/logicals\//, 'https://logiklab.de/wp-content/uploads/')
  }
}
