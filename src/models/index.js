const sequelize = require('../config/database');
const User = require('./User');
const Document = require('./Document');
const Signature = require('./signature');
const SignatureRequest = require('./signatureRequest');
const AnalysisResult = require('./analysisResult');
const AuditLog = require('./auditLog');

const models = {
  User,
  Document,
  Signature,
  SignatureRequest,
  AnalysisResult,
  AuditLog
};

// Initialize associations
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

testConnection();

module.exports = {
  sequelize,
  ...models
}; 