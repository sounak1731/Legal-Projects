module.exports = (sequelize, DataTypes) => {
  const Signature = sequelize.define('Signature', {
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    signatureType: {
      type: DataTypes.ENUM('drawn', 'typed', 'uploaded', 'digital_certificate'),
      allowNull: false
    },
    signatureData: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    positionX: {
      type: DataTypes.INTEGER
    },
    positionY: {
      type: DataTypes.INTEGER
    },
    page: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    width: {
      type: DataTypes.INTEGER
    },
    height: {
      type: DataTypes.INTEGER
    },
    ipAddress: {
      type: DataTypes.STRING
    },
    userAgent: {
      type: DataTypes.STRING
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verificationMethod: {
      type: DataTypes.STRING
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
        fields: ['userId']
      }
    ]
  });

  return Signature;
}; 