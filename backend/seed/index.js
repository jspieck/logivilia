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
const { resetDatabase } = require('../migrator');
const { importLegacy } = require('../utils/legacyPuzzles');

// The seed files keep the old per-type shape; importLegacy converts them the
// same way scripts/migrateToPuzzles.js converts a live database.
const { formalize } = require('./logicalRules');
// Seed logicals with their formal rules (seed/logicalRules.js), as migration
// 20261116-01 adds them to an existing database.
// English texts (seed/logicalTranslations.en.json), as migration 20261121-04
// adds them to an existing database.
const logicalTranslations = require('./logicalTranslations.en.json');
const logicals = require('./logicals.json')
  .map(l => (formalize(l.name, l) || { data: l }).data)
  .map(l => (logicalTranslations[l.name] ? { ...l, translations: { en: logicalTranslations[l.name] } } : l));
const { backfillNames } = require('../migrations/20261121-04-logical-translations');
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
  // Drops every table, then builds the schema from migrations/.
  await resetDatabase();

  // Created one by one so IDs follow file order (comments and solves refer to them).
  const credentials = [];
  const createdUsers = [];
  for (const user of users) {
    const password = seedPassword();
    createdUsers.push({ ...user, id: (await User.create({ ...user, password, emailVerified: true })).id });
    credentials.push({ email: user.email, role: user.role, password });
  }

  const { idFor, report } = await importLegacy(db, {
    puzzles: { nonogram: withIds(nonograms), linelog: withIds(linelogs), logical: withIds(logicals) },
    ratings: { nonogram: nonogramRatings, linelog: linelogRatings, logical: logicalRatings },
    users: createdUsers
  });

  // bulkCreate skips the model hook that fills `names`.
  await backfillNames(sequelize.getQueryInterface());

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
