// Recreates every table and fills it with the seed data.
// THIS DELETES ALL EXISTING DATA (users, solves, comments, ratings).
//
// In production it refuses to run unless SEED_CONFIRM=wipe-all-data is set.
// Seed users get a random password, printed once at the end, unless
// SEED_PASSWORD is set (then all seed users get that password).

const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && process.env.SEED_CONFIRM !== 'wipe-all-data') {
  console.error('Refusing to seed: NODE_ENV=production and seeding deletes all data.');
  console.error('Set SEED_CONFIRM=wipe-all-data if you really want this.');
  process.exit(1);
}

const {
  sequelize,
  Logical,
  Nonogram,
  Linelog,
  User,
  LogicalRating,
  NonogramRating,
  LinelogRating,
  Comment,
  CommentUpvote
} = require('../models');

const logicals = require('./logicals.json');
const nonograms = require('./nonograms.json');
const linelogs = require('./linelogs.json');
const users = require('./users.json');
const logicalRatings = require('./logicalRatings.json');
const nonogramRatings = require('./nonogramRatings.json');
const linelogRatings = require('./linelogRatings.json');
const comments = require('./comments.json');
const commentUpvotes = require('./commentsUpvotes.json');

function seedPassword () {
  // Letters and digits only, so it satisfies the password rule.
  return process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url').replace(/[-_]/g, 'x') + '7a';
}

async function seed () {
  await sequelize.sync({ force: true });

  const credentials = [];
  for (const user of users) {
    const password = seedPassword();
    await User.create({ ...user, password });
    credentials.push({ email: user.email, role: user.role, password });
  }

  const tables = [
    [Comment, comments],
    [CommentUpvote, commentUpvotes],
    [Logical, logicals],
    [Nonogram, nonograms],
    [Linelog, linelogs],
    [LogicalRating, logicalRatings],
    [NonogramRating, nonogramRatings],
    [LinelogRating, linelogRatings]
  ];
  for (const [model, rows] of tables) {
    await Promise.all(rows.map(row => model.create(row)));
  }

  console.log('Seed complete.');
  if (!process.env.SEED_PASSWORD) {
    console.log('Seed user passwords (shown only now):');
    console.table(credentials);
  }
}

module.exports = seed;

if (require.main === module) {
  seed()
    .then(() => sequelize.close())
    .catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
