module.exports = (sequelize, DataTypes) => {
  const SignatureRequest = sequelize.define('SignatureRequest', {
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
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    requestedTo: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'rejected', 'expired'),
      defaultValue: 'pending'
    },
    signingOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    message: {
      type: DataTypes.TEXT
    },
    expiresAt: {
      type: DataTypes.DATE
    },
    completedAt: {
      type: DataTypes.DATE
    },
    reminderSentAt: {
      type: DataTypes.DATE
    },
    signatureId: {
      type: DataTypes.UUID,
      references: {
        model: 'Signatures',
        key: 'id'
      }
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
        fields: ['requestedBy']
      },
      {
        fields: ['requestedTo']
      },
      {
        fields: ['status']
      }
    ]
  });

  return SignatureRequest;
}; 