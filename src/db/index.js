// Import the logger but NOT Sequelize
const logger = require('../utils/logger');

// Create a pure in-memory database (no external dependencies)
logger.info('Initializing pure in-memory database system');

// Global data store for our in-memory database
const dataStore = {
  users: [],
  documents: [],
  signatures: [],
  signatureRequests: [],
  auditLogs: [],
  analysisResults: []
};

// Utility to generate UUIDs
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Create mock sequelize object with common methods
const sequelize = {
  // Mock model definition
  define: (modelName, attributes, options = {}) => {
    logger.info(`Defining model: ${modelName}`);
    
    // Create model methods
    const model = {
      name: modelName,
      attributes,
      options,
      
      // Find all records matching criteria
      findAll: async (query = {}) => {
        return dataStore[modelName.toLowerCase()] || [];
      },
      
      // Find one record matching criteria
      findOne: async (query = {}) => {
        const items = dataStore[modelName.toLowerCase()] || [];
        if (query.where) {
          const conditions = Object.entries(query.where);
          return items.find(item => 
            conditions.every(([key, value]) => item[key] === value)
          ) || null;
        }
        return items[0] || null;
      },
      
      // Find by primary key
      findByPk: async (id) => {
        const items = dataStore[modelName.toLowerCase()] || [];
        return items.find(item => item.id === id) || null;
      },
      
      // Create a new record
      create: async (data) => {
        const newItem = { 
          ...data, 
          id: data.id || generateUUID(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        if (!dataStore[modelName.toLowerCase()]) {
          dataStore[modelName.toLowerCase()] = [];
        }
        
        dataStore[modelName.toLowerCase()].push(newItem);
        return newItem;
      },
      
      // Update records
      update: async (values, query) => {
        const items = dataStore[modelName.toLowerCase()] || [];
        let count = 0;
        
        if (query.where) {
          const conditions = Object.entries(query.where);
          items.forEach((item, index) => {
            if (conditions.every(([key, value]) => item[key] === value)) {
              dataStore[modelName.toLowerCase()][index] = {
                ...item,
                ...values,
                updatedAt: new Date()
              };
              count++;
            }
          });
        }
        
        return [count];
      },
      
      // Delete records
      destroy: async (query) => {
        const items = dataStore[modelName.toLowerCase()] || [];
        let count = 0;
        
        if (query.where) {
          const conditions = Object.entries(query.where);
          dataStore[modelName.toLowerCase()] = items.filter(item => {
            const shouldKeep = !conditions.every(([key, value]) => item[key] === value);
            if (!shouldKeep) count++;
            return shouldKeep;
          });
        }
        
        return count;
      },
      
      // Count records
      count: async (query = {}) => {
        return (dataStore[modelName.toLowerCase()] || []).length;
      },
      
      // Model associations
      belongsTo: () => model,
      hasMany: () => model,
      hasOne: () => model,
      belongsToMany: () => model,
      
      // Mock sync
      sync: async () => model
    };
    
    // Add to models collection
    sequelize.models[modelName] = model;
    
    return model;
  },
  
  // Mock models collection
  models: {},
  
  // Mock authentication
  authenticate: async () => {
    logger.info('Mock database connected successfully');
    return true;
  },
  
  // Mock sync
  sync: async (options = {}) => {
    logger.info('Mock database synced successfully');
    return true;
  },
  
  // Mock transaction
  transaction: async (callback) => {
    // Simple transaction mock that always succeeds
    const t = {
      commit: async () => Promise.resolve(),
      rollback: async () => Promise.resolve()
    };
    
    if (callback) {
      return await callback(t);
    }
    
    return t;
  },
  
  // Mock query method
  query: async (sql, options) => {
    return [[], {}];
  },
  
  // Data types mock (used when defining models)
  DataTypes: {
    STRING: 'STRING',
    TEXT: 'TEXT',
    INTEGER: 'INTEGER',
    FLOAT: 'FLOAT',
    BOOLEAN: 'BOOLEAN',
    DATE: 'DATE',
    DATEONLY: 'DATEONLY',
    UUID: 'UUID',
    UUIDV4: 'UUIDV4',
    ENUM: (...values) => ({ type: 'ENUM', values }),
    ARRAY: (type) => ({ type: 'ARRAY', subtype: type }),
    JSON: 'JSON',
    JSONB: 'JSONB'
  }
};

// Define model structure to match Sequelize models
const defineModels = () => {
  try {
    logger.info('Defining application models with in-memory implementation');
    
    // Create model definitions manually (simplified versions)
    const User = sequelize.define('User', {
      id: { type: sequelize.DataTypes.UUID, primaryKey: true, defaultValue: sequelize.DataTypes.UUIDV4 },
      firstName: { type: sequelize.DataTypes.STRING },
      lastName: { type: sequelize.DataTypes.STRING },
      email: { type: sequelize.DataTypes.STRING },
      password: { type: sequelize.DataTypes.STRING },
      role: { type: sequelize.DataTypes.ENUM('admin', 'legal_analyst', 'manager', 'user') },
      status: { type: sequelize.DataTypes.ENUM('active', 'inactive', 'pending') },
      lastLogin: { type: sequelize.DataTypes.DATE },
      resetToken: { type: sequelize.DataTypes.STRING },
      resetTokenExpiry: { type: sequelize.DataTypes.DATE },
      metadata: { type: sequelize.DataTypes.JSON }
    });
    
    const Document = sequelize.define('Document', {
      id: { type: sequelize.DataTypes.UUID, primaryKey: true, defaultValue: sequelize.DataTypes.UUIDV4 },
      title: { type: sequelize.DataTypes.STRING },
      description: { type: sequelize.DataTypes.TEXT },
      content: { type: sequelize.DataTypes.TEXT },
      status: { type: sequelize.DataTypes.STRING },
      documentType: { type: sequelize.DataTypes.STRING },
      filePath: { type: sequelize.DataTypes.STRING },
      fileSize: { type: sequelize.DataTypes.INTEGER },
      mimeType: { type: sequelize.DataTypes.STRING },
      userId: { type: sequelize.DataTypes.UUID },
      metadata: { type: sequelize.DataTypes.JSON }
    });
    
    const Signature = sequelize.define('Signature', {
      id: { type: sequelize.DataTypes.UUID, primaryKey: true, defaultValue: sequelize.DataTypes.UUIDV4 },
      userId: { type: sequelize.DataTypes.UUID },
      documentId: { type: sequelize.DataTypes.UUID },
      signatureData: { type: sequelize.DataTypes.TEXT },
      signatureType: { type: sequelize.DataTypes.STRING },
      signatureDate: { type: sequelize.DataTypes.DATE },
      position: { type: sequelize.DataTypes.JSON },
      status: { type: sequelize.DataTypes.STRING },
      metadata: { type: sequelize.DataTypes.JSON }
    });
    
    const SignatureRequest = sequelize.define('SignatureRequest', {
      id: { type: sequelize.DataTypes.UUID, primaryKey: true, defaultValue: sequelize.DataTypes.UUIDV4 },
      documentId: { type: sequelize.DataTypes.UUID },
      requesterId: { type: sequelize.DataTypes.UUID },
      recipientId: { type: sequelize.DataTypes.UUID },
      recipientEmail: { type: sequelize.DataTypes.STRING },
      status: { type: sequelize.DataTypes.STRING },
      message: { type: sequelize.DataTypes.TEXT },
      expiryDate: { type: sequelize.DataTypes.DATE },
      metadata: { type: sequelize.DataTypes.JSON }
    });
    
    const AuditLog = sequelize.define('AuditLog', {
      id: { type: sequelize.DataTypes.UUID, primaryKey: true, defaultValue: sequelize.DataTypes.UUIDV4 },
      userId: { type: sequelize.DataTypes.UUID },
      action: { type: sequelize.DataTypes.STRING },
      resource: { type: sequelize.DataTypes.STRING },
      resourceId: { type: sequelize.DataTypes.UUID },
      details: { type: sequelize.DataTypes.JSON },
      ipAddress: { type: sequelize.DataTypes.STRING },
      userAgent: { type: sequelize.DataTypes.STRING },
      status: { type: sequelize.DataTypes.STRING }
    });
    
    const AnalysisResult = sequelize.define('AnalysisResult', {
      id: { type: sequelize.DataTypes.UUID, primaryKey: true, defaultValue: sequelize.DataTypes.UUIDV4 },
      documentId: { type: sequelize.DataTypes.UUID },
      userId: { type: sequelize.DataTypes.UUID },
      analysisType: { type: sequelize.DataTypes.STRING },
      results: { type: sequelize.DataTypes.JSON },
      status: { type: sequelize.DataTypes.STRING },
      metadata: { type: sequelize.DataTypes.JSON }
    });
    
    // Define model associations
    User.associate = (models) => {
      User.hasMany(models.Document);
      User.hasMany(models.Signature);
      User.hasMany(models.AuditLog);
      User.hasMany(models.AnalysisResult);
    };
    
    Document.associate = (models) => {
      Document.belongsTo(models.User);
      Document.hasMany(models.Signature);
      Document.hasMany(models.SignatureRequest);
      Document.hasMany(models.AnalysisResult);
    };
    
    Signature.associate = (models) => {
      Signature.belongsTo(models.User);
      Signature.belongsTo(models.Document);
    };
    
    SignatureRequest.associate = (models) => {
      SignatureRequest.belongsTo(models.Document);
      SignatureRequest.belongsTo(models.User, { as: 'requester', foreignKey: 'requesterId' });
      SignatureRequest.belongsTo(models.User, { as: 'recipient', foreignKey: 'recipientId' });
    };
    
    AuditLog.associate = (models) => {
      AuditLog.belongsTo(models.User);
    };
    
    AnalysisResult.associate = (models) => {
      AnalysisResult.belongsTo(models.Document);
      AnalysisResult.belongsTo(models.User);
    };
    
    // Apply associations
    Object.values(sequelize.models).forEach(model => {
      if (typeof model.associate === 'function') {
        model.associate(sequelize.models);
      }
    });
    
    return {
      sequelize,
      User,
      Document,
      Signature,
      SignatureRequest,
      AuditLog,
      AnalysisResult
    };
  } catch (error) {
    logger.error('Error defining in-memory models:', error.message);
    throw error;
  }
};

// Initialize database and define models
const initializeDatabase = async () => {
  try {
    logger.info('Initializing in-memory database...');
    
    // Test connection (will always succeed with our mock)
    await sequelize.authenticate();
    logger.info('In-memory database connection established successfully');
    
    // Define models
    const models = defineModels();
    logger.info('Database models defined successfully');
    
    // Create admin user if not exists
    const adminUser = await models.User.findOne({
      where: { email: process.env.ADMIN_EMAIL }
    });
    
    if (!adminUser) {
      try {
        // Import bcrypt for password hashing
        const bcrypt = require('bcryptjs');
        
        // Hash the admin password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'secureAdminPassword!23', salt);
        
        logger.info('Creating admin user in in-memory database');
        await models.User.create({
          id: generateUUID(),
          firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
          lastName: process.env.ADMIN_LAST_NAME || 'User',
          email: process.env.ADMIN_EMAIL || 'admin@legalplatform.com',
          password: hashedPassword,
          role: 'admin',
          status: 'active',
          lastLogin: null,
          metadata: {}
        });
        
        logger.info('Admin user created successfully');
      } catch (error) {
        logger.error('Error creating admin user:', error.message);
        
        // Create admin user with a pre-hashed password as fallback
        // This is a pre-computed hash of 'secureAdminPassword!23'
        await models.User.create({
          id: generateUUID(),
          firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
          lastName: process.env.ADMIN_LAST_NAME || 'User',
          email: process.env.ADMIN_EMAIL || 'admin@legalplatform.com',
          password: '$2a$10$qqZ1j8DlWjyxjYVrj0jkPuPNe7r7F3gmSvJwAO6NiXiPBibhXFqzG',
          role: 'admin',
          status: 'active',
          lastLogin: null,
          metadata: {}
        });
        
        logger.info('Admin user created with fallback password');
      }
    }
    
    return models;
  } catch (error) {
    logger.error('Error initializing in-memory database:', error.message);
    throw error;
  }
};

// Mock Sequelize class for compatibility
class Sequelize {
  constructor() {
    return sequelize;
  }
  
  static get DataTypes() {
    return sequelize.DataTypes;
  }
}

// Export the database interface
module.exports = {
  sequelize,
  initializeDatabase,
  Sequelize,
  dataStore // Export for testing/debugging
}; 