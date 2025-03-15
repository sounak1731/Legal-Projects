const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize Sequelize with database configuration
const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Define models
const User = require('./user')(sequelize, DataTypes);
const Document = require('./document')(sequelize, DataTypes);
const Signature = require('./signature')(sequelize, DataTypes);
const SignatureRequest = require('./signatureRequest')(sequelize, DataTypes);
const AnalysisResult = require('./analysisResult')(sequelize, DataTypes);
const AuditLog = require('./auditLog')(sequelize, DataTypes);

// Define associations
User.hasMany(Document, { foreignKey: 'uploadedBy', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

Document.hasMany(Signature, { foreignKey: 'documentId', as: 'signatures' });
Signature.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });
User.hasMany(Signature, { foreignKey: 'userId', as: 'signatures' });
Signature.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Document.hasMany(SignatureRequest, { foreignKey: 'documentId', as: 'signatureRequests' });
SignatureRequest.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });
User.hasMany(SignatureRequest, { foreignKey: 'requestedBy', as: 'sentRequests' });
SignatureRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
User.hasMany(SignatureRequest, { foreignKey: 'requestedTo', as: 'receivedRequests' });
SignatureRequest.belongsTo(User, { foreignKey: 'requestedTo', as: 'recipient' });

Document.hasMany(AnalysisResult, { foreignKey: 'documentId', as: 'analysisResults' });
AnalysisResult.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Document.hasMany(AuditLog, { foreignKey: 'documentId', as: 'auditLogs' });
AuditLog.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
  }
};

testConnection();

// Export models and Sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  User,
  Document,
  Signature,
  SignatureRequest,
  AnalysisResult,
  AuditLog
}; 