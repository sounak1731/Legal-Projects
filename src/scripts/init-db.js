require('dotenv').config();
const { sequelize, Sequelize } = require('../db');
const logger = require('../utils/logger');

async function initDatabase() {
  try {
    logger.info('Starting database initialization...');
    
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Import models
    const User = require('../models/user')(sequelize);
    const Document = require('../models/document')(sequelize);
    const Signature = require('../models/signature')(sequelize);
    const SignatureRequest = require('../models/signatureRequest')(sequelize);
    const AuditLog = require('../models/auditLog')(sequelize);
    const AnalysisResult = require('../models/analysisResult')(sequelize);
    
    // Set up model associations
    if (typeof User.associate === 'function') {
      User.associate(sequelize.models);
    }
    
    if (typeof Document.associate === 'function') {
      Document.associate(sequelize.models);
    }
    
    if (typeof Signature.associate === 'function') {
      Signature.associate(sequelize.models);
    }
    
    if (typeof SignatureRequest.associate === 'function') {
      SignatureRequest.associate(sequelize.models);
    }
    
    if (typeof AuditLog.associate === 'function') {
      AuditLog.associate(sequelize.models);
    }
    
    if (typeof AnalysisResult.associate === 'function') {
      AnalysisResult.associate(sequelize.models);
    }
    
    // Sync all models with the database (force = true will drop tables if they exist)
    // WARNING: This will delete all existing data - only use during development
    const force = process.env.DB_FORCE_SYNC === 'true';
    
    logger.info(`Syncing database${force ? ' (with force)' : ''}...`);
    await sequelize.sync({ force });
    
    logger.info('Database initialization completed successfully.');
    return true;
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      logger.info('Database initialization script completed.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database initialization failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other scripts
  module.exports = initDatabase; 
} 