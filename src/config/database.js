const { Sequelize } = require('sequelize');
const logger = require('./logger');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: (msg) => logger.debug(msg),
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: false
  }
});

module.exports = sequelize; 