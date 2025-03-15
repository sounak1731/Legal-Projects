/**
 * Project Zero - Setup Script
 * 
 * This script handles initial setup tasks:
 * 1. Create necessary directories
 * 2. Initialize database
 * 3. Create example .env file if not exists
 * 4. Set up logging
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const REQUIRED_DIRS = [
    'data',
    'logs',
    'public/uploads',
    'public/images'
];

const ENV_TEMPLATE = `# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./data/projectzero.db

# Security
SESSION_SECRET=your-secret-key-here

# API Keys (replace with your actual keys)
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Upload Limits
MAX_FILE_SIZE=10485760 # 10MB in bytes

# Feature Flags
ENABLE_AUTO_RESTART=false
ENABLE_DETAILED_LOGGING=true`;

async function main() {
    try {
        console.log('Starting Project Zero setup...\n');

        // Create required directories
        console.log('Creating required directories...');
        for (const dir of REQUIRED_DIRS) {
            const fullPath = path.join(__dirname, '..', dir);
            await fs.mkdir(fullPath, { recursive: true });
            console.log(`✓ Created ${dir}`);
        }

        // Create .env file if it doesn't exist
        const envPath = path.join(__dirname, '..', '.env');
        try {
            await fs.access(envPath);
            console.log('\n✓ .env file already exists');
        } catch {
            await fs.writeFile(envPath, ENV_TEMPLATE);
            console.log('\n✓ Created .env file with default settings');
        }

        // Install dependencies
        console.log('\nInstalling dependencies...');
        execSync('npm install', { stdio: 'inherit' });
        console.log('✓ Dependencies installed');

        // Initialize database
        console.log('\nInitializing database...');
        require('../src/db').initializeDatabase();
        console.log('✓ Database initialized');

        // Create example documents directory
        const exampleDocsDir = path.join(__dirname, '..', 'public', 'examples');
        await fs.mkdir(exampleDocsDir, { recursive: true });
        
        // Create example document
        const exampleDoc = `# Example Legal Document

This is a sample document that demonstrates the capabilities of Project Zero.

## Agreement Terms

1. **Term**: This agreement shall commence on [DATE] and continue for a period of one year.
2. **Services**: The Provider agrees to deliver the services outlined in Exhibit A.
3. **Payment**: Client shall pay Provider according to the fee schedule in Exhibit B.

## Signatures

Provider: _________________
Date: ____________________

Client: __________________
Date: ____________________`;

        await fs.writeFile(
            path.join(exampleDocsDir, 'example-agreement.md'),
            exampleDoc
        );
        console.log('✓ Created example documents');

        console.log('\n✨ Setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Configure your .env file with your API keys and preferences');
        console.log('2. Start the development server: npm run dev');
        console.log('3. Visit http://localhost:3000 to access the application');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run setup
main(); 