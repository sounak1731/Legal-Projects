const { sequelize } = require('../models');
const logger = require('./logger');

async function initializeDatabase() {
  try {
    // Test the connection
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Sync all models
    await sequelize.sync({ force: true }); // Be careful with force: true in production!
    logger.info('Database synchronized successfully.');

    return true;
  } catch (error) {
    logger.error('Unable to initialize database:', error);
    throw error;
  }
}

module.exports = initializeDatabase; 