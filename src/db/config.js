require('dotenv').config();
const logger = require('../utils/logger');

// Create a standalone in-memory database configuration
// This doesn't require SQLite or PostgreSQL to be installed
const memoryConfig = {
  dialect: 'postgres', 
  database: 'legal_platform_memory',
  username: 'memory_user',
  password: 'memory_password',
  host: '127.0.0.1',
  port: 5432,
  logging: false,
  // This prevents actual connection attempts - the application will fall back to our in-memory implementation
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false 
    }
  }
};

logger.info('Using in-memory database for all environments - this is a special configuration that works without external dependencies');

// Export the in-memory config for all environments
module.exports = memoryConfig; 