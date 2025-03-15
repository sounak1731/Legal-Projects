require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const logger = require('../utils/logger');

async function createAdminUser() {
  try {
    logger.info('Checking if admin user exists...');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: { email: process.env.ADMIN_EMAIL || 'admin@legalplatform.com' }
    });
    
    if (existingAdmin) {
      logger.info('Admin user already exists, skipping creation.');
      return;
    }
    
    // Create admin user
    logger.info('Creating admin user...');
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'secureAdminPassword!23', 
      salt
    );
    
    // Create the user
    const adminUser = await User.create({
      firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
      lastName: process.env.ADMIN_LAST_NAME || 'User',
      email: process.env.ADMIN_EMAIL || 'admin@legalplatform.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active'
    });
    
    logger.info(`Admin user created with ID: ${adminUser.id}`);
    return adminUser;
  } catch (error) {
    logger.error('Error creating admin user:', error);
    throw error;
  }
}

// Run the script if it's called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      logger.info('Admin user creation script completed.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Admin user creation failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other scripts
  module.exports = createAdminUser;
} 