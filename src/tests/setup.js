// Set environment to test
process.env.NODE_ENV = 'test';

// Load environment variables
require('dotenv').config();

// Import required modules
const { sequelize } = require('../db');
const logger = require('../utils/logger');

// Silence logging during tests
logger.silent = true;

// Setup test database before tests
beforeAll(async () => {
  try {
    // Initialize test database
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
});

// Clean up after tests
afterAll(async () => {
  try {
    // Close database connection
    await sequelize.close();
  } catch (error) {
    console.error('Test database cleanup failed:', error);
    throw error;
  }
}); 