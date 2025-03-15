/**
 * Project Zero Setup Script
 * This script sets up the Project Zero application by:
 * - Creating necessary directories
 * - Installing dependencies
 * - Setting up the database
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const directories = ['uploads', 'data', 'logs', 'temp'];
const dependencies = [
    'express',
    'cors',
    'compression',
    'helmet',
    'dotenv',
    'winston',
    'multer',
    'sqlite',
    'sqlite3',
    'express-rate-limit'
];

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m'
};

/**
 * Create required directories
 */
function createDirectories() {
    console.log(`${colors.blue}Creating directories...${colors.reset}`);
    
    for (const dir of directories) {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`${colors.green}✓ Created:${colors.reset} ${dir}`);
        } else {
            console.log(`${colors.yellow}✓ Already exists:${colors.reset} ${dir}`);
        }
    }
}

/**
 * Install dependencies
 */
function installDependencies() {
    console.log(`${colors.blue}Installing dependencies...${colors.reset}`);
    
    try {
        execSync(`npm install ${dependencies.join(' ')} --save`, { stdio: 'inherit' });
        console.log(`${colors.green}✓ Dependencies installed successfully${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}Error installing dependencies:${colors.reset}`, error.message);
        process.exit(1);
    }
}

/**
 * Create or update .env file
 */
function createEnvFile() {
    console.log(`${colors.blue}Setting up environment...${colors.reset}`);
    
    const envPath = path.join(__dirname, '.env');
    
    // Default environment variables
    const defaultEnv = `
# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# Database Configuration
DB_PATH=./data/project_zero.db

# Security Settings
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h
BCRYPT_ROUNDS=10
CORS_ORIGINS=*

# Upload Limits
UPLOAD_DIR=./uploads
TEMP_DIR=./temp
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
LOG_CONSOLE=true

# Feature Flags
ENABLE_AI=true
ENABLE_SIGNATURES=true
ENABLE_SHARING=true
ENABLE_ANALYTICS=true
`.trim();

    // Only create if it doesn't exist
    if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, defaultEnv);
        console.log(`${colors.green}✓ Created .env file${colors.reset}`);
    } else {
        console.log(`${colors.yellow}✓ .env file already exists (not overwritten)${colors.reset}`);
    }
}

/**
 * Main function to run setup
 */
function setup() {
    console.log(`${colors.blue}===================================${colors.reset}`);
    console.log(`${colors.blue}  Project Zero - Setup Script${colors.reset}`);
    console.log(`${colors.blue}===================================${colors.reset}\n`);
    
    createDirectories();
    console.log();
    
    createEnvFile();
    console.log();
    
    installDependencies();
    console.log();
    
    console.log(`${colors.green}Setup complete! 🚀${colors.reset}`);
    console.log(`\nTo start the application, run: ${colors.yellow}npm run dev${colors.reset}`);
    console.log(`\nAccess the application at: ${colors.yellow}http://localhost:3000${colors.reset}`);
}

// Run setup if executed directly
if (require.main === module) {
    setup();
} 