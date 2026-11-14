// Entry point (also the Plesk/Passenger startup file): builds the app,
// checks the database connection and starts listening.

const createApp = require('./backend/createApp');
const { sequelize } = require('./backend/models');

const app = createApp();
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

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
