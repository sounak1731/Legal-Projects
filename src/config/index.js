require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'legal_platform',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret_key_dev_only',
    expiresIn: process.env.JWT_EXPIRATION || 86400, // 24 hours
  },
  
  // File upload configuration
  upload: {
    directory: process.env.UPLOAD_DIR || 'uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || 25000000), // 25MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt,rtf,jpg,jpeg,png').split(','),
  },
  
  // Email configuration
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@legalplatform.com',
  },
}; 