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

const db = require('../models');
const { sequelize, User, Comment, CommentUpvote } = db;
const puzzles = require('../puzzles');
const { importLegacy } = require('../utils/legacyPuzzles');

// The seed files keep the old per-type shape; importLegacy converts them the
// same way scripts/migrateToPuzzles.js converts a live database.
const logicals = require('./logicals.json');
const nonograms = require('./nonograms.json');
const linelogs = require('./linelogs.json');
const users = require('./users.json');
const logicalRatings = require('./logicalRatings.json');
const nonogramRatings = require('./nonogramRatings.json');
const linelogRatings = require('./linelogRatings.json');
const comments = require('./comments.json');
const commentUpvotes = require('./commentsUpvotes.json');

// Seed rows without an `id` got 1, 2, 3, ... in file order in the old tables.
const withIds = rows => rows.map((row, i) => ({ ...row, id: row.id ?? i + 1 }));

function seedPassword () {
  // Letters and digits only, so it satisfies the password rule.
  return process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url').replace(/[-_]/g, 'x') + '7a';
}

async function seed () {
  await puzzles.ready;
  await sequelize.sync({ force: true });

  // Created one by one so IDs follow file order (comments and solves refer to them).
  const credentials = [];
  const createdUsers = [];
  for (const user of users) {
    const password = seedPassword();
    createdUsers.push({ ...user, id: (await User.create({ ...user, password })).id });
    credentials.push({ email: user.email, role: user.role, password });
  }

  const { idFor, report } = await importLegacy(db, {
    puzzles: { nonogram: withIds(nonograms), linelog: withIds(linelogs), logical: withIds(logicals) },
    ratings: { nonogram: nonogramRatings, linelog: linelogRatings, logical: logicalRatings },
    users: createdUsers
  });

  for (const { riddleType, riddleId, ...comment } of comments) {
    await Comment.create({ ...comment, PuzzleId: idFor(riddleType, riddleId) });
  }
  for (const upvote of commentUpvotes) {
    await CommentUpvote.create(upvote);
  }

  console.log('Seed complete:', JSON.stringify(report));
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
