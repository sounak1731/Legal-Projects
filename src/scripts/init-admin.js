/**
 * Admin User Initialization Script
 * This script creates an admin user in the database using credentials from environment variables
 */

require('dotenv').config();
const { initializeDatabase } = require('../db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

async function initAdminUser() {
  try {
    logger.info('Starting admin user initialization...');
    
    // Initialize the database and get models
    const { User } = await initializeDatabase();
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: {
        email: process.env.ADMIN_EMAIL || 'admin@legalplatform.com'
      }
    });
    
    if (existingAdmin) {
      logger.info(`Admin user already exists with email: ${existingAdmin.email}`);
      return existingAdmin;
    }
    
    // Create admin user with credentials from environment variables
    const adminPassword = process.env.ADMIN_PASSWORD || 'Legal@Admin2025';
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS || '10', 10));
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    const admin = await User.create({
      id: uuidv4(),
      firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
      lastName: process.env.ADMIN_LAST_NAME || 'User',
      email: process.env.ADMIN_EMAIL || 'admin@legalplatform.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      lastLogin: new Date(),
      metadata: {
        createdBy: 'system',
        isSystemUser: true
      }
    });
    
    logger.info(`Admin user created with email: ${admin.email}`);
    
    return admin;
  } catch (error) {
    logger.error('Error initializing admin user:', error);
    throw error;
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initAdminUser()
    .then(() => {
      logger.info('Admin user initialization completed.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Admin user initialization failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other scripts
  module.exports = { initAdminUser };
} 