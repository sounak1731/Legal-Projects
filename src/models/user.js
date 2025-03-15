const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Please enter a valid email address'
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'legal_analyst', 'manager', 'user'),
      defaultValue: 'user'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending'),
      defaultValue: 'pending'
    },
    department: {
      type: DataTypes.STRING
    },
    lastLogin: {
      type: DataTypes.DATE
    },
    resetToken: {
      type: DataTypes.STRING
    },
    resetTokenExpiry: {
      type: DataTypes.DATE
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['status']
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Instance method to check password
  User.prototype.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  return User;
}; 