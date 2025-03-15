const { Model, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  class AuditLog extends Model {
    static associate(models) {
      // Associate with User model if it exists
      if (models.User) {
        AuditLog.belongsTo(models.User, { 
          foreignKey: 'userId',
          as: 'user'
        });
      }
    }
  }
  
  AuditLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Foreign key to the User model, can be null for system actions or unathenticated requests'
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Description of the action performed (e.g., CREATE_DOCUMENT, DELETE_USER)'
    },
    resourceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Type of resource being acted upon (e.g., document, user, signature)'
    },
    resourceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID of the resource being acted upon'
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'HTTP method used (GET, POST, PUT, DELETE, etc.)'
    },
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'API endpoint or route accessed'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of the client (supports IPv6)'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string of the client browser/application'
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'HTTP status code of the response'
    },
    requestData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Request data/parameters (sanitized)'
    },
    responseData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Response data (sanitized, excludes sensitive information)'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional contextual information about the action'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Request processing time in milliseconds'
    }
  }, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    indexes: [
      {
        name: 'idx_audit_logs_user_id',
        fields: ['userId']
      },
      {
        name: 'idx_audit_logs_action',
        fields: ['action']
      },
      {
        name: 'idx_audit_logs_resource',
        fields: ['resourceType', 'resourceId']
      },
      {
        name: 'idx_audit_logs_created_at',
        fields: ['createdAt']
      }
    ]
  });
  
  return AuditLog;
}; 