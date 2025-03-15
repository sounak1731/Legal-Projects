const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Simple boolean parser
const parseBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (['true', '1', 'yes'].includes(String(value).toLowerCase())) return true;
    return false;
};

// Base configuration with defaults
module.exports = {
    env: process.env.NODE_ENV || 'development',
    
    server: {
        ports: [3000, 3001, 3002, 3003, 3004],
        host: process.env.HOST || 'localhost',
        corsOrigins: (process.env.CORS_ORIGINS || '*').split(','),
    },
    
    database: {
        path: process.env.DB_PATH || path.join(__dirname, '../../data/project_zero.db'),
    },
    
    upload: {
        uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
        tempDir: process.env.TEMP_DIR || path.join(__dirname, '../../temp'),
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx').split(','),
    },
    
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key-here',
        jwtExpiry: process.env.JWT_EXPIRY || '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || path.join(__dirname, '../../logs/app.log'),
        console: parseBoolean(process.env.LOG_CONSOLE) || true,
    },
    
    features: {
        enableAI: parseBoolean(process.env.ENABLE_AI) || true,
        enableSignatures: parseBoolean(process.env.ENABLE_SIGNATURES) || true,
        enableSharing: parseBoolean(process.env.ENABLE_SHARING) || true,
        enableAnalytics: parseBoolean(process.env.ENABLE_ANALYTICS) || true,
    }
}; 