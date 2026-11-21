// The last hot-linked logic puzzle image (a Weimar photo from pixabay, free
// to host under the Pixabay Content License) now ships with the frontend
// under /images/logicals/pixabay/, so the CSP no longer needs to allow
// cdn.pixabay.com. Only this exact URL is touched; running it again changes
// nothing.

const REMOTE = 'https://cdn.pixabay.com/photo/2015/06/12/12/01/weimar-806851_960_720.jpg'
const LOCAL = '/images/logicals/pixabay/weimar-806851_960_720.jpg'

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
      if (!data || data.image !== from) continue
      data.image = to
      await sequelize.query(
        `UPDATE ${table} SET ${qi.quoteIdentifier('data')} = ? WHERE ${qi.quoteIdentifier('id')} = ?`,
        { replacements: [JSON.stringify(data), row.id], transaction }
      )
    }
  })
}

module.exports = {
  REMOTE,
  LOCAL,

  async up (qi) {
    await rewrite(qi, REMOTE, LOCAL)
  },

  async down (qi) {
    await rewrite(qi, LOCAL, REMOTE)
  }
}
