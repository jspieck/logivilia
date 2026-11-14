// Baseline: the schema as of 2026-11-14 (generic puzzle model).
//
// Databases from before migrations existed were built by sequelize.sync(),
// so every step here only creates what is missing. On such a database this
// migration adds the generic puzzle tables and Comments.PuzzleId and leaves
// everything else as it is; on an empty database it creates the full schema.

const { ensureTable, ensureColumn, ensureIndex } = require('./helpers');

const timestamps = Sequelize => ({
  createdAt: { type: Sequelize.DATE, allowNull: false },
  updatedAt: { type: Sequelize.DATE, allowNull: false }
});

const id = Sequelize => ({
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false }
});

// Same foreign-key behaviour sync() gave belongsTo associations.
const ref = (Sequelize, table) => ({
  type: Sequelize.INTEGER,
  allowNull: true,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'SET NULL'
});

module.exports = {
  async up (qi, Sequelize) {
    await ensureTable(qi, 'Users', {
      ...id(Sequelize),
      email: { type: Sequelize.STRING, unique: true },
      username: { type: Sequelize.STRING, unique: true },
      role: Sequelize.STRING,
      gender: Sequelize.STRING,
      bio: Sequelize.TEXT,
      birthyear: Sequelize.INTEGER,
      userImageId: Sequelize.INTEGER,
      city: Sequelize.STRING,
      joined: Sequelize.DATE,
      password: Sequelize.STRING,
      resetPasswordToken: Sequelize.STRING,
      resetPasswordExpires: Sequelize.INTEGER,
      ...timestamps(Sequelize)
    });

    await ensureTable(qi, 'Puzzles', {
      ...id(Sequelize),
      type: { type: Sequelize.STRING(20), allowNull: false },
      name: Sequelize.STRING,
      difficulty: Sequelize.INTEGER,
      data: { type: Sequelize.JSON, allowNull: false },
      date: Sequelize.DATE,
      author: Sequelize.STRING,
      legacyId: Sequelize.INTEGER,
      ...timestamps(Sequelize),
      UserId: ref(Sequelize, 'Users')
    });
    await ensureIndex(qi, 'Puzzles', ['type']);
    await ensureIndex(qi, 'Puzzles', ['type', 'legacyId'], { unique: true });

    for (const table of ['PuzzleRatings', 'PuzzleSolves']) {
      await ensureTable(qi, table, {
        ...id(Sequelize),
        ...(table === 'PuzzleRatings' ? { rating: { type: Sequelize.INTEGER, allowNull: false } } : {}),
        ...timestamps(Sequelize),
        UserId: ref(Sequelize, 'Users'),
        PuzzleId: ref(Sequelize, 'Puzzles')
      });
      await ensureIndex(qi, table, ['UserId', 'PuzzleId'], { unique: true });
      await ensureIndex(qi, table, ['PuzzleId']);
    }

    await ensureTable(qi, 'Comments', {
      ...id(Sequelize),
      // ID of the comment this one answers, -1 for a top-level comment.
      replyId: Sequelize.INTEGER,
      text: Sequelize.TEXT,
      date: Sequelize.DATE,
      ...timestamps(Sequelize),
      UserId: ref(Sequelize, 'Users'),
      PuzzleId: ref(Sequelize, 'Puzzles')
    });
    // Older databases: Comments pointed at puzzles with riddleType + riddleId.
    // No foreign key here, so the column can be added on every dialect.
    await ensureColumn(qi, 'Comments', 'PuzzleId', { type: Sequelize.INTEGER, allowNull: true });
    await ensureIndex(qi, 'Comments', ['PuzzleId']);

    await ensureTable(qi, 'CommentUpvotes', {
      ...id(Sequelize),
      ...timestamps(Sequelize),
      UserId: ref(Sequelize, 'Users'),
      CommentId: ref(Sequelize, 'Comments')
    });
  },

  async down () {
    // The baseline may have found most tables already there; dropping them
    // would destroy data this migration did not create.
    throw new Error('The baseline migration cannot be undone.');
  }
};
