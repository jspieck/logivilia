// Entry point (also the Plesk/Passenger startup file): builds the app,
// checks the database connection and starts listening.

const createApp = require('./backend/createApp');
const { sequelize } = require('./backend/models');

const app = createApp();
const PORT = process.env.PORT || 3000;

// Pending migrations are applied on start, because the host (Plesk) offers
// no convenient shell with the production environment. Set
// DB_MIGRATE_ON_START=false to apply them by hand (npm run migrate) instead;
// the server then refuses to start while any are pending.
async function migrateOrRefuse () {
  const { runMigrations, pendingMigrations } = require('./backend/migrator');
  if (process.env.DB_MIGRATE_ON_START === 'false') {
    const pending = await pendingMigrations();
    if (pending.length) {
      throw new Error(`Pending database migrations: ${pending.join(', ')}. Run "npm run migrate" first.`);
    }
    return;
  }
  const applied = await runMigrations();
  if (applied.length) {
    console.log(`Applied ${applied.length} database migration(s): ${applied.join(', ')}`);
  }
}

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    await migrateOrRefuse();

    return new Promise((resolve, reject) => {
      const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        console.log(`API available at http://localhost:${PORT}/api`);
        console.log(`Frontend served from http://localhost:${PORT}`);
        resolve(server);
      }).on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
