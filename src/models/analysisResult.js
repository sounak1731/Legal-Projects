module.exports = (sequelize, DataTypes) => {
  const AnalysisResult = sequelize.define('AnalysisResult', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Documents',
        key: 'id'
      }
    },
    entities: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    clauses: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    risks: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    summary: {
      type: DataTypes.TEXT
    },
    analysisVersion: {
      type: DataTypes.STRING
    },
    processingTime: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    errorMessage: {
      type: DataTypes.TEXT
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['documentId']
      },
      {
        fields: ['status']
      }
    ]
  });

  return AnalysisResult;
}; 