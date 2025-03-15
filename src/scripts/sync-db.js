require('dotenv').config();
const { sequelize } = require('../models');
const logger = require('../utils/logger');

async function syncDatabase() {
  try {
    logger.info('Starting database synchronization...');
    
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Sync all models with the database
    const force = process.env.DB_FORCE_SYNC === 'true';
    logger.info(`Syncing database${force ? ' (with force)' : ''}...`);
    
    await sequelize.sync({ force });
    
    logger.info('Database synchronization completed successfully.');
    return true;
  } catch (error) {
    logger.error('Error synchronizing database:', error);
    throw error;
  }
}

// Run synchronization if this script is executed directly
if (require.main === module) {
  syncDatabase()
    .then(() => {
      logger.info('Database synchronization script completed.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database synchronization failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other scripts
  module.exports = syncDatabase;
} 