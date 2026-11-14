// The database schema comes only from the files in migrations/ (audit B4).
// Models describe the tables for queries; they never create or change them.
// sequelize.sync() is not used anywhere.
//
//   npm run migrate -w backend            apply pending migrations
//   npm run migrate -w backend -- status  list applied and pending ones
//
// The server (../app.js) also applies pending migrations when it starts,
// unless DB_MIGRATE_ON_START=false; then it refuses to start while any are
// pending. Applied migrations are recorded in the SequelizeMeta table.

const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const { Sequelize } = require('sequelize');
const { sequelize } = require('./models');

function createMigrator (logger = console) {
  return new Umzug({
    migrations: {
      // Migration files start with their date (helpers.js is not one).
      // Forward slashes: the glob library does not accept Windows separators.
      glob: path.join(__dirname, 'migrations', '2*.js').replace(/\\/g, '/'),
      resolve: ({ name, path: file, context }) => {
        const migration = require(file);
        return {
          name,
          up: () => migration.up(context, Sequelize),
          down: () => migration.down(context, Sequelize)
        };
      }
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger
  });
}

/** Applies every pending migration; returns the names applied. */
async function runMigrations ({ logger = console } = {}) {
  await require('./puzzles').ready;
  const applied = await createMigrator(logger).up();
  return applied.map(m => m.name);
}

async function pendingMigrations () {
  return (await createMigrator(undefined).pending()).map(m => m.name);
}

/** Drops every table and rebuilds the schema. Only for tests and the seed. */
async function resetDatabase () {
  await sequelize.getQueryInterface().dropAllTables();
  await runMigrations({ logger: undefined });
}

module.exports = { createMigrator, runMigrations, pendingMigrations, resetDatabase };

if (require.main === module) {
  const command = process.argv[2] || 'up';
  (async () => {
    if (command === 'status') {
      const migrator = createMigrator(undefined);
      const executed = await migrator.executed();
      const pending = await migrator.pending();
      for (const m of executed) console.log(`  applied  ${m.name}`);
      for (const m of pending) console.log(`  pending  ${m.name}`);
      if (!executed.length && !pending.length) console.log('No migrations found.');
    } else if (command === 'up') {
      const applied = await runMigrations();
      console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'Database is up to date.');
    } else {
      throw new Error(`Unknown command "${command}" (use "up" or "status").`);
    }
  })()
    .then(() => sequelize.close())
    .catch(err => {
      console.error('Migration failed:', err);
      sequelize.close().finally(() => process.exit(1));
    });
}
