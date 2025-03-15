module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM(
        'Corporate_Compliance', 
        'Contracts', 
        'Litigation', 
        'Employment', 
        'Intellectual_Property', 
        'Regulatory',
        'Other'
      ),
      defaultValue: 'Other'
    },
    status: {
      type: DataTypes.ENUM('uploaded', 'analyzed', 'signed', 'archived'),
      defaultValue: 'uploaded'
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    description: {
      type: DataTypes.TEXT
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    uploadedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['status']
      },
      {
        fields: ['uploadedBy']
      }
    ]
  });

  return Document;
}; 